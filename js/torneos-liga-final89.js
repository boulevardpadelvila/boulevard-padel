/* Boulevard Pádel · Liga: fase final de cuatro (motor puro, Parche 89).
 * Sin acceso a Supabase ni al DOM.
 * Fase regular: clasificación por los cinco desempates existentes.
 * Semifinales: 1º vs 3º y 2º vs 4º.
 * Final: ganadores. Tercer puesto: NO se disputa.
 * Semifinales y final: al mejor de tres sets NORMALES, sin súper tie-break.
 * No se proclama campeón por ser primero de la Liga.
 */
(function (root, factory) {
  "use strict";
  const classic =
    typeof module === "object" && module.exports
      ? require("./torneos-motor.js")
      : root.BPTournamentEngine;
  const league =
    typeof module === "object" && module.exports
      ? require("./torneos-liga-motor.js")
      : root.BPLeagueEngine;
  const api = factory(classic, league);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BPLeagueFinal89 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (classic, league) {
  "use strict";
  if (!classic || typeof classic.evaluateSets !== "function" ||
      !league || typeof league.standings !== "function")
    throw new Error("Faltan los motores deportivos de Boulevard Pádel.");

  const pending = (reason) => Object.freeze({
    ready: false, reason, qualifiers: [], semifinals: [], final: null
  });
  const ref = (code) => Object.freeze({ from: code, outcome: "winner" });

  function planFromStandings(report) {
    if (!report || !Array.isArray(report.rows))
      throw new Error("La tabla general de Liga no es válida.");
    if (report.rows.length < 4) return pending("minimum_four");
    if (!report.complete) return pending("regular_pending");

    const firstFour = report.rows.slice(0, 4);
    if (firstFour.some((row) => row.tied))
      return pending("ranking_tie");
    const ids = firstFour.map((row) => row.pairId);
    if (ids.some((id) => typeof id !== "string" || !id.trim()) ||
        new Set(ids).size !== 4)
      throw new Error("La clasificación de Liga contiene parejas inválidas.");

    const qualifiers = ids.map((pairId, i) =>
      Object.freeze({ seed: i + 1, pairId })
    );
    const semifinals = [
      Object.freeze({
        code: "SF1", stage: "semifinal", pair1Id: ids[0],
        pair2Id: ids[2], seeds: [1, 3], scoringMode: "three_sets"
      }),
      Object.freeze({
        code: "SF2", stage: "semifinal", pair1Id: ids[1],
        pair2Id: ids[3], seeds: [2, 4], scoringMode: "three_sets"
      })
    ];
    return Object.freeze({
      ready: true, reason: null, qualifiers, semifinals,
      final: Object.freeze({
        code: "F1", stage: "final", pair1: ref("SF1"),
        pair2: ref("SF2"), scoringMode: "three_sets"
      })
    });
  }

  function planFinalPhase(pairIds, regularMatches) {
    return planFromStandings(league.standings(pairIds, regularMatches));
  }

  // Resuelve resultados registrados sin modificar la fase regular.
  // Para impedir que una final vieja siga vigente tras corregir una
  // semifinal, el resultado de final DEBE identificar ambos participantes.
  function resolveFinalPhase(plan, recorded = {}) {
    if (!plan || plan.ready !== true ||
        !Array.isArray(plan.semifinals) || plan.semifinals.length !== 2)
      throw new Error("La fase final todavía no está habilitada.");
    if (!recorded || typeof recorded !== "object" || Array.isArray(recorded))
      throw new Error("Resultados de fase final inválidos.");

    function play(code, pair1Id, pair2Id) {
      const result = recorded[code];
      const base = { code, pair1Id, pair2Id, winnerPairId: null, loserPairId: null };
      if (result == null) return base;
      if (!Array.isArray(result.sets))
        throw new Error("Resultado de " + code + " inválido.");
      if (result.pair1Id != null && result.pair1Id !== pair1Id ||
          result.pair2Id != null && result.pair2Id !== pair2Id)
        throw new Error("Los participantes de " + code + " cambiaron: revisá el resultado.");
      if (code === "F1" && (!result.pair1Id || !result.pair2Id))
        throw new Error("La final debe identificar sus participantes para validar correcciones.");
      const score = classic.evaluateSets({ sets: result.sets }, "three_sets");
      return {
        ...base,
        winnerPairId: score.winnerSide === 1 ? pair1Id : pair2Id,
        loserPairId: score.winnerSide === 1 ? pair2Id : pair1Id,
        sets: result.sets.map((s) => s.slice())
      };
    }

    const semifinals = plan.semifinals.map((m) => play(m.code, m.pair1Id, m.pair2Id));
    const [sf1, sf2] = semifinals;
    const finalistsReady = Boolean(sf1.winnerPairId && sf2.winnerPairId);
    if (!finalistsReady && recorded.F1 != null)
      throw new Error("No se puede cargar la final antes de las dos semifinales.");
    const final = finalistsReady
      ? play("F1", sf1.winnerPairId, sf2.winnerPairId)
      : { code: "F1", pair1Id: sf1.winnerPairId, pair2Id: sf2.winnerPairId,
          winnerPairId: null, loserPairId: null };
    return {
      semifinals, final,
      championPairId: final.winnerPairId,
      runnerUpPairId: final.loserPairId,
      complete: Boolean(final.winnerPairId)
    };
  }

  return Object.freeze({ planFromStandings, planFinalPhase, resolveFinalPhase });
});
