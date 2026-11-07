/* Boulevard Pádel — motor deportivo puro, sin acceso a Supabase.
 * Reglas confirmadas el 02/11/2026:
 * - 3 parejas: todos contra todos (3 encuentros), clasifican 2.
 * - 4 parejas: 2 cruces iniciales, ganadores vs ganadores y perdedores vs perdedores (4 encuentros), clasifican 3.
 * - Ganar 3 puntos, perder 0. Desempates: puntos, diferencia de sets, sets a favor.
 * No inventar un cuarto desempate: informar empates completos.
 * - Grupos y eliminatorias anteriores a cuartos: 1-1 -> super tie-break a 10 puntos.
 * - Cuartos, semifinal y final: 1-1 -> tercer set normal.
 * - Datos previos a esta regla se muestran en modo legacy; nunca se transforman solos.
 * Los W.O. no se resuelven aquí hasta definir la asignación de sets.
 */
(function (root, factory) {
  "use strict";
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.BPTournamentEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const REQUIRED_WINS = 2;
  const pointsPerWin = 3;

  function checkPairs(pairIds) {
    if (!Array.isArray(pairIds) || ![3, 4].includes(pairIds.length)) {
      throw new Error("Cada zona debe contener exactamente 3 o 4 parejas.");
    }
    if (
      pairIds.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(pairIds).size !== pairIds.length
    ) {
      throw new Error(
        "Las parejas deben tener identificadores distintos y válidos.",
      );
    }
  }

  // Misma regla que bp_tournament_draw_groups_auto en Supabase: se usa el
  // número de parejas APROBADAS, no el cupo anunciado al crear el torneo.
  function planGroupSizes(approvedCount) {
    if (
      !Number.isSafeInteger(approvedCount) ||
      approvedCount < 3 ||
      approvedCount > 256 ||
      approvedCount === 5
    ) {
      throw new Error(
        "No se pueden formar zonas de 3 o 4 con esa cantidad de parejas aprobadas.",
      );
    }
    const count = Math.floor(approvedCount / 3);
    const numberOfFours = approvedCount - count * 3;
    return Array.from({ length: count }, (_, i) => (i < numberOfFours ? 4 : 3));
  }

  // Cada encuentro tiene una clave estable dentro de su grupo y dos participantes.
  // Los participantes pueden ser IDs de parejas o referencias al resultado de otro partido.
  function buildGroupFixture(pairIds) {
    checkPairs(pairIds);
    const [a, b, c, d] = pairIds;
    if (!d) {
      return [
        { code: "A1", round: 1, pair1: a, pair2: b },
        { code: "A2", round: 2, pair1: a, pair2: c },
        { code: "A3", round: 3, pair1: b, pair2: c },
      ];
    }
    return [
      { code: "A1", round: 1, pair1: a, pair2: b },
      { code: "A2", round: 1, pair1: c, pair2: d },
      {
        code: "A3",
        round: 2,
        pair1: { from: "A1", outcome: "winner" },
        pair2: { from: "A2", outcome: "winner" },
      },
      {
        code: "A4",
        round: 2,
        pair1: { from: "A1", outcome: "loser" },
        pair2: { from: "A2", outcome: "loser" },
      },
    ];
  }

  // Modos explícitos: super_tb (grupos y eliminatorias previas a cuartos),
  // three_sets (cuartos, semifinal, final) y legacy (solo lectura de registros previos).
  function scoringModeForStage(stage) {
    const key = String(stage || "")
      .toLowerCase()
      .replace(/[-\s]/g, "_");
    if (
      [
        "group",
        "groups",
        "preliminary",
        "play_in",
        "round_of_64",
        "round_of_32",
        "round_of_16",
        "round_of_8_preliminary",
      ].includes(key)
    )
      return "super_tb";
    if (
      [
        "quarterfinal",
        "quarterfinals",
        "semifinal",
        "semifinals",
        "final",
      ].includes(key)
    )
      return "three_sets";
    throw new Error(
      "Etapa desconocida: se debe indicar el formato antes de cargar el resultado.",
    );
  }
  function validRegularSet(a, b) {
    if (![a, b].every((n) => Number.isSafeInteger(n) && n >= 0)) return false;
    const high = Math.max(a, b),
      low = Math.min(a, b);
    return (high === 6 && low <= 4) || (high === 7 && (low === 5 || low === 6));
  }
  function validSuperTieBreak(a, b) {
    if (![a, b].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 99))
      return false;
    const high = Math.max(a, b),
      low = Math.min(a, b);
    return (high === 10 && low <= 8) || (high > 10 && high - low === 2);
  }
  function evaluateSets(result, mode = "legacy") {
    if (!["legacy", "super_tb", "three_sets"].includes(mode)) {
      throw new Error("Formato de puntuación desconocido.");
    }
    if (
      !result ||
      !Array.isArray(result.sets) ||
      ![2, 3].includes(result.sets.length)
    ) {
      throw new Error("Ingresá 2 o 3 sets para un partido al mejor de tres.");
    }
    let side1 = 0,
      side2 = 0;
    for (let i = 0; i < result.sets.length; i++) {
      const set = result.sets[i];
      if (
        !Array.isArray(set) ||
        set.length !== 2 ||
        set.some(
          (games) => !Number.isSafeInteger(games) || games < 0 || games > 99,
        ) ||
        set[0] === set[1]
      ) {
        throw new Error(
          `El set ${i + 1} tiene valores inválidos o está empatado.`,
        );
      }
      if (side1 === REQUIRED_WINS || side2 === REQUIRED_WINS) {
        throw new Error(
          "No puede haber sets adicionales después de definir el partido.",
        );
      }
      if (mode !== "legacy") {
        const valid =
          mode === "super_tb" && i === 2
            ? validSuperTieBreak(set[0], set[1])
            : validRegularSet(set[0], set[1]);
        if (!valid)
          throw new Error(
            i === 2 && mode === "super_tb"
              ? "Súper tie-break inválido: se gana desde 10 puntos, con 2 de ventaja."
              : `Set ${i + 1} inválido: solo 6-0 a 6-4, 7-5 o 7-6 (o sus inversos).`,
          );
      }
      if (set[0] > set[1]) side1++;
      else side2++;
    }
    if (side1 !== REQUIRED_WINS && side2 !== REQUIRED_WINS) {
      throw new Error("El partido no tiene un ganador con dos sets.");
    }
    return {
      side1Sets: side1,
      side2Sets: side2,
      winnerSide: side1 > side2 ? 1 : 2,
    };
  }

  function matchWithParticipants(match, confirmedResults, byCode) {
    if (!match || typeof match.code !== "string")
      throw new Error("Partido inválido.");
    function resolve(slot) {
      if (typeof slot === "string") return slot;
      if (
        !slot ||
        typeof slot.from !== "string" ||
        !["winner", "loser"].includes(slot.outcome)
      ) {
        throw new Error("Dependencia de partido inválida.");
      }
      const source = byCode.get(slot.from);
      if (!source || source.code === match.code)
        throw new Error("Referencia de partido inválida.");
      const previous = matchWithParticipants(source, confirmedResults, byCode);
      const previousResult = confirmedResults[slot.from];
      if (!previousResult || !previous.pair1 || !previous.pair2) return null;
      const data = evaluateSets(
        previousResult,
        previousResult.format || "legacy",
      );
      const winner = data.winnerSide === 1 ? previous.pair1 : previous.pair2;
      const loser = data.winnerSide === 1 ? previous.pair2 : previous.pair1;
      return slot.outcome === "winner" ? winner : loser;
    }
    return {
      ...match,
      pair1: resolve(match.pair1),
      pair2: resolve(match.pair2),
    };
  }

  function resolveGroupFixture(fixture, results = {}) {
    if (!Array.isArray(fixture)) throw new Error("Fixture inválido.");
    const byCode = new Map(fixture.map((match) => [match.code, match]));
    if (byCode.size !== fixture.length)
      throw new Error("Hay partidos con claves repetidas.");
    return fixture.map((match) =>
      matchWithParticipants(match, results, byCode),
    );
  }

  function compareStats(a, b) {
    return (
      b.points - a.points ||
      b.setDifference - a.setDifference ||
      b.setsFor - a.setsFor
    );
  }
  function equalStats(a, b) {
    return (
      a.points === b.points &&
      a.setDifference === b.setDifference &&
      a.setsFor === b.setsFor
    );
  }

  function calculateGroupStandings(pairIds, results = {}) {
    checkPairs(pairIds);
    const fixture = buildGroupFixture(pairIds);
    const rows = new Map(
      pairIds.map((id) => [
        id,
        {
          pairId: id,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
          setsFor: 0,
          setsAgainst: 0,
          setDifference: 0,
        },
      ]),
    );
    let playedMatches = 0;
    const resolved = resolveGroupFixture(fixture, results);
    const order = fixture.map((match) => match.code);
    for (const code of order) {
      if (results[code] == null) continue;
      const match = resolved.find((item) => item.code === code);
      if (
        !match?.pair1 ||
        !match?.pair2 ||
        !rows.has(match.pair1) ||
        !rows.has(match.pair2) ||
        match.pair1 === match.pair2
      ) {
        throw new Error(
          `El partido ${code} todavía no tiene dos rivales definidos.`,
        );
      }
      const outcome = evaluateSets(
        results[code],
        results[code].format || "legacy",
      );
      const r1 = rows.get(match.pair1),
        r2 = rows.get(match.pair2);
      r1.played++;
      r2.played++;
      r1.setsFor += outcome.side1Sets;
      r1.setsAgainst += outcome.side2Sets;
      r2.setsFor += outcome.side2Sets;
      r2.setsAgainst += outcome.side1Sets;
      const winner = outcome.winnerSide === 1 ? r1 : r2;
      const loser = outcome.winnerSide === 1 ? r2 : r1;
      winner.won++;
      winner.points += pointsPerWin;
      loser.lost++;
      playedMatches++;
    }
    const table = [...rows.values()];
    for (const row of table) row.setDifference = row.setsFor - row.setsAgainst;
    table.sort(compareStats); // mantiene el orden de entrada SOLO para visualizar empate total.
    const fullTies = [];
    for (let i = 1; i < table.length; i++) {
      if (equalStats(table[i - 1], table[i]))
        fullTies.push([table[i - 1].pairId, table[i].pairId]);
    }
    const qualifyingPlaces = pairIds.length === 3 ? 2 : 3;
    const complete = playedMatches === fixture.length;
    const boundaryTie =
      complete &&
      equalStats(table[qualifyingPlaces - 1], table[qualifyingPlaces]);
    return {
      table,
      qualifyingPlaces,
      playedMatches,
      totalMatches: fixture.length,
      complete,
      fullTies,
      boundaryTie,
      qualificationReady: complete && !boundaryTie,
      seedingReady: complete && fullTies.length === 0,
      qualifiedPairIds:
        complete && !boundaryTie
          ? table.slice(0, qualifyingPlaces).map((row) => row.pairId)
          : [],
      // Orden y semillas quedan pendientes cuando persiste cualquier empate absoluto.
    };
  }

  // Parche 66: siete clasificados (dos zonas de 3 + una de 4).
  // El pase directo se recomienda exclusivamente a un PRIMERO de grupo.
  // Ante empate absoluto entre primeros, la decisión queda en manos del Admin.
  function recommendSevenBye(qualified) {
    if (
      !Array.isArray(qualified) ||
      qualified.length !== 7 ||
      new Set(qualified.map((q) => q.pairId)).size !== 7 ||
      qualified.some(
        (q) =>
          !q.pairId ||
          !Number.isInteger(q.groupNumber) ||
          !Number.isInteger(q.rank) ||
          ![q.points, q.setDifference, q.setsFor].every(Number.isFinite),
      )
    ) {
      throw new Error(
        "Se requieren siete clasificados con posiciones oficiales.",
      );
    }
    const leaders = qualified
      .filter((q) => q.rank === 1)
      .sort((a, b) => compareStats(a, b) || a.groupNumber - b.groupNumber);
    if (
      leaders.length !== 3 ||
      new Set(leaders.map((q) => q.groupNumber)).size !== 3
    ) {
      throw new Error("Faltan los tres primeros de grupo.");
    }
    const tied = leaders.filter((q) => compareStats(q, leaders[0]) === 0);
    return {
      recommendedId: tied.length === 1 ? tied[0].pairId : null,
      tiedFirstIds: tied.map((q) => q.pairId),
      unique: tied.length === 1,
    };
  }

  // No hace desempates deportivos implícitos. groupNumber sólo ordena las
  // propuestas de cruce cuando hay semillas con estadísticas equivalentes.
  // Minimiza cruces entre integrantes del mismo grupo y enfrenta semillas
  // altas con bajas cuando hay una combinación que lo permite.
  function planSevenKnockout(qualified, directId) {
    recommendSevenBye(qualified);
    if (!qualified.some((q) => q.pairId === directId)) {
      throw new Error("Elegí una pareja clasificada para el pase directo.");
    }
    const participants = qualified
      .filter((q) => q.pairId !== directId)
      .slice()
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          compareStats(a, b) ||
          a.groupNumber - b.groupNumber ||
          String(a.pairId).localeCompare(String(b.pairId)),
      );
    const index = new Map(participants.map((p, i) => [p.pairId, i]));
    let best = null;
    let bestScore = Infinity;
    function visit(remaining, rounds) {
      if (remaining.length === 0) {
        const score = rounds.reduce(
          (sum, [a, b]) =>
            sum +
            (a.groupNumber === b.groupNumber ? 10000 : 0) +
            Math.abs(index.get(a.pairId) + index.get(b.pairId) - 5) * 10,
          0,
        );
        const key = rounds
          .map(([a, b]) => [a.pairId, b.pairId].sort().join(":"))
          .sort()
          .join("|");
        if (
          score < bestScore ||
          (score === bestScore && key < (best?.key || "\uffff"))
        ) {
          bestScore = score;
          best = { key, rounds: rounds.map(([a, b]) => [a.pairId, b.pairId]) };
        }
        return;
      }
      const first = remaining[0];
      for (let i = 1; i < remaining.length; i++) {
        visit(
          remaining.filter((_, j) => j !== 0 && j !== i),
          [...rounds, [first, remaining[i]]],
        );
      }
    }
    visit(participants, []);
    const quarters = best.rounds.sort(
      (a, b) =>
        Math.min(index.get(a[0]), index.get(a[1])) -
        Math.min(index.get(b[0]), index.get(b[1])),
    );
    return {
      directSemifinalPairId: directId,
      quarterfinals: quarters,
      semifinals: [
        { pair1: directId, pair2: { from: "QF1", outcome: "winner" } },
        {
          pair1: { from: "QF2", outcome: "winner" },
          pair2: { from: "QF3", outcome: "winner" },
        },
      ],
      final: {
        pair1: { from: "SF1", outcome: "winner" },
        pair2: { from: "SF2", outcome: "winner" },
      },
    };
  }

  return Object.freeze({
    planGroupSizes,
    buildGroupFixture,
    evaluateSets,
    resolveGroupFixture,
    calculateGroupStandings,
    compareStats,
    scoringModeForStage,
    validRegularSet,
    validSuperTieBreak,
    recommendSevenBye,
    planSevenKnockout,
  });
});
