/* Boulevard Padel — resultados por sets y clasificacion de grupos (Fase 2A, parche 54).
   Solo administra partidos ya creados. No crea ni programa canchas. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const tournamentSelect = $("torneos-pairs-tournament");
  const groupsPanel = $("torneos-groups-panel");
  const motor = window.BPTournamentEngine;
  if (!tournamentSelect || !groupsPanel || !motor) return;

  const panel = document.createElement("section");
  panel.id = "bp-results-panel";
  panel.className = "torneos-panel bp-results-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="bp-results-toolbar">
      <h2>Tablas de posiciones</h2>
      <button type="button" class="torneos-outline" id="bp-results-refresh">Actualizar tablas</button>
    </div>
    <p class="bp-results-description">Cargá y corregí los marcadores desde cada partido del fixture. Aquí consultás únicamente las posiciones. Victoria: 3 puntos; derrota: 0.</p>
    <p id="bp-results-message" class="bp-results-hint" role="status" aria-live="polite"></p>
    <div id="bp-results-content"></div>`;
  groupsPanel.after(panel);
  const content = $("bp-results-content");
  const message = $("bp-results-message");
  const refreshButton = $("bp-results-refresh");

  const dialog = document.createElement("dialog");
  dialog.className = "bp-results-dialog";
  dialog.id = "bp-results-dialog";
  dialog.setAttribute("aria-labelledby", "bp-results-dialog-title");
  dialog.innerHTML = `
    <form id="bp-results-form">
      <h3 id="bp-results-dialog-title">Resultado del partido</h3>
      <p id="bp-results-rivals"></p>
      <p class="bp-results-hint">Grupos: los dos primeros sets son normales. Si quedan 1-1, el tercero es un súper tie-break a 10 puntos (2 de diferencia).</p>
      <div id="bp-results-sets"></div>
      <!-- El historial identifica al administrador y la operación sin pedirle un motivo. -->
      <input type="hidden" id="bp-results-reason" />
      <p id="bp-results-dialog-error" class="bp-results-error" role="alert"></p>
      <div class="bp-results-dialog-buttons">
        <button type="button" class="torneos-outline" id="bp-results-cancel">Volver</button>
        <button type="submit" class="primary" id="bp-results-submit">Guardar resultado</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const form = $("bp-results-form");
  const setsBox = $("bp-results-sets");
  const reason = $("bp-results-reason");
  const dialogError = $("bp-results-dialog-error");
  const save = $("bp-results-submit");
  const cancel = $("bp-results-cancel");
  let active = null;
  let loading = 0;
  let timer = null;
  let saving = false;
  let selectedData = null;

  function setMessage(value, mode = "") {
    message.textContent = value;
    message.className = "bp-results-hint" + (mode ? ` bp-results-${mode}` : "");
  }
  function groupLetter(number) {
    let n = Number(number),
      out = "";
    while (Number.isSafeInteger(n) && n > 0) {
      n--;
      out = String.fromCharCode(65 + (n % 26)) + out;
      n = Math.floor(n / 26);
    }
    return out || "?";
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function pairName(pair) {
    return pair
      ? `${pair.player1_name} y ${pair.player2_name}`
      : "Pareja no disponible";
  }
  function sourceMatch(match, side, matches) {
    const number =
      side === 1
        ? match.pair1_source_match_number
        : match.pair2_source_match_number;
    if (number == null) return null;
    return (
      matches.find(
        (m) =>
          m.group_id === match.group_id &&
          m.round_number === 1 &&
          m.match_number === number,
      ) || null
    );
  }
  function participantId(match, side, matches, byResult) {
    const direct = side === 1 ? match.pair1_id : match.pair2_id;
    if (direct) return direct;
    const from = sourceMatch(match, side, matches);
    const outcome =
      side === 1 ? match.pair1_source_outcome : match.pair2_source_outcome;
    if (!from || !["winner", "loser"].includes(outcome)) return null;
    const result = byResult.get(from.id);
    if (
      !result ||
      ![result.resolved_pair1_id, result.resolved_pair2_id].includes(
        result.winner_pair_id,
      )
    )
      return null;
    return outcome === "winner"
      ? result.winner_pair_id
      : result.winner_pair_id === result.resolved_pair1_id
        ? result.resolved_pair2_id
        : result.resolved_pair1_id;
  }
  function participantLabel(match, side, matches, byResult, pairMap) {
    const resolved = participantId(match, side, matches, byResult);
    if (resolved) return pairName(pairMap.get(resolved));
    const number =
      side === 1
        ? match.pair1_source_match_number
        : match.pair2_source_match_number;
    const outcome =
      side === 1 ? match.pair1_source_outcome : match.pair2_source_outcome;
    if (number != null && ["winner", "loser"].includes(outcome))
      return `${outcome === "winner" ? "Ganador" : "Perdedor"} A${number}`;
    return "Pareja no disponible";
  }
  function findGroupFourMatches(matches) {
    if (matches.length !== 4) return null;
    const get = (round, num) =>
      matches.find((m) => m.round_number === round && m.match_number === num);
    const [a1, a2, a3, a4] = [get(1, 1), get(1, 2), get(2, 1), get(2, 2)];
    if ([a1, a2, a3, a4].some((m) => !m)) return null;
    const pairIds = [a1.pair1_id, a1.pair2_id, a2.pair1_id, a2.pair2_id];
    if (pairIds.some((id) => !id) || new Set(pairIds).size !== 4) return null;
    return { a1, a2, a3, a4, pairIds };
  }
  // Temporada 2026: se calcula por 2/0, diferencia de sets, de games,
  // enfrentamiento directo y sólo después se requiere decisión de Martín.
  // Nunca asignar automáticamente primero/segundo por A3 y A4.
  function standingsFor2026(members, matches, byResult) {
    const engine = window.BPReglamento2026;
    if (!engine) throw Error("Falta el motor deportivo 2026.");
    const completed = matches.map(m => {
      const r = byResult.get(m.id);
      return r ? {
        pair1: r.resolved_pair1_id,
        pair2: r.resolved_pair2_id,
        sets: r.sets,
      } : null;
    }).filter(Boolean);
    const info = engine.standings(members, completed);
    const qualifyingPlaces = members.length === 4 ? 3 : 2;
    return {
      table: info.rows,
      qualifyingPlaces,
      playedMatches: completed.length,
      totalMatches: matches.length,
      complete: info.complete,
      fullTies: info.unresolved,
      boundaryTie: info.unresolved.some(t => {
        const at = info.rows.map((r,i) => t.includes(r.pairId) ? i : -1).filter(i => i >= 0);
        return at.includes(qualifyingPlaces-1) && at.includes(qualifyingPlaces);
      }),
      qualificationReady: info.qualificationReady,
      seedingReady: info.qualificationReady,
      qualifiedPairIds: info.qualified,
    };
  }
  function standingsForFour(members, matches, byResult, semifinalMode = false) {
    if (Number(selectedData?.tournament?.rules_version) === 2026)
      return standingsFor2026(members, matches, byResult);
    const found = findGroupFourMatches(matches);
    if (
      !found ||
      members.length !== 4 ||
      members.some((id) => !found.pairIds.includes(id))
    )
      return null;
    const results = {};
    for (const [code, match] of [
      ["A1", found.a1],
      ["A2", found.a2],
      ["A3", found.a3],
      ["A4", found.a4],
    ]) {
      const stored = byResult.get(match.id);
      if (stored) {
        if (
          stored.resolved_pair1_id !==
            participantId(match, 1, matches, byResult) ||
          stored.resolved_pair2_id !==
            participantId(match, 2, matches, byResult)
        ) {
          throw new Error(`Participantes inconsistentes en ${code}.`);
        }
        results[code] = {
          sets: stored.sets,
          format: stored.score_format || "legacy",
        };
      }
    }
    const positions = motor.calculateGroupStandings(found.pairIds, results);
    if (semifinalMode && positions.complete) {
      // El puesto oficial en el grupo de 4 viene de los cruces A3 y A4.
      // No forzar un desempate estadístico de dos parejas con 3 puntos.
      const order = motor.decisiveFourPlacings(found.pairIds, results);
      const byId = new Map(positions.table.map((row) => [row.pairId, row]));
      positions.table = order.map((id) => byId.get(id));
      positions.qualifyingPlaces = 2;
      positions.qualifiedPairIds = order.slice(0, 2);
      positions.boundaryTie = false;
      positions.fullTies = [];
      positions.seedingReady = true;
      positions.qualificationReady = true;
    }
    return positions;
  }
  function prettySets(sets, format) {
    return Array.isArray(sets)
      ? sets
          .map(
            (set, i) =>
              (i === 2 && format === "super_tb" ? "STB " : "") +
              `${set[0]}-${set[1]}`,
          )
          .join(", ")
      : "";
  }
  function legacyNeedsReview(result) {
    if (!result || result.score_format !== "legacy") return false;
    try {
      motor.evaluateSets({ sets: result.sets }, "super_tb");
      return false;
    } catch {
      return true;
    }
  }
  function getResultsMapping(pairIds, matches, byResult) {
    // En zonas de 3 cada duelo se identifica por los dos IDs, aunque Martín haya
    // modificado las jornadas u orden del fixture.
    const fixture = motor.buildGroupFixture(pairIds);
    const results = {};
    for (const expected of fixture) {
      const match = matches.find(
        (m) =>
          [m.pair1_id, m.pair2_id].includes(expected.pair1) &&
          [m.pair1_id, m.pair2_id].includes(expected.pair2),
      );
      if (!match || !byResult.has(match.id)) continue;
      const stored = byResult.get(match.id);
      // La orientacion del marcador pertenece al orden real del fixture.
      results[expected.code] = {
        sets:
          expected.pair1 === match.pair1_id
            ? stored.sets
            : stored.sets.map((set) => [set[1], set[0]]),
        format: stored.score_format || "legacy",
      };
    }
    return results;
  }
  function standingsForThree(pairIds, matches, resultMap) {
    if (Number(selectedData?.tournament?.rules_version) === 2026)
      return standingsFor2026(pairIds, matches, resultMap);
    const fixture = motor.buildGroupFixture(pairIds);
    const actual = fixture.map((expected) =>
      matches.filter(
        (m) =>
          [m.pair1_id, m.pair2_id].includes(expected.pair1) &&
          [m.pair1_id, m.pair2_id].includes(expected.pair2),
      ),
    );
    if (actual.some((options) => options.length !== 1) || matches.length !== 3)
      return null;
    return motor.calculateGroupStandings(
      pairIds,
      getResultsMapping(pairIds, matches, resultMap),
    );
  }
  function tableForStandings(standings, pairMap) {
    const wrap = element("div", "", "bp-results-table-wrap");
    const table = element("table", "", "bp-results-table");
    const head = element("thead");
    const tr = element("tr");
    for (const label of [
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
      tr.append(element("th", label));
    head.append(tr);
    table.append(head);
    const tbody = element("tbody");
    standings.table.forEach((row, index) => {
      const tr = element("tr");
      for (const value of [
        index + 1,
        pairName(pairMap.get(row.pairId)),
        row.played,
        row.won,
        row.lost,
        row.setsFor,
        row.setsAgainst,
        row.setDifference > 0 ? `+${row.setDifference}` : row.setDifference,
        row.gamesFor,
        row.gamesAgainst,
        row.gameDifference > 0 ? `+${row.gameDifference}` : row.gameDifference,
        row.points,
      ])
        tr.append(element("td", value));
      tbody.append(tr);
    });
    table.append(tbody);
    wrap.append(table);
    return wrap;
  }
  /* Parche 62: una única tarjeta por partido. El fixture conserva las acciones
     de programación; este módulo agrega el botón de resultados y el marcador. */
  function syncFixtureResultActions(data, pairMap, byResult) {
    if (
      !fixtureList ||
      typeof fixtureList.querySelectorAll !== "function" ||
      data.tournament.id !== tournamentSelect.value
    )
      return;
    const entries = new Map(
      [
        ...fixtureList.querySelectorAll(
          ".torneos-fixture-entry[data-match-id]",
        ),
      ].map((node) => [node.dataset.matchId, node]),
    );
    const activeTournament = ["registration_closed", "in_progress"].includes(
      data.tournament.status,
    );
    const published = Boolean(data.tournament.fixture_published_at);
    for (const match of data.matches) {
      const entry = entries.get(match.id);
      const footer = entry?.querySelector(".torneos-fixture-entry__footer");
      if (!footer) continue;
      const groupMatches = data.matches.filter(
        (item) => item.group_id === match.group_id,
      );
      const result = byResult.get(match.id);
      const ready = Boolean(
        participantId(match, 1, groupMatches, byResult) &&
        participantId(match, 2, groupMatches, byResult),
      );
      // En grupos de cuatro, reemplazar Ganador/Perdedor A1 por la pareja real
      // solo cuando ambos participantes ya estén resueltos por el servidor.
      const pairNodes = entry.querySelectorAll(".torneos-fixture-pair");
      for (const side of [1, 2]) {
        const directId = side === 1 ? match.pair1_id : match.pair2_id;
        if (directId) continue;
        const resolvedId = participantId(match, side, groupMatches, byResult);
        const pair = pairMap.get(resolvedId);
        if (!pair || !pairNodes[side - 1]) continue;
        const first = element("span", pair.player1_name);
        const second = element("span", pair.player2_name);
        pairNodes[side - 1].replaceChildren(first, second);
      }
      // El fixture puede redibujarse tras una programación: nunca duplicar.
      for (const old of footer.querySelectorAll(
        ".torneos-fixture-entry__button--result",
      ))
        old.remove();
      if (result || match.match_status !== "pending") {
        for (const old of footer.querySelectorAll(
          ".torneos-fixture-entry__actions .torneos-fixture-entry__button:not(.torneos-fixture-entry__button--result)",
        ))
          old.remove();
      }
      let outcome = footer.querySelector(".torneos-fixture-entry__result");
      if (result) {
        if (!outcome) {
          outcome = element("span", "", "torneos-fixture-entry__result");
          footer.append(outcome);
        }
        outcome.textContent = `Resultado: ${prettySets(result.sets, result.score_format)}`;
        outcome.classList.toggle(
          "torneos-fixture-entry__result--review",
          legacyNeedsReview(result),
        );
      } else if (match.match_status === "played") {
        if (!outcome) {
          outcome = element("span", "", "torneos-fixture-entry__result");
          footer.append(outcome);
        }
        outcome.textContent = "Resultado pendiente de compatibilizar";
        outcome.classList.add("torneos-fixture-entry__result--review");
      }
      if (
        !activeTournament ||
        !published ||
        (!result && match.match_status !== "pending")
      )
        continue;
      let actions = footer.querySelector(".torneos-fixture-entry__actions");
      if (!actions) {
        actions = element("div", "", "torneos-fixture-entry__actions");
        footer.append(actions);
      }
      const button = element(
        "button",
        result
          ? "Corregir resultado"
          : ready
            ? "Cargar resultado"
            : "Esperando resultados previos",
        "torneos-outline torneos-fixture-entry__button torneos-fixture-entry__button--result",
      );
      button.type = "button";
      button.disabled = !ready;
      button.title = ready
        ? result
          ? "Modificar marcador con registro de auditoría."
          : "Cargar los sets de este partido."
        : "Primero registrá los partidos que determinan las parejas.";
      button.addEventListener("click", () => {
        // Evitar actuar con datos obsoletos si Martín cambia de torneo.
        if (
          saving ||
          selectedData !== data ||
          tournamentSelect.value !== data.tournament.id
        )
          return;
        openResult(match, groupMatches, pairMap, byResult, result);
      });
      actions.append(button);
    }
  }

  function render(data) {
    content.replaceChildren();
    if (!data.groups.length) {
      content.append(
        element("p", "Todavía no hay grupos sorteados.", "bp-results-hint"),
      );
      return;
    }
    const pairMap = new Map(data.pairs.map((p) => [p.id, p]));
    const byResult = new Map(data.results.map((r) => [r.match_id, r]));
    const published = Boolean(data.tournament.fixture_published_at);
    syncFixtureResultActions(data, pairMap, byResult);
    for (const group of data.groups) {
      const members = data.assignments
        .filter((a) => a.group_id === group.id)
        .map((a) => a.pair_id);
      const matches = data.matches
        .filter((m) => m.group_id === group.id)
        .sort(
          (a, b) =>
            a.round_number - b.round_number || a.match_number - b.match_number,
        );
      const block = element("section", "", "bp-results-group");
      block.append(
        element(
          "h3",
          `Grupo ${groupLetter(group.group_number)} · ${members.length} parejas`,
        ),
      );
      if (!matches.length) {
        block.append(
          element(
            "p",
            "La tabla aparecerá cuando se generen los partidos del grupo.",
            "bp-results-hint",
          ),
        );
      } else {
        const oldResults = matches.filter((m) =>
          legacyNeedsReview(byResult.get(m.id)),
        );
        if (oldResults.length)
          block.append(
            element(
              "p",
              `Hay ${oldResults.length} marcador(es) anterior(es) para revisar desde el fixture.`,
              "bp-results-hint bp-results-error",
            ),
          );
        const inconsistent = matches.filter(
          (m) =>
            m.match_status !== "pending" &&
            m.match_status !== "walkover" &&
            !byResult.has(m.id),
        );
        if (inconsistent.length)
          block.append(
            element(
              "p",
              "Hay un partido disputado sin marcador compatible. Revisá el fixture.",
              "bp-results-hint bp-results-error",
            ),
          );
      }
      if (members.length === 3 && matches.length) {
        try {
          const standings = standingsForThree(members, matches, byResult);
          if (standings) {
            block.append(tableForStandings(standings, pairMap));
            if (!standings.complete)
              block.append(
                element(
                  "p",
                  `Tabla provisoria · ${standings.playedMatches}/${standings.totalMatches} partidos cargados.`,
                  "bp-results-hint",
                ),
              );
            else if (standings.fullTies.length)
              block.append(
                element(
                  "p",
                  "Hay parejas empatadas también en sets a favor: las posiciones empatadas requieren resolución antes de asignar semillas.",
                  "bp-results-hint bp-results-error",
                ),
              );
            else
              block.append(
                element(
                  "p",
                  "Grupo completo. Clasifican las dos primeras parejas.",
                  "bp-results-hint bp-results-success",
                ),
              );
          } else
            block.append(
              element(
                "p",
                "El fixture no coincide con tres enfrentamientos únicos; revisá los cruces.",
                "bp-results-error",
              ),
            );
        } catch (error) {
          block.append(
            element(
              "p",
              `No se pudo calcular la tabla: ${error.message}`,
              "bp-results-error",
            ),
          );
        }
      } else if (members.length === 4 && matches.length) {
        try {
          const standings = standingsForFour(
            members,
            matches,
            byResult,
            data.groups.length === 2,
          );
          if (standings) {
            block.append(tableForStandings(standings, pairMap));
            if (!standings.complete)
              block.append(
                element(
                  "p",
                  `Tabla provisoria · ${standings.playedMatches}/${standings.totalMatches} partidos cargados.`,
                  "bp-results-hint",
                ),
              );
            else if (Number(data.tournament.rules_version) === 2026)
              block.append(element(
                "p",
                standings.fullTies.length
                  ? "Clasifican tres parejas. Hay puestos empatados que Martín debe resolver en Clasificación y eliminatorias."
                  : "Grupo completo: clasifican las tres primeras parejas, determinadas por tabla de posiciones.",
                standings.fullTies.length ? "bp-results-hint bp-results-error" : "bp-results-hint bp-results-success",
              ));
            else if (data.groups.length === 2)
              block.append(
                element(
                  "p",
                  "Grupo completo. Clasifican las dos parejas del cruce de ganadores A3. Orden oficial: ganador A3 (1°), perdedor A3 (2°), ganador A4 (3°), perdedor A4 (4°). Ese orden se determina por los cruces, aunque haya empate en estadísticas.",
                  "bp-results-hint bp-results-success",
                ),
              );
            else if (standings.boundaryTie)
              block.append(
                element(
                  "p",
                  "Hay empate completo para el tercer puesto. Falta definir un desempate para determinar quien clasifica.",
                  "bp-results-error",
                ),
              );
            else if (standings.fullTies.length)
              block.append(
                element(
                  "p",
                  "Clasifican las tres primeras parejas, pero hay puestos empatados que requieren definicion antes de las eliminatorias.",
                  "bp-results-hint",
                ),
              );
            else
              block.append(
                element(
                  "p",
                  "Grupo completo. Clasifican las tres primeras parejas.",
                  "bp-results-hint bp-results-success",
                ),
              );
          } else
            block.append(
              element(
                "p",
                "El fixture no coincide con los cuatro cruces A1, A2, A3 y A4.",
                "bp-results-error",
              ),
            );
        } catch (error) {
          block.append(
            element(
              "p",
              `No se pudo calcular la tabla: ${error.message}`,
              "bp-results-error",
            ),
          );
        }
      }
      content.append(block);
    }
    const referencias = element("div", "", "bp-results-legend");
    const columnas = element("div", "", "bp-results-legend__grid");

    for (const [sigla, significado] of motor.standingsLegendItems) {
      const item = element("div", "", "bp-results-legend__item");

      item.append(
        element("strong", `${sigla}:`, "bp-results-legend__key"),
        element("span", significado, "bp-results-legend__value"),
      );

      columnas.append(item);
    }

    referencias.append(
      columnas,
      element("p", motor.standingsLegendNote, "bp-results-legend__note"),
    );

    content.append(referencias);
    if (!published)
      setMessage(
        "Publicá el fixture antes de cargar resultados. Las tablas se calculan con los resultados ya registrados.",
      );
    else
      setMessage(
        "Cargá o corregí los marcadores desde cada tarjeta del fixture. Estas tablas se actualizan automáticamente.",
      );
  }
  async function load() {
    const id = tournamentSelect.value;
    const seq = ++loading;
    panel.hidden = !id;
    selectedData = null;
    if (!id) {
      content.replaceChildren();
      setMessage("");
      return;
    }
    setMessage("Consultando partidos y resultados…");
    try {
      const [tr, gr, ar, pr, mr, rr] = await Promise.all([
        supabaseClient
          .from("bp_tournaments")
          .select("id,name,format,rules_version,status,fixture_published_at")
          .eq("id", id)
          .maybeSingle(),
        supabaseClient
          .from("bp_tournament_groups")
          .select("id,group_number")
          .eq("tournament_id", id)
          .order("group_number"),
        supabaseClient
          .from("bp_tournament_group_pairs")
          .select("group_id,pair_id,created_at")
          .eq("tournament_id", id)
          .order("created_at"),
        supabaseClient
          .from("bp_tournament_pairs")
          .select("id,player1_name,player2_name")
          .eq("tournament_id", id),
        supabaseClient
          .from("bp_tournament_group_matches")
          .select(
            "id,group_id,round_number,match_number,pair1_id,pair2_id,pair1_source_match_number,pair1_source_outcome,pair2_source_match_number,pair2_source_outcome,match_status",
          )
          .eq("tournament_id", id)
          .order("round_number"),
        supabaseClient
          .from("bp_tournament_match_results")
          .select(
            "match_id,sets,sets_pair1,sets_pair2,winner_pair_id,resolved_pair1_id,resolved_pair2_id,score_format",
          )
          .eq("tournament_id", id),
      ]);
      if (seq !== loading || id !== tournamentSelect.value) return;
      const err = [tr, gr, ar, pr, mr, rr].find((item) => item.error)?.error;
      if (err) throw err;
      if (!tr.data || tr.data.format !== "groups_knockout") {
        panel.hidden = true;
        return;
      }
      if (panel.querySelector?.(".bp-results-description")) panel.querySelector(".bp-results-description").textContent =
        Number(tr.data.rules_version) === 2026
          ? "Fase de grupos: partido ganado 2 puntos, perdido 0. Sets y games se utilizan para desempatar."
          : "Cargá y corregí los marcadores desde cada partido del fixture. Aquí consultás únicamente las posiciones. Victoria: 3 puntos; derrota: 0.";
      selectedData = {
        tournament: tr.data,
        groups: gr.data || [],
        assignments: ar.data || [],
        pairs: pr.data || [],
        matches: mr.data || [],
        results: rr.data || [],
      };
      render(selectedData);
    } catch (error) {
      if (seq !== loading) return;
      console.error("Error al cargar resultados de grupos", error);
      setMessage(
        "No se pudieron cargar los resultados. Verificá que el SQL 61 esté instalado y tu sesión sea administrativa.",
        "error",
      );
      content.replaceChildren();
    }
  }
  function scheduleLoad() {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      load();
    }, 220);
  }
  function openResult(match, matches, pairMap, byResult, result) {
    if (saving) return;
    const label1 = participantLabel(match, 1, matches, byResult, pairMap);
    const label2 = participantLabel(match, 2, matches, byResult, pairMap);
    if (
      !participantId(match, 1, matches, byResult) ||
      !participantId(match, 2, matches, byResult)
    )
      return;
    active = { match, result };
    $("bp-results-rivals").textContent = `${label1} vs. ${label2}`;
    $("bp-results-dialog-title").textContent = result
      ? "Corregir resultado"
      : "Cargar resultado";
    setsBox.replaceChildren();
    for (let i = 0; i < 3; i++) {
      const row = element("div", "", "bp-results-set");
      row.append(
        element(
          "strong",
          i === 2 ? "Súper tie-break (a 10 puntos)" : `Set ${i + 1}`,
        ),
      );
      for (let side = 0; side < 2; side++) {
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "99";
        input.step = "1";
        input.inputMode = "numeric";
        input.name = `s${i + 1}p${side + 1}`;
        input.setAttribute("aria-label", `Set ${i + 1}, pareja ${side + 1}`);
        input.placeholder = side === 0 ? "Pareja 1" : "Pareja 2";
        input.value = result?.sets?.[i]?.[side] ?? "";
        row.append(input);
      }
      setsBox.append(row);
    }
    // Nunca solicitar el tercer parcial si el partido terminó 2-0.
    // Si el resultado parcial es 1-1, habilitar el súper tie-break.
    const thirdInputs = [...setsBox.querySelectorAll("input")].slice(4);
    const syncThird = () => {
      const scores = [1, 2].map((n) => [
        form.elements[`s${n}p1`].value,
        form.elements[`s${n}p2`].value,
      ]);
      const valid = scores.every(
        ([a, b]) =>
          a !== "" && b !== "" && motor.validRegularSet(Number(a), Number(b)),
      );
      const split =
        valid &&
        Number(scores[0][0]) > Number(scores[0][1]) !==
          Number(scores[1][0]) > Number(scores[1][1]);
      const finished = valid && !split;
      for (const input of thirdInputs) {
        input.disabled = !split;
        if (finished) input.value = "";
      }
    };
    for (const input of [...setsBox.querySelectorAll("input")].slice(0, 4))
      input.addEventListener("input", syncThird);
    syncThird();
    // La función segura de Supabase conserva la auditoría. No pedir una justificación
    // a Martín: se envía la descripción de la operación al corregir el marcador.
    reason.value = result ? "Corrección de resultado desde Admin" : "";
    dialogError.textContent = "";
    save.textContent = result ? "Guardar corrección" : "Guardar resultado";
    dialog.showModal();
  }
  cancel.addEventListener("click", () => {
    if (!saving) dialog.close();
  });
  dialog.addEventListener("cancel", (ev) => {
    if (saving) ev.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (!saving) active = null;
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!active || saving) return;
    const sets = [];
    for (let i = 1; i <= 3; i++) {
      const a = form.elements[`s${i}p1`].value.trim();
      const b = form.elements[`s${i}p2`].value.trim();
      if (i === 3 && a === "" && b === "") break;
      if (a === "" || b === "") {
        dialogError.textContent = `Completá los dos valores del set ${i}.`;
        return;
      }
      sets.push([Number(a), Number(b)]);
    }
    try {
      motor.evaluateSets({ sets }, "super_tb");
    } catch (e) {
      dialogError.textContent = e.message;
      return;
    }
    if (
      active.result &&
      (reason.value.trim().length < 5 || reason.value.trim().length > 1000)
    ) {
      dialogError.textContent =
        "No se pudo preparar el registro automático de la corrección.";
      return;
    }
    const matchId = active.match.id;
    saving = true;
    save.disabled = true;
    cancel.disabled = true;
    dialogError.textContent = "Guardando…";
    try {
      const { error } = await supabaseClient.rpc(
        "bp_admin_save_group_match_result",
        {
          p_match_id: matchId,
          p_sets: sets,
          p_reason: active.result ? reason.value.trim() : null,
        },
      );
      if (error) throw error;
      saving = false;
      dialog.close();
      active = null;
      await load();
      setMessage(
        "Resultado guardado y tabla actualizada correctamente.",
        "success",
      );
    } catch (error) {
      console.error("Error al guardar resultado", error);
      dialogError.textContent =
        error.message || "No se pudo guardar el resultado.";
    } finally {
      saving = false;
      save.disabled = false;
      cancel.disabled = false;
    }
  });
  refreshButton.addEventListener("click", load);
  tournamentSelect.addEventListener("change", load);
  const fixtureList = document.querySelector(".torneos-fixture-list");
  const groupsList = $("torneos-groups-list");
  const observer = new MutationObserver(scheduleLoad);
  if (fixtureList) observer.observe(fixtureList, { childList: true });
  if (groupsList) observer.observe(groupsList, { childList: true });
  load();
})();
