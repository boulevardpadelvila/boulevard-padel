/* Boulevard Pádel · Parche 82 · Liga dentro del panel Torneos.
   Utiliza RPC administrativas; nunca modifica partidos mediante SQL cliente.
   Motor 2-1-0, dos sets + súper tie-break. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const select = $("torneos-pairs-tournament");
  const panel = $("bp-league-panel");
  const engine = window.BPLeagueEngine;
  if (!select || !panel || !engine) return;
  const groupsPanel = $("torneos-groups-panel");
  const fixtureTitle = $("torneos-fixture-title");
  const sharedSection = fixtureTitle.closest(".torneos-panel");
  const legacySteps = sharedSection.querySelector(".torneos-stage");
  const legacyHint = sharedSection.querySelector(".torneos-hint");
  const msg = $("bp-league-message"),
    fixture = $("bp-league-fixture"),
    table = $("bp-league-standings"),
    generate = $("bp-league-generate");
  let current = null,
    matchList = [],
    pairs = new Map(),
    generation = 0,
    busy = false,
    regularLocked = false,
    active = null;

  const el = (tag, value, cls = "") => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const status = (text, error = false) => {
    msg.textContent = text;
    msg.classList.toggle("bp-league__message--error", error);
  };
  const name = (id) => pairs.get(id) || "Pareja no disponible";
  const fmt = (iso) =>
    iso
      ? new Intl.DateTimeFormat("es-AR", {
          timeZone: "America/Argentina/Cordoba",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(iso))
      : "Sin programar";
  function localParts(iso) {
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
        .formatToParts(new Date(iso))
        .map((x) => [x.type, x.value]),
    );
    return {
      day: parts.year + "-" + parts.month + "-" + parts.day,
      time: parts.hour + ":" + parts.minute,
    };
  }
  function updateVisible(league) {
    $("admin-torneos-view").classList.toggle("bp-league-active", league);
    panel.hidden = !league;
    groupsPanel.hidden = league;
    if (legacySteps) legacySteps.hidden = league;
    if (legacyHint) legacyHint.hidden = league;
    fixtureTitle.textContent = league
      ? "Liga · Fechas y posiciones"
      : "Grupos y fixture";
  }
  function rank() {
    const report = engine.standings([...pairs.keys()], matchList, Number(current?.rules_version) === 2026 ? "three_sets" : "super_tb");
    const heading = el(
      "h4",
      "Tabla general · " + report.played + " de " + report.total + " partidos",
    );
    const scroll = el("div", null, "bp-league__table-scroll");
    const grid = document.createElement("table");
    grid.className = "bp-league__table";
    const head = document.createElement("thead"),
      tr = document.createElement("tr");
    for (const column of [
      "Pos.",
      "Pareja",
      "PJ",
      "PG",
      "PP",
      "SF",
      "SC",
      "Dif.",
      "GF",
      "GC",
      "Dif.G",
      "Pts",
    ])
      tr.append(el("th", column));
    head.append(tr);
    grid.append(head);
    const body = document.createElement("tbody");
    report.rows.forEach((p, i) => {
      const row = document.createElement("tr");
      [
        i + 1,
        name(p.pairId),
        p.played,
        p.won,
        p.lost,
        p.setsFor,
        p.setsAgainst,
        p.setDifference,
        p.gamesFor,
        p.gamesAgainst,
        p.gameDifference,
        p.points,
      ].forEach((val) => row.append(el("td", val)));
      body.append(row);
    });
    grid.append(body);
    scroll.append(grid);
    const referencias = el("div", null, "bp-league__legend");
    const columnas = el("div", null, "bp-league__legend__grid");

    for (const [sigla, significado] of window.BPTournamentEngine
      .standingsLegendItems) {
      const item = el("div", null, "bp-league__legend__item");

      item.append(
        el("strong", `${sigla}:`, "bp-league__legend__key"),
        el("span", significado, "bp-league__legend__value"),
      );

      columnas.append(item);
    }

    referencias.append(
      columnas,
      el(
        "p",
        window.BPTournamentEngine.standingsLegendNote,
        "bp-league__legend__note",
      ),
    );

    table.replaceChildren(heading, scroll, referencias);
    if (report.complete) {
      // P89: 1° de la fase regular no equivale a campeón de la Liga.
      table.append(el("p",
        "Tabla definitiva de fase regular. Campeón y subcampeón se deciden en la final.",
        "bp-league__note"));
    } else
      table.append(
        el(
          "p",
          "Tabla provisoria. Se actualiza automáticamente al guardar cada resultado.",
          "bp-league__note",
        ),
      );
  }
  function renderMatches() {
    fixture.replaceChildren();
    const byRound = new Map();
    for (const match of matchList) {
      if (!byRound.has(match.round_number)) byRound.set(match.round_number, []);
      byRound.get(match.round_number).push(match);
    }
    for (const [round, values] of [...byRound].sort((a, b) =>
      a[0] === null ? 1 : b[0] === null ? -1 : a[0] - b[0],
    )) {
      const section = el("section", null, "bp-league__round");
      section.append(
        el(
          "h4",
          (round === null ? "Partidos sin Fecha" : "Fecha " + round) +
            " · " +
            values.length +
            " partidos",
        ),
      );
      const grid = el("div", null, "bp-league__matches");
      values.sort((a, b) => a.match_number - b.match_number);
      for (const m of values) {
        const card = el("article", null, "bp-league__match");
        const rivals = el("div", null, "bp-league__rivals");
        rivals.append(
          el("strong", name(m.pair1_id), "bp-league__rival"),
          el("span", "vs", "bp-league__versus"),
          el("strong", name(m.pair2_id), "bp-league__rival"),
        );
        card.append(rivals);
        const statusLabel =
          m.match_status === "played"
            ? "Jugado"
            : m.schedule_status === "scheduled"
              ? "Programado"
              : m.schedule_status === "postponed"
                ? "Postergado"
                : "Sin programar";
        card.append(
          el(
            "p",
            statusLabel +
              " · " +
              (m.schedule_status === "scheduled"
                ? fmt(m.scheduled_at)
                : "Horario a definir"),
            "bp-league__match-meta",
          ),
        );
        if (m.match_status === "played" && Array.isArray(m.sets))
          card.append(
            el(
              "p",
              m.sets.map((set) => set.join("–")).join(" · "),
              "bp-league__score",
            ),
          );
        const buttons = el("div", null, "bp-league__buttons");
        const plan = el(
          "button",
          m.schedule_status === "scheduled" ? "Reprogramar" : "Programar",
          "torneos-outline",
        );
        plan.type = "button";
        plan.disabled =
          current?.status === "completed" ||
          m.match_status === "played" ||
          m.round_number == null;
        plan.addEventListener("click", () => openSchedule(m));
        const result = el(
          "button",
          m.match_status === "played"
            ? "Corregir resultado"
            : "Cargar resultado",
          "torneos-outline",
        );
        result.type = "button";
        result.disabled =
          current?.status === "completed" || m.round_number == null || regularLocked;
        result.addEventListener("click", () => openResult(m));
        buttons.append(plan, result);
        card.append(buttons);
        grid.append(card);
      }
      section.append(grid);
      fixture.append(section);
    }
  }
  function render() {
    generate.hidden = Boolean(current?.settings);
    const eligible =
      current &&
      (["registration_closed", "in_progress"].includes(current.status) ||
        (current.status === "registration_open" &&
          current.approved === current.max_pairs));
    generate.disabled =
      busy || !eligible || current.approved < 2 || current.pending > 0;
    if (!current?.settings) {
      fixture.replaceChildren(
        el(
          "p",
          "Cerrá las inscripciones o completá el cupo y sorteá todos los partidos de la Liga.",
          "bp-league__note",
        ),
      );
      table.replaceChildren();
      status(
        current?.pending
          ? "Hay solicitudes pendientes: aprobá o rechazá las parejas antes de generar el fixture."
          : "Cuando cierres inscripciones o completes el cupo aprobado, el sorteo organizará automáticamente las Fechas. Vos elegís el día y la hora de cada encuentro.",
      );
      return;
    }
    const noDate = matchList.some((m) => m.round_number == null);
    status(
      noDate
        ? "Esta Liga se sorteó con la versión anterior. Hay partidos sin Fecha; falta instalar la migración 83 para organizarlos automáticamente."
        : "Sorteo organizado: " +
            matchList.length +
            " partidos distribuidos en " +
            new Set(matchList.map((m) => m.round_number)).size +
            " Fechas. Programá el día y horario de cada encuentro.",
      noDate,
    );
    rank();
    renderMatches();
  }
  // Supabase suele limitar cada consulta a 1000 filas. Paginar el fixture
  // evita perder partidos en Ligas de muchos participantes o ida/vuelta.
  async function loadLeagueMatches(tournamentId) {
    const all = [];
    const page = 500;
    for (let offset = 0; ; offset += page) {
      const { data, error } = await supabaseClient
        .from("bp_league_matches")
        .select(
          "id,tournament_id,leg,round_number,match_number,pair1_id,pair2_id,schedule_status,scheduled_at,scheduled_ends_at,court_label,match_status,sets,sets_pair1,sets_pair2,winner_pair_id",
        )
        .eq("tournament_id", tournamentId)
        .order("round_number")
        .order("match_number")
        .range(offset, offset + page - 1);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < page) break;
    }
    return { data: all, error: null };
  }
  async function load() {
    const id = select.value,
      seq = ++generation;
    current = null;
    active = null;
    regularLocked = false;
    if (!id) {
      updateVisible(false);
      return;
    }
    try {
      const tr = await supabaseClient
        .from("bp_tournaments")
        .select("id,name,format,rules_version,status,starts_on,max_pairs,is_published")
        .eq("id", id)
        .maybeSingle();
      if (seq !== generation || id !== select.value) return;
      if (tr.error) throw tr.error;
      if (tr.data?.format !== "league") {
        updateVisible(false);
        return;
      }
      updateVisible(true);
      status("Cargando fechas y clasificación…");
      const [pr, mr, st] = await Promise.all([
        supabaseClient
          .from("bp_tournament_pairs")
          .select("id,player1_name,player2_name,status")
          .eq("tournament_id", id),
        loadLeagueMatches(id),
        supabaseClient
          .from("bp_league_settings")
          .select("tournament_id,legs")
          .eq("tournament_id", id)
          .maybeSingle(),
      ]);
      if (seq !== generation || id !== select.value) return;
      const failure = [pr, mr, st].find((x) => x.error)?.error;
      if (failure) throw failure;
      const all = pr.data || [];
      pairs = new Map(
        all
          .filter((x) => x.status === "approved")
          .map((p) => [p.id, p.player1_name + " y " + p.player2_name]),
      );
      matchList = mr.data || [];
      current = {
        ...tr.data,
        settings: st.data,
        approved: pairs.size,
        pending: all.filter((p) => p.status === "pending").length,
      };
      render();
      // P89: la fase final escucha solo la carga de una Liga válida.
      // Esta notificación no escribe nada ni altera los 66 partidos regulares.
      window.dispatchEvent(new CustomEvent("bp:league-loaded", {
        detail: {
          tournament: { ...current },
          pairs: [...pairs.entries()],
          matches: matchList.slice()
        }
      }));
    } catch (error) {
      if (seq !== generation) return;
      console.error("Error al cargar Liga", error);
      status(
        "No se pudo consultar la Liga. Verificá que la SQL 82 esté instalada y tu sesión sea administrativa.",
        true,
      );
      table.replaceChildren();
      fixture.replaceChildren();
    }
  }
  // P89: la fase final notifica cuándo cerrar edición de marcadores regulares.
  // La guardia SQL es la protección definitiva; esto evita errores de UX.
  window.addEventListener("bp:league-final-state", (event) => {
    if (!current || event.detail?.tournamentId !== current.id) return;
    regularLocked = Boolean(event.detail.locked);
    renderMatches();
  });
  select.addEventListener("change", load);
  // El selector se llena de forma asíncrona; incluso con una sola Liga debe
  // abrirse el panel sin obligar a cambiar manualmente de torneo.
  new MutationObserver(() => load()).observe(select, {
    childList: true,
    subtree: true,
  });
  load();
  $("bp-league-refresh").addEventListener("click", () => load());

  function askGenerateFixture(count, tournamentName) {
    const dialog = $("bp-league-generate-dialog");
    $("bp-league-generate-description").textContent =
      "¿Sortear los " +
      count +
      " cruces de «" +
      tournamentName +
      "»? El sistema los distribuirá automáticamente en Fechas. Los días y horarios quedan a cargo de Martín.";
    return new Promise((resolve) => {
      const yes = $("bp-league-generate-confirm"),
        no = $("bp-league-generate-cancel");
      let confirmed = false;
      const onYes = () => {
        confirmed = true;
        dialog.close();
      };
      const onNo = () => {
        dialog.close();
      };
      const onClose = () => {
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        resolve(confirmed);
      };
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
      dialog.addEventListener("close", onClose, { once: true });
      dialog.showModal();
    });
  }

  generate.addEventListener("click", async () => {
    if (busy || !current || current.settings) return;
    const id = current.id;
    const count = engine.buildSchedule([...pairs.keys()], 1).length;
    if (!(await askGenerateFixture(count, current.name))) return;
    busy = true;
    generate.disabled = true;
    try {
      const { error } = await supabaseClient.rpc("bp_league_generate_fixture", {
        p_tournament_id: id,
        p_legs: 1,
      });
      if (error) throw error;
      if (select.value === id) await load();
    } catch (error) {
      console.error(error);
      status(error.message || "No se pudo generar el fixture.", true);
    } finally {
      busy = false;
      generate.disabled = false;
    }
  });

  // Fecha N es una jornada del campeonato, NO una fecha de calendario:
  // sus partidos pueden jugarse en días distintos, incluidos días hábiles.
  const roundDialog = $("bp-league-round-dialog"),
    roundForm = $("bp-league-round-form"),
    roundNumber = $("bp-league-round-number");
  function openRound(match) {
    active = match;
    $("bp-league-round-title").textContent =
      match.round_number == null ? "Asignar Fecha" : "Cambiar Fecha";
    $("bp-league-round-rivals").textContent =
      name(match.pair1_id) + " vs. " + name(match.pair2_id);
    roundNumber.value = match.round_number ?? "";
    $("bp-league-round-error").textContent = "";
    roundDialog.showModal();
    roundNumber.focus();
  }
  $("bp-league-round-cancel").addEventListener("click", () =>
    roundDialog.close(),
  );
  roundForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (busy || !active) return;
    const match = active,
      round = Number(roundNumber.value);
    const errorMessage = $("bp-league-round-error");
    errorMessage.textContent = "";
    try {
      engine.validateRoundAssignment(matchList, match.id, round);
      busy = true;
      $("bp-league-round-save").disabled = true;
      const { error } = await supabaseClient.rpc("bp_league_assign_round", {
        p_match_id: match.id,
        p_round: round,
      });
      if (error) throw error;
      roundDialog.close();
      await load();
    } catch (err) {
      errorMessage.textContent = err.message || "No se pudo asignar la Fecha.";
    } finally {
      busy = false;
      $("bp-league-round-save").disabled = false;
    }
  });

  const sd = $("bp-league-schedule-dialog"),
    sf = $("bp-league-schedule-form");
  const postpone = $("bp-league-schedule-postpone");
  const day = $("bp-league-schedule-day"),
    time = $("bp-league-schedule-time"),
    duration = $("bp-league-schedule-duration");
  // HH:mm garantizado, incluso cuando el navegador está configurado con AM/PM.
  // La Liga conserva las 48 opciones: 00:00 a 23:30, cada 30 minutos.
  for (let hour = 0; hour <= 23; hour++) {
    for (const minute of ["00", "30"]) {
      const value = `${String(hour).padStart(2, "0")}:${minute}`;
      time.add(new Option(value, value));
    }
  }
  function scheduleFields() {
    for (const field of [day, time, duration, $("bp-league-schedule-court")])
      field.disabled = postpone.checked;
    day.required = !postpone.checked;
    time.required = !postpone.checked;
  }
  postpone.addEventListener("change", scheduleFields);
  function openSchedule(m) {
    active = m;
    $("bp-league-schedule-title").textContent =
      m.schedule_status === "scheduled"
        ? "Reprogramar partido"
        : "Programar partido";
    $("bp-league-schedule-rivals").textContent =
      name(m.pair1_id) + " vs. " + name(m.pair2_id);
    const base = localParts(m.scheduled_at || new Date().toISOString());
    day.value = base.day;
    time.value = m.scheduled_at ? base.time : "19:00";
    duration.value =
      m.scheduled_at && m.scheduled_ends_at
        ? String(
            Math.round(
              (Date.parse(m.scheduled_ends_at) - Date.parse(m.scheduled_at)) /
                60000,
            ),
          )
        : "90";
    $("bp-league-schedule-court").value = m.court_label || "";
    postpone.checked = false;
    scheduleFields();
    $("bp-league-schedule-error").textContent = "";
    sd.showModal();
  }
  $("bp-league-schedule-cancel").addEventListener("click", () => sd.close());
  sf.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (busy || !active) return;
    const match = active;
    $("bp-league-schedule-error").textContent = "";
    try {
      const start = postpone.checked
        ? null
        : new Date(day.value + "T" + time.value + ":00-03:00").toISOString();
      busy = true;
      $("bp-league-schedule-save").disabled = true;
      const { error } = await supabaseClient.rpc("bp_league_schedule_match", {
        p_match_id: match.id,
        p_start: start,
        p_duration_minutes: postpone.checked ? null : Number(duration.value),
        p_court_label: postpone.checked
          ? null
          : $("bp-league-schedule-court").value.trim(),
      });
      if (error) throw error;
      sd.close();
      await load();
    } catch (err) {
      console.error(err);
      $("bp-league-schedule-error").textContent =
        err.message || "No se pudo programar el partido.";
    } finally {
      busy = false;
      $("bp-league-schedule-save").disabled = false;
    }
  });

  const rd = $("bp-league-result-dialog"),
    rf = $("bp-league-result-form"),
    setsBox = $("bp-league-sets");
  let inputs = [];
  function toggleThird() {
    if (inputs.length !== 3) return;
    const [a, b] = inputs;
    const left = [Number(a[0].value), Number(b[0].value)],
      right = [Number(a[1].value), Number(b[1].value)];
    const complete = [...a, ...b].every((input) => input.value !== "");
    const split = complete && left[0] > right[0] !== left[1] > right[1];
    inputs[2][0].closest(".bp-league__set").hidden = !split;
    for (const input of inputs[2]) input.required = split;
  }
  function openResult(m) {
    active = m;
    $("bp-league-result-title").textContent =
      m.match_status === "played" ? "Corregir resultado" : "Cargar resultado";
    $("bp-league-result-rivals").textContent =
      name(m.pair1_id) + " vs. " + name(m.pair2_id);
    $("bp-league-result-error").textContent = "";
    setsBox.replaceChildren();
    inputs = [];
    for (let i = 0; i < 3; i++) {
      const row = el("div", null, "bp-league__set");
      row.append(el("strong", i === 2 && Number(current?.rules_version) !== 2026 ? "Súper tie-break" : "Set " + (i + 1)));
      const fields = [];
      for (let side = 0; side < 2; side++) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "99";
        input.step = "1";
        input.inputMode = "numeric";
        input.placeholder = "Pareja " + (side + 1);
        input.setAttribute(
          "aria-label",
          (i === 2 && Number(current?.rules_version) !== 2026 ? "Súper tie-break" : "Set " + (i + 1)) +
            " pareja " +
            (side + 1),
        );
        input.value = m.sets?.[i]?.[side] ?? "";
        input.required = i < 2;
        input.addEventListener("input", toggleThird);
        fields.push(input);
        row.append(input);
      }
      inputs.push(fields);
      setsBox.append(row);
    }
    toggleThird();
    rd.showModal();
  }
  $("bp-league-result-cancel").addEventListener("click", () => rd.close());
  rf.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!active || busy || regularLocked) return;
    const match = active;
    try {
      const first = inputs
        .slice(0, 2)
        .map((row) => row.map((input) => Number(input.value)));
      const split = first[0][0] > first[0][1] !== first[1][0] > first[1][1];
      const sets = split
        ? [...first, inputs[2].map((input) => Number(input.value))]
        : first;
      if (
        [...inputs.slice(0, split ? 3 : 2).flat()].some((x) => x.value === "")
      )
        throw Error("Completá todos los resultados del partido.");
      engine.analyzeScore(sets, Number(current?.rules_version) === 2026 ? "three_sets" : "super_tb");
      $("bp-league-result-error").textContent = "";
      busy = true;
      $("bp-league-result-save").disabled = true;
      const { error } = await supabaseClient.rpc(Number(current?.rules_version) === 2026 ? "bp_league_save_result2026" : "bp_league_save_result", {
        p_match_id: match.id,
        p_sets: sets,
      });
      if (error) throw error;
      rd.close();
      await load();
    } catch (err) {
      console.error(err);
      $("bp-league-result-error").textContent =
        err.message || "No se pudo guardar el resultado.";
    } finally {
      busy = false;
      $("bp-league-result-save").disabled = false;
    }
  });
})();
