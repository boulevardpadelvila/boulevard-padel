/* Boulevard Pádel · Parche 68
 * Programación real y resultados de eliminatorias para 7 clasificados.
 * Todas las modificaciones pasan por RPC administrativas de Supabase.
 * La disponibilidad compartida se controla en transacciones del servidor. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const sel = $("torneos-pairs-tournament");
  const bracketPanel = $("bp-ko-panel");
  const motor = window.BPTournamentEngine;
  if (!sel || !bracketPanel || !motor) return;
  const el = (tag, value, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined && value !== null) n.textContent = String(value);
    return n;
  };
  const panel = el("section", null, "torneos-panel bp-ko68-panel");
  panel.id = "bp-ko68-panel";
  panel.hidden = true;
  panel.innerHTML =
    '<div class="bp-ko-heading"><div><small>PARTIDOS ELIMINATORIOS</small><h2>Programación y resultados</h2>' +
    "<p>Cuartos, semifinales y final. Programá sin esperar a conocer los ganadores.</p></div>" +
    '<button type="button" id="bp-ko68-refresh" class="torneos-outline">Actualizar</button></div>' +
    '<p id="bp-ko68-status" class="bp-ko-message" role="status" aria-live="polite"></p>' +
    '<div id="bp-ko68-content"></div>';
  bracketPanel.after(panel);
  const list = $("bp-ko68-content"),
    status = $("bp-ko68-status");
  const stageName = {
    quarterfinal: "Cuartos de final",
    semifinal: "Semifinales",
    final: "Final",
  };
  let model = null,
    loading = 0,
    busy = false,
    refreshTimer = null,
    pending = null;
  function notice(message, kind = "") {
    status.textContent = message;
    status.className =
      "bp-ko-message" + (kind ? " bp-ko-message--" + kind : "");
  }
  const nameOf = (id) => {
    const p = model?.pairMap.get(id);
    return p ? p.player1_name + " y " + p.player2_name : "Pareja no disponible";
  };
  function resultFor(stage, slot) {
    const m = model?.matches.find((x) => x.stage === stage && x.slot === slot);
    return m ? model.results.find((x) => x.match_id === m.id) : null;
  }
  function participants(match) {
    const br = model.bracket,
      slot = match.slot;
    const winner = (stage, i) => resultFor(stage, i)?.winner_pair_id || null;
    if (match.stage === "quarterfinal")
      return [
        br.quarterfinals[slot - 1][0],
        br.quarterfinals[slot - 1][1],
        null,
        null,
      ];
    if (match.stage === "semifinal" && Array.isArray(br.semifinals))
      return [
        br.semifinals[slot - 1][0],
        br.semifinals[slot - 1][1],
        null,
        null,
      ];
    if (match.stage === "semifinal")
      return slot === 1
        ? [
            br.direct_semifinal_pair_id,
            winner("quarterfinal", 1),
            null,
            "Ganador de Cuartos 1",
          ]
        : [
            winner("quarterfinal", 2),
            winner("quarterfinal", 3),
            "Ganador de Cuartos 2",
            "Ganador de Cuartos 3",
          ];
    return [
      winner("semifinal", 1),
      winner("semifinal", 2),
      "Ganador de Semifinal 1",
      "Ganador de Semifinal 2",
    ];
  }
  const argentinaParts = (date) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .map((x) => [x.type, x.value]),
    );
    return {
      date: parts.year + "-" + parts.month + "-" + parts.day,
      time: parts.hour + ":" + parts.minute,
    };
  };
  function dateText(date) {
    return date
      ? new Intl.DateTimeFormat("es-AR", {
          timeZone: "America/Argentina/Cordoba",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(date))
      : "Sin programar";
  }
  function formatSets(result) {
    return Array.isArray(result?.sets)
      ? result.sets.map((s) => s.join("-")).join(" · ")
      : "";
  }
  const scheduleDialog = document.createElement("dialog");
  scheduleDialog.id = "bp-ko68-schedule-dialog";
  scheduleDialog.className = "admin-save-dialog bp-ko68-dialog";
  scheduleDialog.setAttribute("aria-labelledby", "bp-ko68-schedule-title");
  scheduleDialog.innerHTML =
    '<form id="bp-ko68-schedule-form" class="admin-save-dialog__body">' +
    '<span class="admin-save-dialog__icon" aria-hidden="true">📅</span>' +
    '<h2 id="bp-ko68-schedule-title">Programar</h2>' +
    '<p id="bp-ko68-schedule-pair"></p>' +
    '<div id="bp-ko68-schedule-fields" class="bp-ko68-form-grid">' +
    '<label>Fecha <input required id="bp-ko68-day" type="date"></label>' +
    '<label>Hora de inicio <select required id="bp-ko68-time"></select></label>' +
    '<label>Duración <select id="bp-ko68-duration"><option value="90">90 minutos</option><option value="120">120 minutos</option></select></label>' +
    '</div><label class="bp-ko68-reason">Motivo de reprogramación/postergación' +
    '<textarea id="bp-ko68-schedule-reason" maxlength="500" rows="2"></textarea></label>' +
    '<p class="admin-save-dialog__hint">La disponibilidad se comprobará al guardar. Los partidos programados bloquean la cancha.</p>' +
    '<p id="bp-ko68-schedule-error" class="bp-ko68-error" role="alert"></p>' +
    '<div class="admin-save-dialog__actions"><button type="button" class="secondary" id="bp-ko68-schedule-cancel">Volver</button>' +
    '<button type="submit" class="primary" id="bp-ko68-schedule-save">Guardar horario</button></div></form>';
  document.body.append(scheduleDialog);
  // HH:mm como en la programación de grupos: 09:00 a 23:30, cada 30 minutos.
  const koTime = $("bp-ko68-time");
  for (let hour = 9; hour <= 23; hour++) {
    for (const minute of ["00", "30"]) {
      const value = `${String(hour).padStart(2, "0")}:${minute}`;
      koTime.add(new Option(value, value));
    }
  }
  const scheduleForm = $("bp-ko68-schedule-form"),
    scheduleCancel = $("bp-ko68-schedule-cancel"),
    scheduleSave = $("bp-ko68-schedule-save");
  scheduleCancel.addEventListener("click", () => {
    if (!busy) scheduleDialog.close();
  });
  function openSchedule(m, action) {
    if (busy || scheduleDialog.open || resultDialog.open) return;
    if (m.match_status !== "pending") return;
    const ps = participants(m);
    pending = { matchId: m.id, tournamentId: model.id, action };
    scheduleForm.reset();
    $("bp-ko68-schedule-title").textContent =
      action === "postpone"
        ? "Postergar partido"
        : m.schedule_status === "scheduled"
          ? "Reprogramar partido"
          : "Programar partido";
    $("bp-ko68-schedule-pair").textContent =
      (ps[0] ? nameOf(ps[0]) : ps[2]) +
      " vs. " +
      (ps[1] ? nameOf(ps[1]) : ps[3]);
    $("bp-ko68-schedule-fields").hidden = action === "postpone";
    const requireReason =
      action === "postpone" || m.schedule_status === "scheduled";
    scheduleDialog.classList.toggle(
      "bp-ko68-dialog--postpone",
      action === "postpone",
    );
    $("bp-ko68-schedule-reason").closest("label").hidden = !requireReason;
    $("bp-ko68-schedule-reason").required = requireReason;
    $("bp-ko68-schedule-reason").value =
      action === "postpone"
        ? "Postergación administrativa del partido"
        : requireReason
          ? "Reprogramación administrativa del partido"
          : "";
    const now = argentinaParts(new Date()),
      start = m.scheduled_at ? argentinaParts(new Date(m.scheduled_at)) : now;
    $("bp-ko68-day").min = now.date;
    $("bp-ko68-day").value = start.date;
    $("bp-ko68-time").value = m.scheduled_at ? start.time : "20:00";
    const minutes =
      m.scheduled_at && m.scheduled_ends_at
        ? (new Date(m.scheduled_ends_at) - new Date(m.scheduled_at)) / 60000
        : 90;
    $("bp-ko68-duration").value = [90, 120].includes(minutes)
      ? String(minutes)
      : "90";
    $("bp-ko68-schedule-error").textContent = "";
    scheduleSave.textContent =
      action === "postpone" ? "Confirmar postergación" : "Guardar horario";
    scheduleDialog.showModal();
    (action === "postpone" ? scheduleSave : $("bp-ko68-day")).focus();
  }
  scheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !pending || pending.tournamentId !== sel.value) return;
    const action = pending.action,
      reason = $("bp-ko68-schedule-reason").value.trim(),
      day = $("bp-ko68-day").value,
      time = $("bp-ko68-time").value,
      duration = Number($("bp-ko68-duration").value);
    const error = $("bp-ko68-schedule-error");
    if (action !== "postpone") {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        !/^(09|1\d|2[0-3]):(00|30)$/.test(time) ||
        ![90, 120].includes(duration) ||
        new Date(day + "T" + time + ":00-03:00").getTime() <= Date.now()
      ) {
        error.textContent =
          "Elegí una fecha futura, hora entre 09:00 y 23:30 (cada 30 minutos) y duración válida.";
        return;
      }
    }
    if (
      (action === "postpone" || $("bp-ko68-schedule-reason").required) &&
      (reason.length < 5 || reason.length > 500)
    ) {
      error.textContent = "Indicá un motivo de entre 5 y 500 caracteres.";
      return;
    }
    busy = true;
    scheduleSave.disabled = true;
    scheduleCancel.disabled = true;
    error.textContent = "Comprobando disponibilidad…";
    try {
      const { error: rpcError } = await supabaseClient.rpc(
        "bp_admin_set_knockout_match_schedule",
        {
          p_match_id: pending.matchId,
          p_action: action,
          p_day: action === "postpone" ? null : day,
          p_start_time: action === "postpone" ? null : time,
          p_duration_minutes: action === "postpone" ? null : duration,
          p_reason: reason || null,
        },
      );
      if (rpcError) throw rpcError;
      scheduleDialog.close();
      pending = null;
      await load();
      notice(
        action === "postpone"
          ? "Partido postergado. Se liberó el horario anterior."
          : "Programación confirmada. El horario quedó protegido.",
        "success",
      );
    } catch (err) {
      error.textContent = err.message || "No fue posible programar el partido.";
    } finally {
      busy = false;
      scheduleSave.disabled = false;
      scheduleCancel.disabled = false;
    }
  });

  const resultDialog = document.createElement("dialog");
  resultDialog.id = "bp-ko68-result-dialog";
  resultDialog.className = "admin-save-dialog bp-ko68-dialog";
  resultDialog.setAttribute("aria-labelledby", "bp-ko68-result-title");
  resultDialog.innerHTML =
    '<form id="bp-ko68-result-form" class="admin-save-dialog__body">' +
    '<span class="admin-save-dialog__icon" aria-hidden="true">🏆</span>' +
    '<h2 id="bp-ko68-result-title">Cargar resultado</h2>' +
    '<p id="bp-ko68-result-pair"></p>' +
    '<div id="bp-ko68-set-grid" class="bp-ko68-set-grid"></div>' +
    '<p class="admin-save-dialog__hint">En cuartos, semifinales y final, el tercer set es normal.</p>' +
    '<p id="bp-ko68-result-error" class="bp-ko68-error" role="alert"></p>' +
    '<div class="admin-save-dialog__actions"><button type="button" class="secondary" id="bp-ko68-result-cancel">Volver</button>' +
    '<button type="submit" class="primary" id="bp-ko68-result-save">Guardar resultado</button></div></form>';
  document.body.append(resultDialog);
  const resultForm = $("bp-ko68-result-form"),
    resultCancel = $("bp-ko68-result-cancel"),
    resultSave = $("bp-ko68-result-save");
  resultCancel.addEventListener("click", () => {
    if (!busy) resultDialog.close();
  });
  function openResult(m, r) {
    if (busy || resultDialog.open || scheduleDialog.open) return;
    const p = participants(m);
    if (!p[0] || !p[1]) return;
    pending = { matchId: m.id, tournamentId: model.id, existing: !!r };
    resultForm.reset();
    $("bp-ko68-result-title").textContent = r
      ? "Corregir resultado"
      : "Cargar resultado";
    $("bp-ko68-result-pair").textContent =
      nameOf(p[0]) + " vs. " + nameOf(p[1]);
    const setBox = $("bp-ko68-set-grid");
    setBox.replaceChildren();
    for (let i = 0; i < 3; i++) {
      const section = el("div", null, "bp-ko68-set-row");
      section.append(el("strong", "Set " + (i + 1)));
      for (let side = 0; side < 2; side++) {
        const input = document.createElement("input");
        input.type = "number";
        input.inputMode = "numeric";
        input.min = 0;
        input.max = 99;
        input.step = 1;
        input.name = "set" + i + "side" + side;
        input.setAttribute(
          "aria-label",
          "Set " + (i + 1) + " pareja " + (side + 1),
        );
        input.placeholder = "Pareja " + (side + 1);
        input.value = r?.sets?.[i]?.[side] ?? "";
        section.append(input);
      }
      setBox.append(section);
    }
    const fields = [...setBox.querySelectorAll("input")];
    const syncThird = () => {
      const s1 = [fields[0].value, fields[1].value],
        s2 = [fields[2].value, fields[3].value];
      const complete = [s1, s2].every(
        (s) =>
          s[0] !== "" &&
          s[1] !== "" &&
          motor.validRegularSet(Number(s[0]), Number(s[1])),
      );
      const split =
        complete &&
        Number(s1[0]) > Number(s1[1]) !== Number(s2[0]) > Number(s2[1]);
      for (const n of fields.slice(4)) {
        n.disabled = !split;
        if (complete && !split) n.value = "";
      }
    };
    fields.slice(0, 4).forEach((x) => x.addEventListener("input", syncThird));
    syncThird();
    $("bp-ko68-result-error").textContent = "";
    resultSave.textContent = r ? "Guardar corrección" : "Guardar resultado";
    resultDialog.showModal();
    fields[0].focus();
  }
  resultForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !pending || pending.tournamentId !== sel.value) return;
    const fields = [...$("bp-ko68-set-grid").querySelectorAll("input")];
    const sets = [];
    for (let i = 0; i < 3; i++) {
      const a = fields[i * 2].value.trim(),
        b = fields[i * 2 + 1].value.trim();
      if (i === 2 && a === "" && b === "") break;
      if (a === "" || b === "") {
        $("bp-ko68-result-error").textContent =
          "Completá ambos valores del set " + (i + 1);
        return;
      }
      sets.push([Number(a), Number(b)]);
    }
    try {
      motor.evaluateSets({ sets }, "three_sets");
    } catch (err) {
      $("bp-ko68-result-error").textContent = err.message;
      return;
    }
    busy = true;
    resultSave.disabled = true;
    resultCancel.disabled = true;
    $("bp-ko68-result-error").textContent = "Guardando resultado…";
    try {
      const { error } = await supabaseClient.rpc(
        "bp_admin_save_knockout_result",
        {
          p_match_id: pending.matchId,
          p_sets: sets,
          p_reason: pending.existing
            ? "Corrección de resultado desde Admin"
            : null,
        },
      );
      if (error) throw error;
      resultDialog.close();
      pending = null;
      await load();
      notice(
        "Resultado registrado. Los siguientes cruces se actualizaron automáticamente.",
        "success",
      );
    } catch (err) {
      $("bp-ko68-result-error").textContent =
        err.message || "No se pudo guardar el marcador.";
    } finally {
      busy = false;
      resultSave.disabled = false;
      resultCancel.disabled = false;
    }
  });

  function render() {
    list.replaceChildren();
    if (!model) return;
    const m = model.matches;
    for (const stage of ["quarterfinal", "semifinal", "final"]) {
      const matches = m
        .filter((x) => x.stage === stage)
        .sort((a, b) => a.slot - b.slot);
      if (!matches.length) continue;
      const group = el("section", null, "bp-ko68-stage");
      group.append(el("h3", stageName[stage]));
      const grid = el("div", null, "bp-ko68-grid");
      for (const match of matches) {
        const card = el("article", null, "bp-ko68-match");
        const result = model.results.find((r) => r.match_id === match.id);
        const p = participants(match);
        const ready = !!p[0] && !!p[1];
        card.append(el("strong", stageName[stage] + " " + match.slot));
        const rivals = el("div", null, "bp-ko68-rivals");
        rivals.append(el("span", p[0] ? nameOf(p[0]) : p[2] || "Por definir"));
        rivals.append(el("span", "VS", "bp-ko68-versus"));
        rivals.append(el("span", p[1] ? nameOf(p[1]) : p[3] || "Por definir"));
        card.append(rivals);
        card.append(
          el(
            "p",
            match.schedule_status === "scheduled"
              ? "📅 " + dateText(match.scheduled_at)
              : match.schedule_status === "postponed"
                ? "Fecha postergada"
                : "Sin programar",
            "bp-ko68-date",
          ),
        );
        if (result) {
          card.append(
            el("p", "Marcador: " + formatSets(result), "bp-ko68-result"),
          );
          card.append(
            el(
              "p",
              "Ganador: " + nameOf(result.winner_pair_id),
              "bp-ko68-winner",
            ),
          );
        }
        const actions = el("div", null, "bp-ko68-actions");
        if (match.match_status === "pending") {
          const schedule = el(
            "button",
            match.schedule_status === "scheduled" ? "Reprogramar" : "Programar",
            "torneos-outline",
          );
          schedule.type = "button";
          schedule.addEventListener("click", () =>
            openSchedule(match, "schedule"),
          );
          actions.append(schedule);
          if (match.schedule_status === "scheduled") {
            const postpone = el(
              "button",
              "Postergar",
              "torneos-outline bp-ko68-postpone",
            );
            postpone.type = "button";
            postpone.addEventListener("click", () =>
              openSchedule(match, "postpone"),
            );
            actions.append(postpone);
          }
        }
        const button = el(
          "button",
          result
            ? "Corregir resultado"
            : ready
              ? "Cargar resultado"
              : "Esperando ganadores",
          "bp-ko68-score-button",
        );
        button.type = "button";
        button.disabled = !ready;
        button.addEventListener("click", () => openResult(match, result));
        actions.append(button);
        card.append(actions);
        grid.append(card);
      }
      group.append(grid);
      list.append(group);
    }
    const finalResult = resultFor("final", 1);
    if (finalResult) {
      const champion = el("div", null, "bp-ko68-champion");
      champion.append(el("span", "🏆 CAMPEONES"));
      champion.append(el("h3", nameOf(finalResult.winner_pair_id)));
      const finalMatch = model.matches.find((x) => x.stage === "final");
      const p = participants(finalMatch);
      const runner = finalResult.winner_pair_id === p[0] ? p[1] : p[0];
      champion.append(el("p", "Subcampeones: " + nameOf(runner)));
      list.append(champion);
    }
  }
  async function load() {
    const id = sel.value,
      seq = ++loading;
    model = null;
    list.replaceChildren();
    panel.hidden = true;
    if (!id) return;
    try {
      const [br, mr, rr, pr] = await Promise.all([
        supabaseClient
          .from("bp_tournament_knockout_brackets")
          .select(
            "tournament_id,direct_semifinal_pair_id,quarterfinals,semifinals,result_revision",
          )
          .eq("tournament_id", id)
          .maybeSingle(),
        supabaseClient
          .from("bp_tournament_knockout_matches")
          .select(
            "id,tournament_id,stage,slot,match_status,schedule_status,scheduled_at,scheduled_ends_at",
          )
          .eq("tournament_id", id),
        supabaseClient
          .from("bp_tournament_knockout_results")
          .select(
            "match_id,sets,winner_pair_id,resolved_pair1_id,resolved_pair2_id",
          )
          .eq("tournament_id", id),
        supabaseClient
          .from("bp_tournament_pairs")
          .select("id,player1_name,player2_name")
          .eq("tournament_id", id),
      ]);
      if (seq !== loading || sel.value !== id) return;
      const response = [br, mr, rr, pr].find((x) => x.error);
      if (response) throw response.error;
      if (!br.data) {
        panel.hidden = true;
        return;
      }
      model = {
        id,
        bracket: br.data,
        matches: mr.data || [],
        results: rr.data || [],
        pairMap: new Map((pr.data || []).map((p) => [p.id, p])),
      };
      panel.hidden = false;
      notice(
        "Podés asignar fechas incluso a las semifinales y la final antes de conocer los ganadores.",
      );
      render();
    } catch (err) {
      if (seq !== loading) return;
      panel.hidden = false;
      notice(
        "No se pudieron cargar los partidos: " +
          (err.message || "revisá tu sesión."),
        "error",
      );
    }
  }
  function queueLoad() {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      if (!busy) load();
    }, 250);
  }
  $("bp-ko68-refresh").addEventListener("click", load);
  sel.addEventListener("change", load);
  const bracketContent = $("bp-ko-content");
  if (bracketContent)
    new MutationObserver(queueLoad).observe(bracketContent, {
      childList: true,
    });
  load();
})();
