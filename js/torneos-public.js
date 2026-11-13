/* Boulevard Pádel — lectura pública de competencias y solicitud segura de pareja. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const list = $("public-tournaments-list");
  const dialog = $("public-tournament-dialog");
  const form = $("public-tournament-form");
  const feedback = $("public-tournament-feedback");
  const labels = {
    league: "Liga",
    groups_knockout: "Grupos + eliminatorias",
    knockout: "Eliminación directa",
  };
  // El sitio carga primero el motor deportivo. El fallback mantiene las
  // vistas informativas ante cargas parciales o simulaciones de pruebas.
  const standingsLegend =
    window.BPTournamentEngine?.standingsLegend ||
    "PJ: Partidos jugados · PG: Ganados · PP: Perdidos · SF: Sets a favor · " +
      "SC: Sets en contra · Dif.: Diferencia de sets · GF: Games a favor · " +
      "GC: Games en contra · Dif.G: Diferencia de games · Pts: Puntos.";
  function countNormalGames(sets, format = "legacy") {
    if (window.BPTournamentEngine?.countNormalGames)
      return window.BPTournamentEngine.countNormalGames(sets, format);
    if (!Array.isArray(sets)) return [0, 0];
    const third = sets[2];
    const includeThird =
      format === "three_sets" ||
      (format === "legacy" &&
        Array.isArray(third) &&
        third.length === 2 &&
        third.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 7));
    return (includeThird ? sets : sets.slice(0, 2)).reduce(
      (sum, set) => {
        if (
          Array.isArray(set) &&
          set.length === 2 &&
          set.every((n) => Number.isSafeInteger(n) && n >= 0)
        ) {
          sum[0] += set[0];
          sum[1] += set[1];
        }
        return sum;
      },
      [0, 0],
    );
  }
  let selection = null;
  let loading = false;
  let tournamentsCache = [];
  let currentTab = "current";
  // Cada categoría recuerda el torneo elegido cuando se alternan las pestañas.
  const selectedTournamentByTab = { current: null, finished: null };
  /* BVPadel parche 28: grupos publicados en el sitio publico. */
  let publishedGroupsByTournament = new Map();
  /* BVPadel parche 41: fixture de grupos, solo mediante vista publica segura. */
  let publishedFixtureByTournament = new Map();
  /* SQL 71: sólo datos sanitizados de torneos visibles y fases publicadas. */
  let publicFollowupByTournament = new Map();
  let publicLeagueByTournament = new Map();
  let publicLeagueFinalByTournament = new Map();
  let publicBracketByTournament = new Map();

  function status(text) {
    feedback.textContent = text;
  }
  function tokenReset() {
    try {
      window.turnstile?.reset();
    } catch (_e) {
      /* no widget yet */
    }
  }
  function close() {
    if (loading) return;
    dialog.close();
    selection = null;
    form.reset();
    tokenReset();
  }
  $("public-tournament-back").addEventListener("click", close);
  dialog.addEventListener("close", () => {
    selection = null;
    form.reset();
    tokenReset();
  });
  function open(t) {
    selection = t;
    form.reset();
    $("public-tournament-error").textContent = "";
    $("public-tournament-name").textContent = t.name;
    dialog.showModal();
    $("public-player1").focus();
  }

  const dateText = (value) => value.split("-").reverse().join("/");
  function localToday() {
    const values = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
  // BVPadel parche 42: fin estimado no finaliza automaticamente.
  function isFinished(t) {
    return t.status === "completed";
  }
  function registrationOpen(t) {
    return (
      !isFinished(t) &&
      t.status === "registration_open" &&
      (!t.registration_closes_at ||
        Date.now() < Date.parse(t.registration_closes_at))
    );
  }
  function make(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function competitionState(t) {
    if (isFinished(t)) return "Finalizado";
    if (t.starts_on > localToday()) return "Próximamente";
    return "En curso";
  }
  function categoryName(t) {
    return (
      t.bp_tournament_categories?.name ||
      t.category_name ||
      "Categoría por confirmar"
    );
  }
  function appendResults(container, items) {
    const list = make("div", "public-tournament-results");
    items.forEach((item) => {
      const article = make("article", "public-tournament-result");
      const meta = make("div", "public-tournament-result__meta");
      meta.append(make("span", "", item.stage), make("span", "", item.date));
      article.append(meta);
      // Resultados de grupos y eliminatorias: un rival por línea, como en Liga.
      const rivals = make("div", "public-tournament-result__teams");
      rivals.append(
        make("strong", "public-tournament-result__rival", item.pair1),
        make("span", "public-tournament-result__vs", "vs"),
        make("strong", "public-tournament-result__rival", item.pair2),
      );
      article.append(rivals);
      article.append(
        make("span", "public-tournament-result__score", item.score),
      );
      article.append(
        make("span", "public-tournament-result__winner", item.winner),
      );
      list.append(article);
    });
    container.append(list);
  }
  function buildTableBlock(block) {
    const wrapper = make("div", "public-tournament-table-scroll");
    const table = make("table", "public-tournament-table");
    if (block.caption) table.append(make("caption", "", block.caption));
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    block.columns.forEach((column) => headRow.append(make("th", "", column)));
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    block.rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((cell, index) => {
        const td = make(
          "td",
          index === 0 && block.columns[0] === "Pos."
            ? "public-tournament-table__pos"
            : "",
          cell,
        );
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    wrapper.append(table);
    return wrapper;
  }
  // Seguimiento real a partir del servidor, sin mostrar datos de contacto.
  const tournamentTZ = "America/Argentina/Cordoba";
  function publicPairName(pair, fallback = "A definir") {
    return pair ? `${pair.player1_name} / ${pair.player2_name}` : fallback;
  }
  function publicMatchDate(iso) {
    if (!iso || !Number.isFinite(Date.parse(iso))) return "Sin programar";
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: tournamentTZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  }
  // Fecha y hora de cancha: Argentina, sin depender del huso del navegador.
  // Usamos formatToParts para evitar que cambie el formato según el dispositivo.
  function tournamentMatchDay(iso) {
    if (!iso || !Number.isFinite(Date.parse(iso))) return null;
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: tournamentTZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(iso))
        .map(({ type, value }) => [type, value]),
    );
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      label: `${parts.day}/${parts.month}/${parts.year}`,
      time: `${parts.hour}:${parts.minute}`,
    };
  }
  function publicScore(sets) {
    return Array.isArray(sets) && sets.length
      ? sets
          .map((s) => (Array.isArray(s) ? s.join("-") : ""))
          .filter(Boolean)
          .join(" · ")
      : "Pendiente";
  }
  function equalStanding(a, b) {
    return (
      a.points === b.points &&
      a.difference === b.difference &&
      a.setsFor === b.setsFor
    );
  }
  function standingsForGroup(group, groupMatches, twoGroupMode = false) {
    const rulesVersion = arguments[3] || 0;
    const officialOrder = arguments[4] || null;
    if (Number(rulesVersion) === 2026 && window.BPReglamento2026) {
      const ids = (group.pairs || []).map(p => p.id);
      const found = groupMatches.filter(m =>
        m.winner_pair_id && Array.isArray(m.sets) &&
        (m.resolved_pair1_id || m.pair1_id) &&
        (m.resolved_pair2_id || m.pair2_id)
      ).map(m => ({
        pair1: m.resolved_pair1_id || m.pair1_id,
        pair2: m.resolved_pair2_id || m.pair2_id,
        sets: m.sets
      }));
      const r = window.BPReglamento2026.standings(ids, found, officialOrder || []);
      const byId = new Map(group.pairs.map(p => [p.id, p]));
      const tieIds = new Set(r.unresolved.flat());
      const tableRows = r.rows.map((row, i) => {
        const display = row.setDifference > 0 ? "+" + row.setDifference : row.setDifference;
        const games = row.gameDifference > 0 ? "+" + row.gameDifference : row.gameDifference;
        return [
          tieIds.has(row.pairId) ? "=" : String(i + 1),
          publicPairName(byId.get(row.pairId)),
          row.played, row.won, row.lost, row.setsFor, row.setsAgainst,
          display, row.gamesFor, row.gamesAgainst, games, row.points
        ];
      });
      return {rows: tableRows, complete:r.complete, counted:found.length,
        total:groupMatches.length, tied:r.unresolved.length>0,
        decided:Array.isArray(officialOrder)&&officialOrder.length===ids.length};
    }
    const rows = (group.pairs || []).map((p) => ({
      id: p.id,
      name: publicPairName(p),
      played: 0,
      won: 0,
      lost: 0,
      setsFor: 0,
      setsAgainst: 0,
      difference: 0,
      points: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      gameDifference: 0,
    }));
    const byId = new Map(rows.map((row) => [row.id, row]));
    let counted = 0;
    for (const match of groupMatches) {
      const a = byId.get(match.resolved_pair1_id || match.pair1_id);
      const b = byId.get(match.resolved_pair2_id || match.pair2_id);
      const winner = byId.get(match.winner_pair_id);
      if (
        !a ||
        !b ||
        a.id === b.id ||
        !winner ||
        !Array.isArray(match.sets) ||
        !Number.isInteger(match.sets_pair1) ||
        !Number.isInteger(match.sets_pair2) ||
        ![a.id, b.id].includes(winner.id)
      )
        continue;
      counted++;
      a.played++;
      b.played++;
      a.setsFor += match.sets_pair1;
      a.setsAgainst += match.sets_pair2;
      b.setsFor += match.sets_pair2;
      b.setsAgainst += match.sets_pair1;
      const [g1, g2] = countNormalGames(
        match.sets,
        match.score_format || "legacy",
      );
      a.gamesFor += g1;
      a.gamesAgainst += g2;
      b.gamesFor += g2;
      b.gamesAgainst += g1;
      winner.won++;
      winner.points += 3;
      (winner.id === a.id ? b : a).lost++;
    }
    for (const row of rows) {
      row.difference = row.setsFor - row.setsAgainst;
      row.gameDifference = row.gamesFor - row.gamesAgainst;
    }
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.difference - a.difference ||
        b.setsFor - a.setsFor ||
        a.name.localeCompare(b.name, "es-AR"),
    );
    const full =
      counted === groupMatches.length &&
      groupMatches.length === (group.pairs.length === 3 ? 3 : 4);
    let decided = false;
    // En torneos de dos grupos, A3 (ganadores vs. ganadores) define
    // al primero y segundo del grupo de cuatro; A4 define tercero y cuarto.
    if (twoGroupMode && group.pairs.length === 4 && full) {
      const placeFrom = (number) => {
        const m = groupMatches.find(
          (x) => x.round_number === 2 && x.match_number === number,
        );
        if (
          !m ||
          !m.winner_pair_id ||
          !m.resolved_pair1_id ||
          !m.resolved_pair2_id
        )
          return null;
        const loser =
          m.winner_pair_id === m.resolved_pair1_id
            ? m.resolved_pair2_id
            : m.resolved_pair1_id;
        return [m.winner_pair_id, loser];
      };
      const pairFinal = placeFrom(1),
        consolation = placeFrom(2);
      const ids =
        pairFinal && consolation ? [...pairFinal, ...consolation] : [];
      if (
        ids.length === 4 &&
        new Set(ids).size === 4 &&
        ids.every((id) => byId.has(id))
      ) {
        const rank = new Map(ids.map((id, index) => [id, index]));
        rows.sort((a, b) => rank.get(a.id) - rank.get(b.id));
        decided = true;
      }
    }
    let tied = false;
    const tableRows = rows.map((row, i) => {
      const same = !decided && i > 0 && equalStanding(row, rows[i - 1]);
      const nextSame =
        !decided && i < rows.length - 1 && equalStanding(row, rows[i + 1]);
      tied ||= same || nextSame;
      const position = same || nextSame ? "=" : String(i + 1);
      return [
        position,
        row.name,
        row.played,
        row.won,
        row.lost,
        row.setsFor,
        row.setsAgainst,
        row.difference > 0 ? `+${row.difference}` : row.difference,
        row.gamesFor,
        row.gamesAgainst,
        row.gameDifference > 0 ? `+${row.gameDifference}` : row.gameDifference,
        row.points,
      ];
    });
    return {
      rows: tableRows,
      complete: full,
      counted,
      total: groupMatches.length,
      tied,
      decided,
    };
  }
  function detailBlock(t) {
    const details = make("details", "public-tournament-more");
    const summary = make(
      "summary",
      "public-tournament-more__summary",
      "Seguimiento · Resultados, posiciones",
    );
    const content = make("div", "public-tournament-more__body");
    const report = publicFollowupByTournament.get(t.id);
    if (!report || (!report.groups?.length && !report.group_matches?.length)) {
      content.append(
        make(
          "p",
          "public-tournament-data__note",
          "El seguimiento deportivo estará disponible cuando la organización publique los grupos y el fixture.",
        ),
      );
      details.append(summary, content);
      return details;
    }
    const groups = report.groups || [];
    const matches = report.group_matches || [];
    const pairs = new Map(
      groups.flatMap((g) => (g.pairs || []).map((p) => [p.id, p])),
    );
    const nameOf = (id, fallback) =>
      publicPairName(pairs.get(id), fallback || "A definir");
    const groupNumber = new Map(groups.map((g) => [g.id, g.number]));
    const matchesSection = make(
      "section",
      "public-tournament-data public-tournament-group-results",
    );
    matchesSection.append(make("h4", "", "Resultados de la fase de grupos"));
    const played = matches.filter(
      (m) => m.winner_pair_id && Array.isArray(m.sets),
    );
    if (played.length) {
      // Cada columna representa UNA fecha local de Argentina; los partidos
      // de ese día se ordenan por horario, sin agrupar por la fecha UTC.
      const byDay = new Map();
      for (const match of played) {
        const parts = tournamentMatchDay(match.scheduled_at);
        const key = parts?.key || "sin-fecha";
        if (!byDay.has(key))
          byDay.set(key, {
            key,
            label: parts?.label || "Fecha por confirmar",
            matches: [],
          });
        byDay
          .get(key)
          .matches.push({ match, time: parts?.time || "Sin horario" });
      }
      const dates = [...byDay.values()].sort((a, b) =>
        a.key === "sin-fecha"
          ? 1
          : b.key === "sin-fecha"
            ? -1
            : a.key.localeCompare(b.key),
      );
      const grid = make(
        "div",
        "public-tournament-days public-tournament-days--" +
          Math.min(3, dates.length),
      );
      for (const day of dates) {
        const column = make("section", "public-tournament-day");
        column.append(make("h5", "public-tournament-day__title", day.label));
        const ordered = day.matches.sort(
          (a, b) =>
            (Date.parse(a.match.scheduled_at) || 0) -
              (Date.parse(b.match.scheduled_at) || 0) ||
            Number(groupNumber.get(a.match.group_id) || 0) -
              Number(groupNumber.get(b.match.group_id) || 0) ||
            a.match.round_number - b.match.round_number ||
            a.match.match_number - b.match.match_number,
        );
        appendResults(
          column,
          ordered.map(({ match, time }) => ({
            stage: `Grupo ${publicGroupLetter(groupNumber.get(match.group_id))} · Partido ${match.match_number}`,
            date: time,
            pair1: nameOf(match.resolved_pair1_id || match.pair1_id),
            pair2: nameOf(match.resolved_pair2_id || match.pair2_id),
            score: publicScore(match.sets),
            winner: `Ganó ${nameOf(match.winner_pair_id)}`,
          })),
        );
        grid.append(column);
      }
      matchesSection.append(grid);
    } else {
      matchesSection.append(
        make(
          "p",
          "public-tournament-data__empty",
          "Todavía no hay marcadores confirmados.",
        ),
      );
    }
    const standings = make(
      "section",
      "public-tournament-data public-tournament-standings",
    );
    standings.append(make("h4", "", "Tablas de posiciones por grupo"));
    const standingsGrid = make("div", "public-tournament-standings-grid");
    for (const group of groups) {
      const groupMatches = matches.filter((m) => m.group_id === group.id);
      const officialGroupOrder = publicBracketByTournament.get(t.id)?.placements?.[
        publicGroupLetter(group.number)
      ] || null;
      const table = standingsForGroup(
        group, groupMatches, groups.length === 2, t.rules_version, officialGroupOrder,
      );
      const wrap = make("div", "public-tournament-standings-group");
      const pairCount = (group.pairs || []).length;
      wrap.append(
        make(
          "h5",
          "",
          `Grupo ${publicGroupLetter(group.number)} · ${pairCount} ${pairCount === 1 ? "pareja" : "parejas"}`,
        ),
      );
      const cols = [
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
      ];
      // Solo el texto de presentación cambia, nunca los valores, resultados o puntajes.
      const displayRows = table.rows.map((row) => [
        row[0],
        row[1].replace(" / ", " y "),
        ...row.slice(2),
      ]);
      wrap.append(buildTableBlock({ columns: cols, rows: displayRows }));
      let message;
      if (!table.complete) {
        message = `Tabla provisoria · ${table.counted} de ${table.total} partidos cargados.`;
      } else if (table.tied) {
        message =
          "Grupo completo. Las posiciones empatadas requieren definición.";
      } else if (pairCount === 3) {
        message = "Grupo completo. Clasifican las dos primeras parejas.";
      } else if (pairCount === 4 && groups.length === 2 && Number(t.rules_version) !== 2026) {
        message = "Grupo completo. Clasifican dos parejas.";
      } else if (pairCount === 4) {
        message = "Grupo completo. Clasifican las tres primeras parejas.";
      } else {
        message = "Grupo completo.";
      }
      wrap.append(make("p", "public-tournament-standings-status", message));
      if (table.tied)
        wrap.append(
          make(
            "p",
            "public-tournament-data__note",
            "Hay posiciones empatadas por puntos, diferencia de sets y sets a favor; requieren definición de la organización.",
          ),
        );
      standingsGrid.append(wrap);
    }
    standings.append(standingsGrid);
    if (groups.length) {
      const referencias = make("div", "public-tournament-standings-legend");
      const columnas = make("div", "public-tournament-standings-legend__grid");
      const motor = window.BPTournamentEngine;

      if (motor?.standingsLegendItems) {
        for (const [sigla, significado] of motor.standingsLegendItems) {
          const item = make("div", "public-tournament-standings-legend__item");

          item.append(
            make(
              "strong",
              "public-tournament-standings-legend__key",
              `${sigla}:`,
            ),
            make(
              "span",
              "public-tournament-standings-legend__value",
              significado,
            ),
          );

          columnas.append(item);
        }

        referencias.append(
          columnas,
          make(
            "p",
            "public-tournament-standings-legend__note",
            motor.standingsLegendNote,
          ),
        );
      } else {
        referencias.textContent = standingsLegend;
      }

      standings.append(referencias);
    }
    if (!groups.length)
      standings.append(
        make(
          "p",
          "public-tournament-data__empty",
          "Grupos pendientes de publicación.",
        ),
      );
    content.append(matchesSection, standings);

    details.append(summary, content);
    return details;
  }

  // El mismo trofeo vectorial usa color dorado o plateado según el puesto.
  function publicTrophyIcon(rank) {
    const ns = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(ns, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute(
      "class",
      "public-tournament-highlight__trophy public-tournament-highlight__trophy--" +
        rank,
    );
    for (const d of [
      "M8 21h8",
      "M12 17v4",
      "M7 4h10v7a5 5 0 0 1-10 0V4Z",
      "M7 6H4v3a3 3 0 0 0 3 3",
      "M17 6h3v3a3 3 0 0 1-3 3",
    ]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      icon.append(path);
    }
    return icon;
  }
  function knockoutBlock(t) {
    if (t.format !== "groups_knockout") return null;
    const details = make(
      "details",
      "public-tournament-more public-tournament-knockout",
    );
    const summary = make(
      "summary",
      "public-tournament-more__summary",
      "Eliminatorias",
    );
    const content = make("div", "public-tournament-more__body");
    const report = publicFollowupByTournament.get(t.id);
    const pairs = new Map(
      (report?.groups || []).flatMap((g) =>
        (g.pairs || []).map((p) => [p.id, p]),
      ),
    );
    const nameOf = (id, fallback) =>
      publicPairName(pairs.get(id), fallback || "A definir");
    const bracket = report.knockout;
    if (bracket && Array.isArray(bracket.matches) && bracket.matches.length) {
      const knockout = make("section", "public-tournament-data");
      knockout.append(make("h4", "", "Fase eliminatoria"));
      const byKey = new Map(
        bracket.matches.map((m) => [`${m.stage}:${m.slot}`, m]),
      );
      const winner = (stage, slot) =>
        byKey.get(`${stage}:${slot}`)?.winner_pair_id || null;
      const stages = [
        ["quarterfinal", "Cuartos de final"],
        ["semifinal", "Semifinales"],
        ["final", "Final"],
      ];
      for (const [stage, stageLabel] of stages) {
        const games = bracket.matches
          .filter((m) => m.stage === stage)
          .sort((a, b) => Number(a.slot) - Number(b.slot));
        if (!games.length) continue;
        const stageBox = make("div", "public-tournament-ko-stage");
        stageBox.append(make("h5", "", stageLabel));
        const entries = games.map((m) => {
          let p1 = null,
            p2 = null,
            fallback1 = "A definir",
            fallback2 = "A definir";
          if (stage === "quarterfinal") {
            [p1, p2] = bracket.quarterfinals?.[m.slot - 1] || [null, null];
          } else if (
            stage === "semifinal" &&
            Array.isArray(bracket.semifinals)
          ) {
            [p1, p2] = bracket.semifinals[m.slot - 1] || [null, null];
          } else if (stage === "semifinal" && m.slot === 1) {
            p1 = bracket.direct_semifinal_pair_id;
            p2 = winner("quarterfinal", 1);
            fallback2 = "Ganador de Cuartos 1";
          } else if (stage === "semifinal") {
            p1 = winner("quarterfinal", 2);
            p2 = winner("quarterfinal", 3);
            fallback1 = "Ganador de Cuartos 2";
            fallback2 = "Ganador de Cuartos 3";
          } else {
            p1 = winner("semifinal", 1);
            p2 = winner("semifinal", 2);
            fallback1 = "Ganador de Semifinal 1";
            fallback2 = "Ganador de Semifinal 2";
          }
          return {
            stage: `${stageLabel} · Partido ${m.slot}`,
            date: publicMatchDate(m.scheduled_at),
            pair1: nameOf(m.resolved_pair1_id || p1, fallback1),
            pair2: nameOf(m.resolved_pair2_id || p2, fallback2),
            score: publicScore(m.sets),
            winner: m.winner_pair_id
              ? `Ganó ${nameOf(m.winner_pair_id)}`
              : "Por disputarse",
          };
        });
        appendResults(stageBox, entries);
        knockout.append(stageBox);
      }
      const finalMatch = byKey.get("final:1");
      if (
        finalMatch?.winner_pair_id &&
        finalMatch?.resolved_pair1_id &&
        finalMatch?.resolved_pair2_id
      ) {
        const champion = nameOf(finalMatch.winner_pair_id);
        const secondId =
          finalMatch.winner_pair_id === finalMatch.resolved_pair1_id
            ? finalMatch.resolved_pair2_id
            : finalMatch.resolved_pair1_id;
        const podium = make("div", "public-tournament-highlight");
        for (const [rank, label, value] of [
          ["gold", "Campeones", champion],
          ["silver", "Subcampeones", nameOf(secondId)],
        ]) {
          const item = make(
            "div",
            "public-tournament-highlight__item public-tournament-highlight__item--" +
              rank,
          );
          const textBox = make("div", "public-tournament-highlight__text");
          textBox.append(
            make("span", "public-tournament-highlight__label", label),
            make("strong", "public-tournament-highlight__value", value),
          );
          item.append(publicTrophyIcon(rank), textBox);
          podium.append(item);
        }
        knockout.append(podium);
      }
      content.append(knockout);
    } else {
      const knockout = make("section", "public-tournament-data");
      knockout.append(
        make("h4", "", "Fase eliminatoria"),
        make(
          "p",
          "public-tournament-data__empty",
          "Los cruces aparecerán aquí cuando la organización prepare el cuadro final.",
        ),
      );
      content.append(knockout);
    }
    details.append(summary, content);
    return details;
  }

  // Se dibujan solo datos de la vista publica segura.
  function publicGroupLetter(groupNumber) {
    let n = Number(groupNumber);
    let letters = "";
    if (!Number.isSafeInteger(n) || n < 1) return String(groupNumber);
    while (n > 0) {
      n -= 1;
      letters = String.fromCharCode(65 + (n % 26)) + letters;
      n = Math.floor(n / 26);
    }
    return letters;
  }
  function publishedGroupsBlock(t) {
    if (t.format !== "groups_knockout") return null;
    const groups = publishedGroupsByTournament.get(t.id);
    if (!groups || !groups.length) return null;

    const details = make("details", "public-tournament-groups");
    const title = make(
      "summary",
      "public-tournament-groups__summary",
      `Ver grupos · ${groups.length} ${groups.length === 1 ? "grupo" : "grupos"}`,
    );
    const grid = make("div", "public-tournament-groups__grid");
    for (const group of groups) {
      const section = make("section", "public-tournament-group");
      section.append(
        make(
          "h4",
          "public-tournament-group__title",
          `Grupo ${publicGroupLetter(group.number)}`,
        ),
      );
      section.append(
        make(
          "p",
          "public-tournament-group__count",
          `${group.pairs.length} ${group.pairs.length === 1 ? "pareja" : "parejas"}`,
        ),
      );
      const members = make("ul", "public-tournament-group__pairs");
      for (const pair of group.pairs) {
        const entry = make("li", "public-tournament-group__pair");
        entry.append(
          make("span", "public-tournament-group__player", pair.player1_name),
          make("span", "public-tournament-group__player", pair.player2_name),
        );
        members.append(entry);
      }
      section.append(members);
      grid.append(section);
    }
    details.append(title, grid);
    return details;
  }
  async function fetchPublishedGroups(visibleTournaments) {
    const ids = visibleTournaments
      .filter((t) => t.format === "groups_knockout")
      .map((t) => t.id);
    const grouped = new Map();
    if (!ids.length) return grouped;

    // Consulta publica y paginada para no truncar la lista si crecen los torneos.
    const rows = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from("bp_public_tournament_groups")
        .select("tournament_id,group_number,player1_name,player2_name")
        .in("tournament_id", ids)
        .order("tournament_id", { ascending: true })
        .order("group_number", { ascending: true })
        .order("player1_name", { ascending: true })
        .order("player2_name", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    for (const row of rows) {
      if (!grouped.has(row.tournament_id))
        grouped.set(row.tournament_id, new Map());
      const byNumber = grouped.get(row.tournament_id);
      if (!byNumber.has(row.group_number)) {
        byNumber.set(row.group_number, { number: row.group_number, pairs: [] });
      }
      byNumber.get(row.group_number).pairs.push({
        player1_name: row.player1_name,
        player2_name: row.player2_name,
      });
    }
    const result = new Map();
    for (const [id, groups] of grouped) {
      result.set(
        id,
        Array.from(groups.values()).sort((a, b) => a.number - b.number),
      );
    }
    return result;
  }

  /* Parche 41: el navegador consulta solamente la vista autorizada.
     La vista comprueba publicacion de torneo, grupos y fixture en Supabase. */
  async function fetchPublishedFixture(visibleTournaments) {
    const ids = visibleTournaments
      .filter((t) => t.format === "groups_knockout")
      .map((t) => t.id);
    const matchesByTournament = new Map();
    if (!ids.length) return matchesByTournament;

    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from("bp_public_tournament_group_fixture")
        .select(
          "tournament_id,group_number,round_number,match_number,pair1_player1_name,pair1_player2_name,pair2_player1_name,pair2_player2_name,schedule_status,scheduled_at,scheduled_ends_at",
        )
        .in("tournament_id", ids)
        .order("tournament_id", { ascending: true })
        .order("round_number", { ascending: true })
        .order("group_number", { ascending: true })
        .order("match_number", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      for (const match of data || []) {
        if (!matchesByTournament.has(match.tournament_id)) {
          matchesByTournament.set(match.tournament_id, []);
        }
        matchesByTournament.get(match.tournament_id).push(match);
      }
      if (!data || data.length < pageSize) break;
    }
    return matchesByTournament;
  }

  // SQL 71: lectura pública de resultados y eliminatorias de torneos visibles.
  async function fetchPublishedFollowup(visibleTournaments) {
    const eligible = visibleTournaments.filter(
      (t) => t.format === "groups_knockout",
    );
    const byId = new Map();
    // Batches pequeñas: evitar un pedido simultáneo por cada torneo de un torneo largo.
    for (let i = 0; i < eligible.length; i += 4) {
      const batch = eligible.slice(i, i + 4);
      const values = await Promise.all(
        batch.map(async (t) => {
          const { data, error } = await supabaseClient.rpc(
            "bp_public_tournament_followup",
            { p_tournament_id: t.id },
          );
          if (error) throw error;
          return { id: t.id, data };
        }),
      );
      for (const v of values)
        if (v.data?.tournament_id === v.id) byId.set(v.id, v.data);
    }
    return byId;
  }

  // Liga: RPC sanitizada, solo torneos publicados, sin datos de contacto.
  async function fetchPublishedLeagues(tournaments) {
    const leagues = tournaments.filter((t) => t.format === "league");
    const reports = new Map();
    for (let i = 0; i < leagues.length; i += 4) {
      const batch = await Promise.all(
        leagues.slice(i, i + 4).map(async (t) => {
          const { data, error } = await supabaseClient.rpc(
            "bp_public_league_followup",
            {
              p_tournament_id: t.id,
            },
          );
          if (error) throw error;
          return { id: t.id, data };
        }),
      );
      for (const item of batch)
        if (item.data?.tournament_id === item.id)
          reports.set(item.id, item.data);
    }
    return reports;
  }

  // P89: fase final pública de Liga, siempre por RPC sanitaria.
  // Si el SQL89 aún no está instalado, este módulo solo queda en desarrollo;
  // nunca consulta directamente tablas administrativas.
  async function fetchPublishedLeagueFinals(tournaments) {
    const leagues = tournaments.filter((t) => t.format === "league");
    const reports = new Map();
    for (let i = 0; i < leagues.length; i += 4) {
      const batch = await Promise.all(
        leagues.slice(i, i + 4).map(async (t) => {
          const { data, error } = await supabaseClient.rpc(
            "bp_public_league_final89",
            { p_tournament_id: t.id },
          );
          if (error) throw error;
          return { id: t.id, data };
        }),
      );
      for (const item of batch)
        if (item.data?.tournament_id === item.id)
          reports.set(item.id, item.data);
    }
    return reports;
  }

  // Programación: todos los partidos del fixture publicado, sin marcadores.
  // Resultados oficiales y tablas quedan exclusivamente en "Seguimiento".
  function publishedFixtureBlock(t) {
    if (t.format !== "groups_knockout") return null;
    const matches = publishedFixtureByTournament.get(t.id);
    if (!matches?.length) return null;
    const details = make("details", "public-tournament-fixture");
    const summary = make(
      "summary",
      "public-tournament-fixture__summary",
      `Programación de partidos · ${matches.length} ${matches.length === 1 ? "partido" : "partidos"}`,
    );
    const body = make("div", "public-tournament-fixture__body");
    const byDay = new Map();
    for (const match of matches) {
      const date =
        match.schedule_status === "scheduled"
          ? tournamentMatchDay(match.scheduled_at)
          : null;
      const key = date?.key || "sin-programar";
      if (!byDay.has(key))
        byDay.set(key, {
          key,
          label: date?.label || "Sin programar",
          matches: [],
        });
      byDay.get(key).matches.push({ match, time: date?.time || null });
    }
    const days = [...byDay.values()].sort((a, b) =>
      a.key === "sin-programar"
        ? 1
        : b.key === "sin-programar"
          ? -1
          : a.key.localeCompare(b.key),
    );
    body.classList.add(
      "public-tournament-fixture__body--" + Math.min(3, days.length),
    );
    for (const day of days) {
      const section = make(
        "section",
        "public-tournament-fixture__calendar-block",
      );
      section.append(
        make("h4", "public-tournament-fixture__calendar-heading", day.label),
      );
      const dayList = make("div", "public-tournament-fixture__calendar-grid");
      day.matches.sort(
        (a, b) =>
          (a.time
            ? Date.parse(a.match.scheduled_at)
            : Number.POSITIVE_INFINITY) -
            (b.time
              ? Date.parse(b.match.scheduled_at)
              : Number.POSITIVE_INFINITY) ||
          Number(a.match.group_number) - Number(b.match.group_number) ||
          Number(a.match.round_number) - Number(b.match.round_number) ||
          Number(a.match.match_number) - Number(b.match.match_number),
      );
      for (const { match, time } of day.matches) {
        const article = make("article", "public-tournament-fixture__match");
        article.append(
          make(
            "p",
            "public-tournament-fixture__match-group",
            `Grupo ${publicGroupLetter(Number(match.group_number))}`,
          ),
        );
        article.append(
          make(
            "p",
            "public-tournament-fixture__date-meta",
            time
              ? `Hora: ${time}`
              : match.schedule_status === "postponed"
                ? "Postergado · A reprogramar"
                : "Fecha pendiente",
          ),
        );
        const players = make("div", "public-tournament-fixture__versus-row");
        const pair1 = make(
          "div",
          "public-tournament-fixture__pair public-tournament-fixture__pair--first",
        );
        const pair2 = make(
          "div",
          "public-tournament-fixture__pair public-tournament-fixture__pair--second",
        );
        for (const n of [match.pair1_player1_name, match.pair1_player2_name])
          if (n)
            pair1.append(make("span", "public-tournament-fixture__player", n));
        for (const n of [match.pair2_player1_name, match.pair2_player2_name])
          if (n)
            pair2.append(make("span", "public-tournament-fixture__player", n));
        players.append(
          pair1,
          make("span", "public-tournament-fixture__vs", "VS"),
          pair2,
        );
        article.append(players);
        dayList.append(article);
      }
      section.append(dayList);
      body.append(section);
    }
    details.append(summary, body);
    return details;
  }

  function cardFor(t) {
    const card = make("article", "public-tournament-card");
    const top = make("div", "public-tournament-card__top");
    top.append(
      make("span", "public-tournament-card__state", competitionState(t)),
    );
    top.append(
      make(
        "span",
        "public-tournament-card__format",
        labels[t.format] || t.format,
      ),
    );
    card.append(top, make("h3", "", t.name));
    card.append(
      make(
        "p",
        "public-tournament-card__category",
        t.bp_tournament_categories?.name || "Categoría por confirmar",
      ),
    );
    card.append(
      make(
        "p",
        "public-tournament-card__dates",
        t.format === "league"
          ? `Inicio estimado: ${dateText(t.starts_on)} · Sin fecha final prevista`
          : `Fechas previstas: ${dateText(t.starts_on)} — ${dateText(t.ends_on)}`,
      ),
    );
    if (!isFinished(t)) {
      const state = make(
        "p",
        "public-tournament-card__registration",
        registrationOpen(t)
          ? "Inscripciones abiertas"
          : "Inscripciones no disponibles",
      );
      card.append(state);
      if (registrationOpen(t)) {
        const button = make(
          "button",
          "button button--dark",
          "Inscribir pareja",
        );
        button.type = "button";
        button.addEventListener("click", () => open(t));
        card.append(button);
      }
    }
    const groupsBlock = publishedGroupsBlock(t);
    if (groupsBlock) card.append(groupsBlock);
    const fixtureBlock = publishedFixtureBlock(t);
    if (fixtureBlock) card.append(fixtureBlock);
    if (t.format === "league") {
      for (const block of window.BPLeaguePublic?.leagueBlocks(
        t,
        publicLeagueByTournament.get(t.id),
      ) || [])
        card.append(block);
      const finalBlock = window.BPLeagueFinalPublic89?.finalBlock(
        t, publicLeagueByTournament.get(t.id),
        publicLeagueFinalByTournament.get(t.id),
      );
      if (finalBlock) card.append(finalBlock);
    } else card.append(detailBlock(t));
    // El cuadro 2026 se publica COMPLETO junto al fixture, sin esperar resultados.
    // No reemplaza el reporte histórico de torneos anteriores.
    const publicBracket = window.BPBracket2026Public?.render(
      t,
      publishedGroupsByTournament.get(t.id),
      publishedFixtureByTournament.get(t.id),
      publicBracketByTournament.get(t.id),
    );
    if (publicBracket) card.append(publicBracket);
    // Reglamento 2026: el cuadro nuevo sustituye las eliminatorias heredadas.
    // Evita mostrar una sección «Eliminatorias» vacía y duplicada.
    if (Number(t.rules_version) !== 2026) {
      const eliminatorias = knockoutBlock(t);
      if (eliminatorias) card.append(eliminatorias);
    }
    return card;
  }
  // Parche 79: dos niveles de pestañas, sin repetir tarjetas de torneos.
  // Cada solapa tiene el nombre completo del torneo; el CSS fija dimensiones
  // iguales y desplazamiento horizontal para los nombres en móvil.
  function render() {
    const current = tournamentsCache.filter((t) => !isFinished(t));
    const finished = tournamentsCache.filter(isFinished);
    $("public-current-count").textContent = String(current.length);
    $("public-finished-count").textContent = String(finished.length);

    const selected = currentTab === "finished" ? finished : current;
    const selector = $("public-tournament-selector");
    selector.replaceChildren();
    list.replaceChildren();

    if (!selected.length) {
      selector.hidden = true;
      list.removeAttribute("aria-labelledby");
      list.append(
        make(
          "p",
          "public-tournaments__empty",
          currentTab === "finished"
            ? "Todavía no hay competencias finalizadas publicadas."
            : "Por ahora no hay competencias vigentes ni próximas.",
        ),
      );
      return;
    }
    selector.hidden = false;

    // La selección depende del ID real, nunca del índice ni del nombre.
    const chosen =
      selected.find((t) => t.id === selectedTournamentByTab[currentTab]) ||
      selected[0];
    const tabs = [];
    function selectTournament(tournament) {
      selectedTournamentByTab[currentTab] = tournament.id;
      for (const { button, tournament: item } of tabs) {
        const active = item.id === tournament.id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      }
      list.setAttribute(
        "aria-labelledby",
        `public-tournament-select-${tournament.id}`,
      );
      // Todas las secciones pertenecen al mismo ID del torneo seleccionado.
      list.replaceChildren(cardFor(tournament));
    }

    for (const tournament of selected) {
      const button = make("button", "public-tournament-selector__tab");
      button.type = "button";
      button.id = `public-tournament-select-${tournament.id}`;
      button.title = tournament.name;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", "public-tournaments-list");
      button.setAttribute("aria-label", tournament.name);
      button.append(
        make("span", "public-tournament-selector__name", tournament.name),
      );
      tabs.push({ button, tournament });
      selector.append(button);
      button.addEventListener("click", () => selectTournament(tournament));
      button.addEventListener("keydown", (event) => {
        const position = tabs.findIndex(
          (item) => item.tournament.id === tournament.id,
        );
        let next;
        switch (event.key) {
          case "ArrowRight":
            next = (position + 1) % tabs.length;
            break;
          case "ArrowLeft":
            next = (position - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = tabs.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        tabs[next].button.focus();
        selectTournament(tabs[next].tournament);
      });
    }
    selectTournament(chosen);
  }
  for (const tab of document.querySelectorAll("[data-tournament-tab]")) {
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tournamentTab;
      for (const button of document.querySelectorAll("[data-tournament-tab]")) {
        const active = button === tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      }
      $("public-tournament-list-wrap").setAttribute("aria-labelledby", tab.id);
      render();
    });
  }
  async function load() {
    status("Cargando torneos…");
    try {
      const { data, error } = await supabaseClient
        .from("bp_tournaments")
        .select(
          "id,name,format,rules_version,status,starts_on,ends_on,registration_closes_at,bp_tournament_categories(name)",
        )
        .eq("is_published", true)
        .order("starts_on", { ascending: true })
        .limit(50);
      if (error) throw error;
      tournamentsCache = data || [];
      publishedGroupsByTournament = new Map();
      publishedFixtureByTournament = new Map();
      publicFollowupByTournament = new Map();
      publicLeagueByTournament = new Map();
      publicLeagueFinalByTournament = new Map();
      publicBracketByTournament = new Map();
      const notices = [];
      try {
        publishedGroupsByTournament =
          await fetchPublishedGroups(tournamentsCache);
      } catch (groupsError) {
        console.error(
          "No se pudieron cargar los grupos publicados",
          groupsError,
        );
        notices.push("No se pudieron consultar los grupos publicados.");
      }
      try {
        publishedFixtureByTournament =
          await fetchPublishedFixture(tournamentsCache);
      } catch (fixtureError) {
        console.error("No se pudo cargar el fixture publicado", fixtureError);
        notices.push("No se pudieron consultar los fixtures publicados.");
      }
      try {
        publicFollowupByTournament =
          await fetchPublishedFollowup(tournamentsCache);
      } catch (followupError) {
        console.error(
          "No se pudo cargar el seguimiento deportivo",
          followupError,
        );
        notices.push("No se pudieron consultar los resultados y posiciones.");
      }
      try {
        publicLeagueByTournament =
          await fetchPublishedLeagues(tournamentsCache);
      } catch (error) {
        console.error("No se pudo consultar la Liga pública", error);
        notices.push(
          "No se pudieron cargar los partidos y posiciones de Liga.",
        );
      }
      try {
        publicLeagueFinalByTournament =
          await fetchPublishedLeagueFinals(tournamentsCache);
      } catch (error) {
        console.error("No se pudo consultar la fase final pública de Liga", error);
        notices.push("No se pudo cargar la fase final de Liga.");
      }
      // En instalaciones con SQL90, los resultados y nombres de las llaves
      // son sanitizados por la RPC. La vista estructural funciona igual sin ella.
      const withFixtures = tournamentsCache.filter(t =>
        t.format === "groups_knockout" && publishedFixtureByTournament.get(t.id)?.length
      );
      if (withFixtures.length) {
        try {
          for (const t of withFixtures) {
            const { data, error } = await supabaseClient.rpc("bp_tournament_bracket_report2026", {p_tournament_id:t.id});
            if (error && error.code !== "PGRST202" && error.code !== "42883") throw error;
            if (data?.matches?.length) publicBracketByTournament.set(t.id,data);
          }
        } catch (err) {
          console.error("No se pudieron leer los marcadores de eliminatorias 2026",err);
          notices.push("Los resultados de eliminatorias no están disponibles.");
        }
      }
      status(
        notices.length
          ? `${notices.join(" ")} Recargá la página para intentarlo nuevamente.`
          : "",
      );
      render();
    } catch (error) {
      console.error(error);
      status(
        "No se pudieron cargar los torneos. Intentá nuevamente más tarde.",
      );
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loading || !selection) return;
    if (!registrationOpen(selection)) {
      $("public-tournament-error").textContent =
        "Las inscripciones de este torneo están cerradas.";
      return;
    }
    const p1 = $("public-player1").value.trim().replace(/\s+/g, " ");
    const p2 = $("public-player2").value.trim().replace(/\s+/g, " ");
    const phone = $("public-phone").value.trim();
    const errorBox = $("public-tournament-error");
    errorBox.textContent = "";
    if (
      ![p1, p2].every(
        (p) => p.length >= 3 && p.length <= 100 && p.includes(" "),
      ) ||
      p1.toLowerCase() === p2.toLowerCase() ||
      !/^[+\d\s()\-]{6,30}$/.test(phone)
    ) {
      errorBox.textContent =
        "Ingresá nombre y apellido de ambos jugadores y un teléfono válido.";
      return;
    }
    const token = form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!token) {
      errorBox.textContent = "Completá la verificación de seguridad.";
      return;
    }
    loading = true;
    $("public-tournament-send").disabled = true;
    try {
      const { data, error } = await supabaseClient.functions.invoke(
        "register-tournament-pair",
        {
          body: {
            tournamentId: selection.id,
            player1_name: p1,
            player2_name: p2,
            contact_phone: phone,
            turnstileToken: token,
          },
        },
      );
      if (error || !data?.ok) {
        let message = data?.error;
        if (
          !message &&
          error?.context &&
          typeof error.context.json === "function"
        ) {
          try {
            message = (await error.context.json()).error;
          } catch (_e) {
            /* network error */
          }
        }
        throw new Error(
          message || "No se pudo enviar la inscripción. Intentá nuevamente.",
        );
      }
      closeAfterSuccess();
    } catch (error) {
      errorBox.textContent =
        error.message || "No se pudo completar la inscripción.";
      tokenReset();
    } finally {
      loading = false;
      $("public-tournament-send").disabled = false;
    }
  });
  function closeAfterSuccess() {
    loading = false;
    dialog.close();
    selection = null;
    form.reset();
    tokenReset();
    status(
      "Solicitud recibida correctamente. Quedó pendiente de aprobación del administrador.",
    );
  }
  load();
})();
