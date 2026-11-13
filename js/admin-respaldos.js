/* Boulevard Pádel · exportación de emergencia (sólo Admin).
 * Los CSV muestran EXCLUSIVAMENTE nombre, día, hora y teléfono.
 * El PDF se guarda mediante el diálogo del navegador (Guardar como PDF).
 * No crea ni usa credenciales de Google; no envía contactos a terceros.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const TIME_ZONE = "America/Argentina/Cordoba";
  const weekdays = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const HEADERS = ["Nombre", "Día", "Hora", "Teléfono"];
  const safeString = (v) => String(v ?? "").trim();
  const html = (v) => safeString(v).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cleanCsvCell = (v) => {
    // Evitar fórmula maliciosa al abrir un CSV en Excel o Sheets.
    const value = safeString(v);
    return /^[\s]*[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
  };
  const csvCell = (v) => '"' + cleanCsvCell(v).replace(/"/g, '""') + '"';
  const toCsv = (rows) => "\ufeff" + [HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const dateTime = (iso) => {
    if (!iso) return ["", ""];
    const parts = Object.fromEntries(new Intl.DateTimeFormat("es-AR", {
      timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return [parts.day + "/" + parts.month + "/" + parts.year, parts.hour + ":" + parts.minute];
  };
  const normalizeReservations = (items) => items.map((r) => {
    const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
    const [day, hour] = dateTime(r.starts_at);
    return [r.booking_name || customer?.full_name || "", day, hour, r.booking_phone || customer?.phone || ""];
  });
  const normalizeFixed = (items) => items.map((r) => {
    const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
    return [customer?.full_name || "", weekdays[Number(r.weekday)] || "", safeString(r.start_time).slice(0, 5), customer?.phone || ""];
  });
  const nameFromPair = (p) => [p?.player1_name, p?.player2_name].filter(Boolean).join(" / ");
  const setsLabel = (sets) => Array.isArray(sets) && sets.length
    ? sets.map((s) => Array.isArray(s) && s.length === 2 ? s.join("-") : "?").join(" · ")
    : "Pendiente";
  function table(title, heads, rows) {
    if (!rows?.length) return "";
    return '<section><h2>' + html(title) + '</h2><table><thead><tr>' +
      heads.map((h) => '<th>' + html(h) + '</th>').join("") +
      '</tr></thead><tbody>' + rows.map((row) =>
        '<tr>' + row.map((v) => '<td>' + html(v) + '</td>').join("") + '</tr>'
      ).join("") + '</tbody></table></section>';
  }
  async function requireAdmin() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) throw new Error("Iniciá sesión como administrador.");
    const { data, error } = await supabaseClient.rpc("bp_tournament_is_admin");
    if (error || data !== true) throw new Error("Esta operación requiere una cuenta administradora.");
  }
  async function pages(build) {
    const result = [];
    let offset = 0;
    const page = 500;
    for (;;) {
      const { data, error } = await build().range(offset, offset + page - 1);
      if (error) throw error;
      const list = data || [];
      result.push(...list);
      if (list.length < page) break;
      offset += page;
      // Evitar una descarga parcial, sin truncar silenciosamente tablas grandes.
      if (offset > 200000) throw new Error("Demasiados registros: contactá al soporte para una copia completa.");
    }
    return result;
  }
  function downloadCsv(filename, rows) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function info(id, message, error = false) {
    const node = $(id);
    if (!node) return;
    node.textContent = message;
    node.style.color = error ? "#a13232" : "";
  }
  async function runCsv(kind) {
    const button = $(kind === "reservas" ? "bp-backup-reservations" : "bp-backup-fixed");
    const statusId = kind === "reservas" ? "bp-backup-reservations-message" : "bp-backup-fixed-message";
    if (!button || button.disabled) return;
    button.disabled = true;
    info(statusId, "Preparando el respaldo…");
    try {
      await requireAdmin();
      const list = kind === "reservas" ? await pages(() => supabaseClient
        .from("reservations")
        .select("booking_name,booking_phone,starts_at,customers(full_name,phone)")
        .eq("status", "confirmed")
        .order("starts_at", { ascending: true })) : await pages(() => supabaseClient
        .from("fixed_turn_requests")
        .select("weekday,start_time,customers(full_name,phone)")
        .eq("status", "approved")
        .order("weekday", { ascending: true }));
      const rows = kind === "reservas" ? normalizeReservations(list) : normalizeFixed(list);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE,
        year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      downloadCsv("boulevard-padel-" + kind + "-" + today + ".csv", rows);
      info(statusId, "CSV generado: " + rows.length + " registros. Guardalo en el Drive de BP.");
    } catch (err) {
      console.error("No se pudo generar el respaldo administrativo", err);
      info(statusId, "No se generó un respaldo completo. Verificá tu acceso e intentá nuevamente.", true);
    } finally {
      button.disabled = false;
    }
  }
  async function tournamentData(t) {
    const id = t.id;
    const [pairs, groups, groupMembers, groupMatches, groupResults, bracket, leagueMatches, leagueFinals] = await Promise.all([
      pages(() => supabaseClient.from("bp_tournament_pairs")
        .select("id,player1_name,player2_name,status").eq("tournament_id", id).order("created_at")),
      pages(() => supabaseClient.from("bp_tournament_groups")
        .select("id,group_number").eq("tournament_id", id).order("group_number")),
      pages(() => supabaseClient.from("bp_tournament_group_pairs")
        .select("group_id,pair_id").eq("tournament_id", id).order("created_at")),
      pages(() => supabaseClient.from("bp_tournament_group_matches")
        .select("id,group_id,round_number,match_number,pair1_id,pair2_id,match_status")
        .eq("tournament_id", id).order("round_number")),
      pages(() => supabaseClient.from("bp_tournament_match_results")
        .select("match_id,resolved_pair1_id,resolved_pair2_id,sets,winner_pair_id")
        .eq("tournament_id", id)),
      t.format === "groups_knockout" ? supabaseClient.rpc("bp_tournament_bracket_report2026", { p_tournament_id: id })
        .then(({data,error}) => { if(error) throw error; return data; }) : null,
      t.format === "league" ? pages(() => supabaseClient.from("bp_league_matches")
        .select("round_number,match_number,pair1_id,pair2_id,match_status,sets")
        .eq("tournament_id", id).order("round_number")) : [],
      t.format === "league" ? pages(() => supabaseClient.from("bp_league_final_matches")
        .select("stage,slot,pair1_id,pair2_id,match_status,sets,winner_pair_id")
        .eq("tournament_id", id).order("stage")) : []
    ]);
    return {pairs,groups,groupMembers,groupMatches,groupResults,bracket,leagueMatches,leagueFinals};
  }
  function tournamentHtml(t, d) {
    const people = new Map(d.pairs.map((p) => [p.id, nameFromPair(p)]));
    const pair = (id) => people.get(id) || "Por definir";
    const groupNames = new Map(d.groups.map((g) => [g.id, "Grupo " + String.fromCharCode(64 + g.group_number)]));
    const results = new Map(d.groupResults.map((r) => [r.match_id, r]));
    const groups = d.groups.flatMap((g) => {
      const members = d.groupMembers.filter((x) => x.group_id === g.id);
      return members.map((x) => [groupNames.get(g.id), pair(x.pair_id)]);
    });
    const groupMatches = d.groupMatches.map((m) => {
      const r = results.get(m.id);
      return [groupNames.get(m.group_id) || "", m.round_number + "-" + m.match_number,
        pair(r?.resolved_pair1_id || m.pair1_id), pair(r?.resolved_pair2_id || m.pair2_id), setsLabel(r?.sets)];
    });
    const KO = d.bracket?.matches || [];
    const maxStage = KO.reduce((n,m) => Math.max(n,Number(m.stage)),0);
    const eliminations = KO.map((m) => [
      Number(m.stage) === 0 ? "Previa" : Number(m.stage) === maxStage ? "Final" : "Ronda " + m.stage,
      m.slot, m.pair1_name || pair(m.pair1_id), m.pair2_name || pair(m.pair2_id), setsLabel(m.sets)
    ]);
    const league = d.leagueMatches.map((m) => [
      "Fecha " + m.round_number, m.match_number, pair(m.pair1_id), pair(m.pair2_id), setsLabel(m.sets)
    ]);
    const finals = d.leagueFinals.map((m) => [
      m.stage === "final" ? "Final" : "Semifinal", m.slot,
      pair(m.pair1_id), pair(m.pair2_id), setsLabel(m.sets)
    ]);
    let final = KO.find((m) => Number(m.stage) === maxStage && Number(m.stage) > 0 && m.status === "played");
    if (!final) final = d.leagueFinals.find((m) => m.stage === "final" && m.match_status === "played");
    const champion = final ? pair(final.winner_pair_id) : null;
    const runner = final ? pair([final.pair1_id, final.pair2_id].find((id) => id !== final.winner_pair_id)) : null;
    const podium = final && champion !== "Por definir"
      ? '<section class="podium"><h2>Resultado final</h2><p><strong>Campeones:</strong> ' + html(champion) +
        '</p><p><strong>Subcampeones:</strong> ' + html(runner) + '</p></section>' : "";
    const status = t.status === "completed" ? "Finalizado" : "En curso — datos provisionales";
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + html(t.name) +
      ' — Boulevard Pádel</title><style>' +
      '@page{size:A4;margin:15mm}body{font:12px/1.45 Arial,sans-serif;color:#173329;max-width:920px;margin:20px auto}' +
      'header{border-bottom:3px solid #c49b42;padding-bottom:12px;margin-bottom:22px}' +
      'h1{font-size:25px;margin:4px 0}h2{font-size:17px;margin:22px 0 8px}small{color:#52675e}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #d5ded8;padding:7px;text-align:left}' +
      'th{background:#e9f0eb}tr:nth-child(even){background:#f8faf9}section{break-inside:avoid;page-break-inside:avoid}' +
      '.podium{border:2px solid #c49b42;border-radius:8px;padding:12px}footer{border-top:1px solid #ddd;padding-top:8px;font-size:10px;color:#697b72;margin-top:26px}' +
      '@media print{body{margin:0}button{display:none}}' +
      '</style></head><body><header><small>BOULEVARD PÁDEL · ARCHIVO DE TORNEO</small>' +
      '<h1>' + html(t.name) + '</h1><p>' + html(status) + ' · ' +
      html(t.format === "league" ? "Liga" : "Grupos y eliminatorias") +
      ' · ' + html(t.starts_on || "") + '</p></header>' +
      podium +
      table("Parejas participantes", ["Pareja"], d.pairs.filter((p)=>p.status === "approved").map((p)=>[nameFromPair(p)])) +
      table("Composición de grupos", ["Grupo","Pareja"], groups) +
      table("Resultados de grupos", ["Grupo","Partido","Pareja 1","Pareja 2","Sets"], groupMatches) +
      table("Eliminatorias", ["Ronda","Cruce","Pareja 1","Pareja 2","Sets"], eliminations) +
      table("Fase regular de Liga", ["Fecha","Partido","Pareja 1","Pareja 2","Sets"], league) +
      table("Fase final de Liga", ["Etapa","Cruce","Pareja 1","Pareja 2","Sets"], finals) +
      '<footer>Archivo de consulta generado desde el Admin de Boulevard Pádel el ' +
      html(dateTime(new Date().toISOString())[0]) +
      '. Elegí «Guardar como PDF» y subilo al Drive de Boulevard Pádel. No contiene teléfonos.</footer>' +
      '</body></html>';
  }
  async function exportTournament(t) {
    // Abrir la pestaña inmediatamente para no ser bloqueado por el navegador.
    const popup = window.open("", "_blank");
    if (!popup) {
      info("torneo-feedback", "Habilitá las ventanas emergentes para generar el PDF.", true);
      return;
    }
    popup.opener = null;
    popup.document.body.textContent = "Preparando PDF del torneo…";
    try {
      await requireAdmin();
      const data = await tournamentData(t);
      if (popup.closed) return;
      popup.document.open();
      popup.document.write(tournamentHtml(t,data));
      popup.document.close();
      popup.focus();
      setTimeout(() => { if(!popup.closed) popup.print(); }, 350);
    } catch (err) {
      console.error("No se pudo generar el PDF del torneo", err);
      if (!popup.closed) popup.document.body.textContent =
        "No se pudo cargar la información completa del torneo. Cerrá esta pestaña e intentá nuevamente.";
      info("torneo-feedback", "No se pudo generar el PDF completo del torneo.", true);
    }
  }
  function init() {
    const r = $("bp-backup-reservations"), f = $("bp-backup-fixed");
    if (r) r.addEventListener("click", () => runCsv("reservas"));
    if (f) f.addEventListener("click", () => runCsv("fijos"));
  }
  const api = { exportTournament, normalizeReservations, normalizeFixed, toCsv, dateTime, html, setsLabel };
  if (typeof window !== "undefined") {
    window.BPAdminBackup = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
    else init();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
