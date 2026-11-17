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
  let exportReturnFocus = null;
  function showCsvDialog({ title, description, hint, error = false }, button) {
    const dialog = $("bp-backup-dialog");
    if (!dialog || typeof dialog.showModal !== "function") return;
    $("bp-backup-dialog-title").textContent = title;
    $("bp-backup-dialog-description").textContent = description;
    $("bp-backup-dialog-hint").textContent = hint;
    $("bp-backup-dialog-icon").textContent = error ? "!" : "✓";
    dialog.dataset.result = error ? "error" : "success";
    exportReturnFocus = button;
    dialog.showModal();
    $("bp-backup-dialog-close").focus();
  }
  async function runCsv(kind) {
    const button = $(kind === "reservas" ? "bp-backup-reservations" : "bp-backup-fixed");
    if (!button || button.disabled) return;
    button.disabled = true;
    let result;
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
      const [dd, mm, yyyy] = dateTime(new Date().toISOString())[0].split("/");
      const today = yyyy + "-" + mm + "-" + dd;
      downloadCsv("boulevard-padel-" + kind + "-" + today + ".csv", rows);
      result = {
        title: "CSV generado",
        description: `Se preparó la descarga de ${rows.length} ${rows.length === 1 ? "registro" : "registros"} de ${kind === "reservas" ? "reservas" : "turnos fijos"}.`,
        hint: "El archivo se descargó a tu computadora. Podés guardarlo como copia adicional en el Drive de BP.",
      };
    } catch (err) {
      console.error("No se pudo generar el respaldo administrativo", err);
      result = {
        title: "No se pudo exportar",
        description: "No se generó un respaldo completo. Verificá tu acceso e intentá nuevamente.",
        hint: "No se descargó ningún archivo de esta operación.",
        error: true,
      };
    } finally {
      // El botón conserva su lugar y queda habilitado otra vez, incluso si falló.
      button.disabled = false;
    }
    showCsvDialog(result, button);
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

  // Presentación imprimible: datos reales del Admin + símbolos del cuadro 2026.
  // Las claves de ronda y partido se mantienen sin modificación.
  function tournamentHtml(t,d){
    const people=new Map((d.pairs||[]).map(p=>[p.id,nameFromPair(p)]));
    const pair=id=>people.get(id)||"Por definir";
    const approved=(d.pairs||[]).filter(p=>p.status==="approved");
    const resultById=new Map((d.groupResults||[]).map(r=>[r.match_id,r]));
    const groupLabels=new Map((d.groups||[]).map(g=>[g.id,"Grupo "+String.fromCharCode(64+g.group_number)]));
    const groupCards=(d.groups||[]).slice().sort((a,b)=>a.group_number-b.group_number).map(g=>{
      const members=(d.groupMembers||[]).filter(p=>p.group_id===g.id);
      return '<article class="group"><h3>'+html(groupLabels.get(g.id))+'</h3><ol>'+
        members.map(p=>'<li>'+html(pair(p.pair_id))+'</li>').join("")+'</ol></article>';
    }).join("");
    const groupFixtures=(d.groupMatches||[]).map(m=>{
      const r=resultById.get(m.id);
      const a=pair(r?.resolved_pair1_id||m.pair1_id);
      const b=pair(r?.resolved_pair2_id||m.pair2_id);
      return '<article class="match"><header><b>'+html(groupLabels.get(m.group_id)||"Grupo")+
        '</b><span>Partido '+html(m.round_number+"-"+m.match_number)+'</span></header>'+
        '<strong>'+html(a)+'</strong><i>VS</i><strong>'+html(b)+'</strong>'+
        '<footer>'+html(setsLabel(r?.sets))+'</footer></article>';
    }).join("");
    const live=(d.bracket?.matches||[]);
    const liveMap=new Map(live.map(m=>[Number(m.stage)+":"+Number(m.slot),m]));
    const motor=typeof window!=="undefined"?window.BPReglamento2026:globalThis.BPReglamento2026;
    let plan=d.bracket?.plan||null;
    // La llave debe existir incluso antes de cargar marcadores o posiciones.
    if(!plan&&t.format==="groups_knockout"&&approved.length>=6&&approved.length<=40&&motor){
      try{plan=motor.bracket(approved.length);}catch(_){}
    }
    const base=Number(plan?.base)||Math.pow(2,Math.floor(Math.log2(Number(plan?.qualified)||4)));
    const code=(stage,slot)=>{
      if(motor?.matchCode)return motor.matchCode(base,stage,slot);
      const count=stage===0?0:base/Math.pow(2,stage);
      return (stage===0?"P":({16:"D",8:"O",4:"C",2:"S",1:"F"})[count]||"R")+slot;
    };
    const source=x=>{
      if(!x)return "Por definir";
      if(/^P[1-9][0-9]*$/.test(x))return "Ganador "+x;
      const m=/^W:([0-9]+):([0-9]+)$/.exec(x);
      return m?"Ganador "+code(Number(m[1]),Number(m[2])):x;
    };
    let rounds=[];
    if(t.format==="groups_knockout"&&plan?.firstRoundMatches){
      if(plan.preliminariesMatches?.length)rounds.push({stage:0,name:"Ronda previa",
        matches:plan.preliminariesMatches.map((s,i)=>({slot:i+1,a:s[0],b:s[1]}))});
      let items=plan.firstRoundMatches.map((s,i)=>({slot:i+1,a:s[0],b:s[1]}));
      for(let stage=1;items.length;stage++){
        const name=({16:"Dieciseisavos",8:"Octavos",4:"Cuartos",2:"Semifinales",1:"Final"})[items.length]||"Eliminatorias";
        rounds.push({stage,name,matches:items});
        if(items.length===1)break;
        items=Array.from({length:items.length/2},(_,i)=>({slot:i+1,
          a:"W:"+stage+":"+(i*2+1),b:"W:"+stage+":"+(i*2+2)}));
      }
    }else if(live.length){
      const stages=[...new Set(live.map(x=>Number(x.stage)))].sort((a,b)=>a-b);
      rounds=stages.map(stage=>({stage,name:stage===0?"Ronda previa":stage===stages.at(-1)?"Final":"Eliminatorias",
        matches:live.filter(x=>Number(x.stage)===stage).map(x=>({slot:x.slot,a:x.source1,b:x.source2}))}));
    }
    const roundHtml=rounds.map(round=>'<div class="round"><h3>'+html(round.name)+'</h3><div class="round-body">'+
      round.matches.map(m=>{
        const r=liveMap.get(round.stage+":"+m.slot);
        const a=r?.pair1_name||people.get(r?.pair1_id)||source(m.a);
        const b=r?.pair2_name||people.get(r?.pair2_id)||source(m.b);
        const played=r?.status==="played"||r?.match_status==="played";
        const time=r?.scheduled_at?dateTime(r.scheduled_at).join(" · "):"";
        return '<div class="fixture-card"><div class="fixture-label"><b>'+html(code(round.stage,Number(m.slot)))+
          '</b><small>'+html(played?"Finalizado":time||"Pendiente")+'</small></div>'+
          '<div class="team">'+html(a)+'</div><div class="vs">VS</div><div class="team">'+html(b)+'</div>'+
          (played?'<div class="score">'+html(setsLabel(r.sets))+'</div>':"")+'</div>';
      }).join("")+'</div></div>').join("");
    const maxStage=Math.max(0,...live.map(x=>Number(x.stage)));
    let final=live.find(x=>Number(x.stage)===maxStage&&maxStage>0&&(x.status==="played"||x.match_status==="played"));
    if(!final)final=(d.leagueFinals||[]).find(x=>x.stage==="final"&&x.match_status==="played");
    const champion=final?pair(final.winner_pair_id):"Por definir";
    const runner=final?pair([final.pair1_id,final.pair2_id].find(x=>x!==final.winner_pair_id)):"Por definir";
    const podium=final&&champion!=="Por definir"&&runner!=="Por definir"?
      '<div class="podium"><div><span>CAMPEONES</span><strong>'+html(champion)+'</strong></div>'+
      '<div><span>SUBCAMPEONES</span><strong>'+html(runner)+'</strong></div></div>':"";
    const league=(d.leagueMatches||[]).map(m=>["Fecha "+m.round_number,m.match_number,pair(m.pair1_id),pair(m.pair2_id),setsLabel(m.sets)]);
    const leagueFinal=(d.leagueFinals||[]).map(m=>[m.stage==="final"?"Final":"Semifinal",m.slot,
      pair(m.pair1_id),pair(m.pair2_id),setsLabel(m.sets)]);
    const styles=[
      '@page{size:A4 landscape;margin:9mm}',
      '*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}',
      'body{margin:0;font:12px/1.4 Arial,sans-serif;color:#163b2b;background:white}',
      'main{max-width:1300px;margin:auto}',
      '.hero{background:#06432d;color:white;border-bottom:5px solid #cba45e;padding:23px;border-radius:9px}',
      '.hero h1{font-size:28px;margin:7px 0}.hero small{letter-spacing:1.5px}.hero p{margin:0}',
      'h2{font-size:20px;margin:20px 0 12px}h3{margin:0}',
      '.intro,.groups-results,.elimination{break-inside:auto}',
      '.groups-results,.elimination{break-before:page}',
      '.players{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}',
      '.player{border:1px solid #cadbce;border-radius:6px;padding:8px;break-inside:avoid;overflow-wrap:anywhere}',
      '.player b{color:#aa8744;margin-right:8px}',
      '.groups{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
      '.group{border:1px solid #c2d5c9;border-radius:8px;overflow:hidden;break-inside:avoid}',
      '.group h3{background:#0b5138;color:white;padding:10px;font-size:13px}',
      '.group ol{padding:7px 12px 9px 30px;margin:0}.group li{padding:3px;overflow-wrap:anywhere}',
      '.matches{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}',
      '.match{border:1px solid #c5d7cb;border-radius:8px;text-align:center;overflow:hidden;break-inside:avoid}',
      '.match header{display:flex;justify-content:space-between;background:#0b5138;color:white;padding:7px;font-size:11px}',
      '.match strong{display:block;padding:6px;overflow-wrap:anywhere}.match i{font-size:10px;color:#a78c55;font-style:normal}',
      '.match footer{padding:5px;background:#e4f1e9;font-weight:bold}',
      '.bracket{display:flex;gap:7px;align-items:stretch}',
      '.round{flex:1;min-width:0;display:flex;flex-direction:column}',
      '.round h3{background:#06432d;color:#fff;border-bottom:3px solid #cba45e;border-radius:7px;padding:10px 3px;text-align:center;font-size:11px}',
      '.round-body{display:flex;flex:1;flex-direction:column;justify-content:space-around;gap:8px;padding:10px 0}',
      '.fixture-card{border:1px solid #c2d5c9;border-radius:8px;background:#f5faf6;text-align:center;break-inside:avoid;overflow:hidden}',
      '.fixture-label{background:#dceee2;padding:6px;display:flex;align-items:center;justify-content:space-between;gap:3px}',
      '.fixture-label b{background:#12533b;color:white;padding:4px 7px;border-radius:5px;font-size:11px}',
      '.fixture-label small{font-size:8px;color:#37674d;overflow-wrap:anywhere}',
      '.team{font-size:10px;font-weight:bold;padding:7px 4px;overflow-wrap:anywhere}',
      '.vs{background:#fff;color:#a18249;font-size:9px;font-weight:800}',
      '.score{background:#e9f4e8;padding:5px;color:#145c39;font-weight:bold}',
      '.podium{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}',
      '.podium div{background:#fff4d9;border:2px solid #cba45e;padding:12px;border-radius:9px}',
      '.podium div+div{background:#eff2f5;border-color:#aab5c0}',
      '.podium span{display:block;font-size:10px}.podium strong{display:block;font-size:15px}',
      'table{width:100%;border-collapse:collapse}td,th{border:1px solid #d6e2da;padding:6px}th{background:#e9f2ec}',
      '.note{font-size:10px;color:#647d6b;padding:7px 0}',
      '.foot{font-size:10px;color:#5d7065;border-top:1px solid #d5e0d8;margin-top:25px;padding-top:10px}',
      '@media print{.round h3{font-size:10px}.elimination .bracket{zoom:.80} .elimination.large .bracket{zoom:.60}}'
    ].join("");
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>'+html(t.name)+
      ' — Boulevard Pádel</title><style>'+styles+'</style></head><body><main>'+
      '<section class="intro"><header class="hero"><small>BOULEVARD PÁDEL · TORNEO OFICIAL</small>'+
      '<h1>'+html(t.name)+'</h1><p>'+html(t.status==="completed"?"Finalizado":"En curso · datos provisionales")+
      ' · '+html(t.format==="league"?"Liga":"Grupos + eliminatorias")+' · '+html(t.starts_on||"")+'</p></header>'+
      podium+'<h2>Parejas participantes</h2><div class="players">'+approved.map((p,i)=>
        '<div class="player"><b>'+String(i+1).padStart(2,"0")+'</b>'+html(nameFromPair(p))+'</div>').join("")+
      '</div>'+(groupCards?'<h2>Grupos</h2><div class="groups">'+groupCards+'</div>':"")+'</section>'+
      (groupFixtures?'<section class="groups-results"><h2>Programación y resultados de grupos</h2><div class="matches">'+groupFixtures+'</div></section>':"")+
      (t.format==="groups_knockout"?'<section class="elimination '+(rounds[0]?.matches.length>=9?"large":"")+
        '"><h2>Cuadro de eliminatorias</h2>'+
        (roundHtml?'<div class="bracket">'+roundHtml+'</div>':
          '<p>El cuadro estará disponible cuando se conozca el fixture de grupos.</p>')+
        '<p class="note">Las referencias a grupos y ganadores se completan automáticamente con los resultados oficiales.</p></section>':"")+
      table("Fase regular de Liga",["Fecha","Partido","Pareja 1","Pareja 2","Sets"],league)+
      table("Fase final de Liga",["Etapa","Partido","Pareja 1","Pareja 2","Sets"],leagueFinal)+
      '<footer class="foot">Generado desde el Admin de Boulevard Pádel el '+html(dateTime(new Date().toISOString())[0])+
      '. Elegí «Guardar como PDF» y conservá una copia en Drive. Sin datos de contacto.</footer></main></body></html>';
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
    const dialog = $("bp-backup-dialog");
    if (r) r.addEventListener("click", () => runCsv("reservas"));
    if (f) f.addEventListener("click", () => runCsv("fijos"));
    if (dialog) {
      $("bp-backup-dialog-close")?.addEventListener("click", () => dialog.close());
      dialog.addEventListener("close", () => {
        if (exportReturnFocus?.isConnected) exportReturnFocus.focus();
        exportReturnFocus = null;
      });
    }
  }
  const api = { exportTournament, normalizeReservations, normalizeFixed, tournamentHtml, toCsv, dateTime, html, setsLabel };
  if (typeof window !== "undefined") {
    window.BPAdminBackup = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
    else init();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
