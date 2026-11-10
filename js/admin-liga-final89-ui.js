/* Boulevard Pádel · P89 · Fase final de Liga en Admin.
 * Independiente del fixture regular. Lectura por RLS y escrituras SOLO por RPC.
 * No carga datos de contacto ni publica cambios por sí mismo.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const section = $("bp-league-final-panel");
  const fixture = $("bp-league-final-fixture");
  const notice = $("bp-league-final-message");
  const generate = $("bp-league-final-generate");
  const planning = window.BPLeagueFinal89;
  const scores = window.BPTournamentEngine;
  if (!section || !fixture || !notice || !generate || !planning || !scores) return;

  let tournament = null;
  let pairs = new Map();
  let regularMatches = [];
  let finalMatches = [];
  let requestId = 0;
  let busy = false;
  let active = null;

  const make = (tag, label, className = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label != null) node.textContent = String(label);
    return node;
  };
  const pairName = (id, fallback) => id ? pairs.get(id) || "Pareja" : fallback;
  const dateTime = (iso) =>
    iso ? new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Cordoba", day: "2-digit",
      month: "2-digit", year: "numeric", hour: "2-digit",
      minute: "2-digit", hourCycle: "h23"
    }).format(new Date(iso)) : "Sin programar";
  const localParts = (iso) => {
    const d = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Cordoba",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
    return { day: d.year + "-" + d.month + "-" + d.day,
      time: d.hour + ":" + d.minute };
  };
  const showMessage = (text, isError = false) => {
    notice.textContent = text;
    notice.classList.toggle("bp-league__message--error", isError);
  };
  const isFinal = (m) => m.stage === "final" || m.stage === "semifinal";
  const titleFor = (m) => m.stage === "final" ? "Final" : "Semifinal " + m.slot;
  const rivalsFor = (m) => [
    pairName(m.pair1_id, m.stage === "final" ? "Ganador semifinal 1" : "Por confirmar"),
    pairName(m.pair2_id, m.stage === "final" ? "Ganador semifinal 2" : "Por confirmar")
  ];
  const canEdit = () => tournament &&
    ["registration_closed", "in_progress"].includes(tournament.status);

  function render() {
    if (!tournament) return;
    fixture.replaceChildren();
    const finalPlayed = finalMatches.some((m) =>
      m.stage === "final" && m.match_status === "played");
    const plan = planning.planFinalPhase([...pairs.keys()], regularMatches);
    generate.hidden = finalMatches.length > 0;
    generate.disabled = busy || !canEdit() || !plan.ready ||
      finalMatches.length > 0;

    if (!plan.ready && !finalMatches.length) {
      const message = plan.reason === "ranking_tie"
        ? "Hay un empate absoluto que afecta a los cuatro primeros. Martín deberá resolverlo antes de generar las semifinales."
        : "Primero deben terminar todos los partidos de la fase regular.";
      showMessage(message);
      return;
    }
    if (!finalMatches.length) {
      showMessage("Clasificación completa: semifinal 1 (1° vs 3°), semifinal 2 (2° vs 4°). La final será entre sus ganadores.");
      return;
    }
    showMessage("Semifinales: tercer set normal. La final se puede programar antes de saber quiénes juegan.");

    for (const m of [...finalMatches].sort((a, b) =>
      (a.stage === "final" ? 2 : 1) - (b.stage === "final" ? 2 : 1) ||
      a.slot - b.slot)) {
      const card = make("article", null, "bp-league__match");
      const title = make("h5", titleFor(m), "bp-league-final__stage");
      const opponents = make("div", null, "bp-league__rivals");
      const rivals = rivalsFor(m);
      opponents.append(
        make("strong", rivals[0], "bp-league__rival"),
        make("span", "vs", "bp-league__versus"),
        make("strong", rivals[1], "bp-league__rival")
      );
      const when = m.schedule_status === "scheduled"
        ? dateTime(m.scheduled_at)
        : m.schedule_status === "postponed" ? "Partido postergado"
          : "Fecha y horario por definir";
      const state = m.match_status === "played" ? "Jugado" : "Pendiente";
      card.append(title, opponents,
        make("p", state + " · " + when, "bp-league__match-meta"));
      if (m.match_status === "played" && Array.isArray(m.sets))
        card.append(make("p", m.sets.map((s) => s.join("–")).join(" · "),
          "bp-league__score"));

      const buttons = make("div", null, "bp-league__buttons");
      const schedule = make("button",
        m.schedule_status === "scheduled" ? "Reprogramar" : "Programar",
        "torneos-outline");
      schedule.type = "button";
      schedule.disabled = busy || !canEdit() || m.match_status === "played";
      schedule.addEventListener("click", () => openSchedule(m));
      const result = make("button",
        m.match_status === "played" ? "Corregir resultado" : "Cargar resultado",
        "torneos-outline");
      result.type = "button";
      result.disabled = busy || !canEdit() || !m.pair1_id || !m.pair2_id ||
        (m.stage === "semifinal" && finalPlayed);
      result.addEventListener("click", () => openResult(m));
      buttons.append(schedule, result);
      card.append(buttons);
      fixture.append(card);
    }

    const championship = finalMatches.find((m) => m.stage === "final");
    if (tournament.status === "completed" && championship?.match_status === "played") {
      const champion = championship.winner_pair_id;
      const runnerUp = championship.pair1_id === champion
        ? championship.pair2_id : championship.pair1_id;
      fixture.append(make("p",
        "Campeón: " + pairName(champion, "Por confirmar") +
        " · Subcampeón: " + pairName(runnerUp, "Por confirmar"),
        "bp-league-final__champions"));
    }
  }

  async function load(detail) {
    const seq = ++requestId;
    tournament = detail?.tournament || null;
    pairs = new Map(detail?.pairs || []);
    regularMatches = detail?.matches || [];
    finalMatches = [];
    active = null;
    section.hidden = true;
    if (!tournament?.settings || !regularMatches.length) return;
    const report = window.BPLeagueEngine.standings([...pairs.keys()], regularMatches);
    if (!report.complete) return;
    section.hidden = false;
    showMessage("Consultando la fase final…");
    try {
      const { data, error } = await supabaseClient
        .from("bp_league_final_matches")
        .select("id,tournament_id,stage,slot,pair1_id,pair2_id,schedule_status,scheduled_at,scheduled_ends_at,court_label,match_status,sets,sets_pair1,sets_pair2,winner_pair_id")
        .eq("tournament_id", tournament.id);
      if (seq !== requestId) return;
      if (error) throw error;
      finalMatches = data || [];
      // Bloquear botones de corrección regular después de generar SF1/SF2.
      window.dispatchEvent(new CustomEvent("bp:league-final-state", {
        detail: { tournamentId: tournament.id, locked: finalMatches.length > 0 }
      }));
      render();
    } catch (err) {
      if (seq !== requestId) return;
      console.error("Liga: fase final", err);
      generate.hidden = true;
      fixture.replaceChildren();
      showMessage("La fase final todavía no está habilitada en la base de datos. No se modificaron partidos.", true);
    }
  }

  window.addEventListener("bp:league-loaded", (event) => {
    void load(event.detail);
  });
  $("torneos-pairs-tournament").addEventListener("change", () => {
    ++requestId;
    section.hidden = true;
    tournament = null;
  });
  const refresh = () => $("bp-league-refresh").click();

  // El sorteo es irreversible: confirmación explícita antes de llamar a la RPC.
  const generateDialog = $("bp-league-final-generate-dialog");
  generate.addEventListener("click", () => {
    if (busy || !canEdit()) return;
    $("bp-league-final-generate-description").textContent =
      "¿Generar las dos semifinales de «" + tournament.name + "»? Se enfrentarán 1° contra 3° y 2° contra 4°. No se alterará ningún partido regular.";
    generateDialog.showModal();
  });
  $("bp-league-final-generate-cancel").addEventListener("click", () =>
    generateDialog.close());
  $("bp-league-final-generate-confirm").addEventListener("click", async () => {
    if (busy || !canEdit()) return;
    generateDialog.close();
    busy = true;
    generate.disabled = true;
    const id = tournament.id;
    try {
      const { error } = await supabaseClient.rpc("bp_league_prepare_final89", {
        p_tournament_id: id
      });
      if (error) throw error;
      if (tournament?.id === id) refresh();
    } catch (err) {
      console.error(err);
      showMessage(err.message || "No se pudieron generar las semifinales.", true);
    } finally {
      busy = false;
      // No pisar el mensaje de error ni reactivar el botón tras una RPC
      // exitosa hasta que la recarga confirme los tres partidos.
    }
  });

  // Agenda de la fase final: RPC distinta de los 66 encuentros regulares.
  const scheduleDialog = $("bp-league-final-schedule-dialog");
  const scheduleForm = $("bp-league-final-schedule-form");
  const day = $("bp-league-final-day");
  const hour = $("bp-league-final-time");
  const duration = $("bp-league-final-duration");
  const court = $("bp-league-final-court");
  const postpone = $("bp-league-final-postpone");
  for (let h = 0; h < 24; h++)
    for (const minute of ["00", "30"]) {
      const value = String(h).padStart(2, "0") + ":" + minute;
      hour.add(new Option(value, value));
    }
  function scheduleFields() {
    for (const item of [day, hour, duration, court])
      item.disabled = postpone.checked;
    day.required = !postpone.checked;
    hour.required = !postpone.checked;
  }
  postpone.addEventListener("change", scheduleFields);
  function openSchedule(m) {
    if (!isFinal(m)) return;
    active = m;
    $("bp-league-final-schedule-title").textContent =
      (m.schedule_status === "scheduled" ? "Reprogramar " : "Programar ") +
      titleFor(m).toLowerCase();
    $("bp-league-final-schedule-rivals").textContent = rivalsFor(m).join(" vs. ");
    const local = localParts(m.scheduled_at || new Date().toISOString());
    day.value = local.day;
    hour.value = m.scheduled_at ? local.time : "19:00";
    duration.value = m.scheduled_at && m.scheduled_ends_at
      ? String(Math.round((Date.parse(m.scheduled_ends_at) -
          Date.parse(m.scheduled_at)) / 60000)) : "90";
    court.value = m.court_label || "";
    postpone.checked = false;
    scheduleFields();
    $("bp-league-final-schedule-error").textContent = "";
    scheduleDialog.showModal();
  }
  $("bp-league-final-schedule-cancel").addEventListener("click", () =>
    scheduleDialog.close());
  scheduleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !active || !canEdit()) return;
    const id = active.id;
    const errorText = $("bp-league-final-schedule-error");
    errorText.textContent = "";
    busy = true;
    $("bp-league-final-schedule-save").disabled = true;
    try {
      const start = postpone.checked ? null :
        new Date(day.value + "T" + hour.value + ":00-03:00").toISOString();
      const { error } = await supabaseClient.rpc("bp_league_final_schedule89", {
        p_match_id: id,
        p_start: start,
        p_duration_minutes: postpone.checked ? null : Number(duration.value),
        p_court_label: postpone.checked ? null : court.value.trim()
      });
      if (error) throw error;
      scheduleDialog.close();
      refresh();
    } catch (err) {
      errorText.textContent = err.message || "No se pudo guardar el horario.";
    } finally {
      busy = false;
      $("bp-league-final-schedule-save").disabled = false;
    }
  });

  // Resultado: 3er set NORMAL, no súper tie-break.
  const resultDialog = $("bp-league-final-result-dialog");
  const resultForm = $("bp-league-final-result-form");
  const setsBox = $("bp-league-final-sets");
  let inputs = [];
  function toggleThird() {
    if (inputs.length !== 3) return;
    const first = inputs.slice(0, 2);
    const complete = first.flat().every((field) => field.value !== "");
    const differentWinners = complete &&
      (Number(first[0][0].value) > Number(first[0][1].value)) !==
      (Number(first[1][0].value) > Number(first[1][1].value));
    inputs[2][0].closest(".bp-league__set").hidden = !differentWinners;
    for (const field of inputs[2]) field.required = differentWinners;
  }
  function openResult(m) {
    if (!isFinal(m) || !m.pair1_id || !m.pair2_id) return;
    active = m;
    $("bp-league-final-result-title").textContent =
      (m.match_status === "played" ? "Corregir " : "Cargar resultado · ") +
      titleFor(m).toLowerCase();
    $("bp-league-final-result-rivals").textContent = rivalsFor(m).join(" vs. ");
    $("bp-league-final-result-error").textContent = "";
    setsBox.replaceChildren();
    inputs = [];
    for (let i = 0; i < 3; i++) {
      const row = make("div", null, "bp-league__set");
      row.append(make("strong", "Set " + (i + 1)));
      const fields = [];
      for (let j = 0; j < 2; j++) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "7";
        input.step = "1";
        input.inputMode = "numeric";
        input.placeholder = "Pareja " + (j + 1);
        input.setAttribute("aria-label",
          "Set " + (i + 1) + ", pareja " + (j + 1));
        input.value = m.sets?.[i]?.[j] ?? "";
        input.required = i < 2;
        input.addEventListener("input", toggleThird);
        fields.push(input);
        row.append(input);
      }
      inputs.push(fields);
      setsBox.append(row);
    }
    toggleThird();
    resultDialog.showModal();
  }
  $("bp-league-final-result-cancel").addEventListener("click", () =>
    resultDialog.close());
  resultForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !active || !canEdit()) return;
    const errorText = $("bp-league-final-result-error");
    errorText.textContent = "";
    try {
      const first = inputs.slice(0, 2).map((r) =>
        r.map((field) => Number(field.value)));
      const split = (first[0][0] > first[0][1]) !==
        (first[1][0] > first[1][1]);
      const selected = inputs.slice(0, split ? 3 : 2).flat();
      if (selected.some((field) => field.value === ""))
        throw new Error("Completá los sets necesarios.");
      const sets = split
        ? [...first, inputs[2].map((field) => Number(field.value))]
        : first;
      scores.evaluateSets({ sets }, "three_sets");
      busy = true;
      $("bp-league-final-result-save").disabled = true;
      const { error } = await supabaseClient.rpc("bp_league_final_save_result89", {
        p_match_id: active.id, p_sets: sets
      });
      if (error) throw error;
      resultDialog.close();
      refresh();
    } catch (err) {
      errorText.textContent = err.message || "No se pudo guardar el marcador.";
    } finally {
      busy = false;
      $("bp-league-final-result-save").disabled = false;
    }
  });
})();