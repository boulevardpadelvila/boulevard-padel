/* Boulevard Pádel · Parche 89 · fase final Liga aislada */
const test = require("node:test");
const assert = require("node:assert/strict");
const final89 = require("../js/torneos-liga-final89.js");
const league = require("../js/torneos-liga-motor.js");

const ids = ["primera", "segunda", "tercera", "cuarta", "quinta", "sexta"];
const report = (rows = ids.map(pairId => ({ pairId, tied: false })), complete = true) =>
  ({ rows, complete, played: complete ? 15 : 1, total: 15 });
const ready = () => final89.planFromStandings(report());

test("89: fase final no se habilita hasta terminar todos los partidos de Liga", () => {
  const result = final89.planFromStandings(report(undefined, false));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "regular_pending");
  assert.deepEqual(result.semifinals, []);
  assert.equal(result.final, null);
});

test("89: se requieren al menos cuatro parejas para definir el top 4", () => {
  const result = final89.planFromStandings(report(
    ids.slice(0, 3).map(pairId => ({ pairId, tied: false }))
  ));
  assert.equal(result.ready, false);
  assert.equal(result.reason, "minimum_four");
});

test("89: cruces EXACTOS 1º-3º y 2º-4º; final entre ganadores, sin tercer puesto", () => {
  const p = ready();
  assert.equal(p.ready, true);
  assert.deepEqual(p.qualifiers.map(x => [x.seed, x.pairId]), [
    [1, "primera"], [2, "segunda"], [3, "tercera"], [4, "cuarta"]
  ]);
  assert.deepEqual(p.semifinals.map(x => [x.code, x.pair1Id, x.pair2Id]), [
    ["SF1", "primera", "tercera"], ["SF2", "segunda", "cuarta"]
  ]);
  assert.deepEqual(p.final.pair1, { from: "SF1", outcome: "winner" });
  assert.deepEqual(p.final.pair2, { from: "SF2", outcome: "winner" });
  assert.deepEqual(p.semifinals.map(x => x.scoringMode), ["three_sets", "three_sets"]);
  assert.equal(p.final.scoringMode, "three_sets");
  assert.equal(p.semifinals.length, 2);
  assert.equal("thirdPlace" in p, false);
});

test("89: empate absoluto en el cuarto/quinto puesto bloquea semifinales", () => {
  const rows = report().rows;
  rows[3].tied = true;
  rows[4].tied = true;
  const p = final89.planFromStandings(report(rows));
  assert.equal(p.ready, false);
  assert.equal(p.reason, "ranking_tie");
  assert.deepEqual(p.semifinals, []);
});

test("89: empate absoluto interno al top 4 también bloquea los cruces", () => {
  const rows = report().rows;
  rows[0].tied = rows[1].tied = true;
  assert.equal(final89.planFromStandings(report(rows)).reason, "ranking_tie");
});

test("89: empate de puestos 5º y 6º no impide definir el top 4", () => {
  const rows = report().rows;
  rows[4].tied = rows[5].tied = true;
  assert.equal(final89.planFromStandings(report(rows)).ready, true);
});

test("89: tres sets NORMALES en semifinales; no se acepta súper tie-break 10-8", () => {
  const p = ready();
  const one = { SF1: { sets: [[6, 4], [4, 6], [6, 3]] } };
  assert.equal(final89.resolveFinalPhase(p, one).semifinals[0].winnerPairId, "primera");
  assert.throws(
    () => final89.resolveFinalPhase(p, { SF1: { sets: [[6, 4], [4, 6], [10, 8]] } }),
    /Set 3 inválido/
  );
  assert.throws(
    () => final89.resolveFinalPhase(p, { SF1: { sets: [[6, 4], [6, 3], [6, 2]] } }),
    /sets adicionales/
  );
});

test("89: la final no admite resultado hasta jugar ambas semifinales", () => {
  assert.throws(() => final89.resolveFinalPhase(ready(), {
    SF1: { sets: [[6, 2], [6, 3]] },
    F1: { pair1Id: "primera", pair2Id: "segunda", sets: [[6, 2], [6, 2]] }
  }), /antes de las dos semifinales/);
});

test("89: final de tres sets produce campeón y subcampeón, sin tercer partido", () => {
  const p = ready();
  const played = final89.resolveFinalPhase(p, {
    SF1: { sets: [[6, 2], [6, 3]] },
    SF2: { sets: [[2, 6], [4, 6]] },
    F1: {
      pair1Id: "primera", pair2Id: "cuarta",
      sets: [[6, 4], [4, 6], [6, 3]]
    }
  });
  assert.equal(played.complete, true);
  assert.equal(played.championPairId, "primera");
  assert.equal(played.runnerUpPairId, "cuarta");
  assert.equal(played.semifinals.length, 2);
  assert.equal("thirdPlace" in played, false);
});

test("89: se detecta una final obsoleta cuando cambia el ganador de semifinal", () => {
  const p = ready();
  assert.throws(() => final89.resolveFinalPhase(p, {
    SF1: { sets: [[2, 6], [3, 6]] }, // gana tercera en lugar de primera
    SF2: { sets: [[2, 6], [4, 6]] }, // gana cuarta
    F1: { pair1Id: "primera", pair2Id: "cuarta", sets: [[6, 4], [6, 3]] }
  }), /participantes.*cambiaron/);
});

test("89: resultado final requiere IDs de sus dos finalistas para evitar datos obsoletos", () => {
  const p = ready();
  assert.throws(() => final89.resolveFinalPhase(p, {
    SF1: { sets: [[6, 2], [6, 3]] },
    SF2: { sets: [[2, 6], [4, 6]] },
    F1: { sets: [[6, 4], [6, 3]] }
  }), /debe identificar sus participantes/);
});

test("89: el nuevo motor no altera el motor de puntos y desempates de fase regular", () => {
  const regular = league.standings(
    ["A", "B", "C", "D"],
    [
      { pair1_id: "A", pair2_id: "B", match_status: "played", sets: [[6, 3], [6, 4]] },
      { pair1_id: "A", pair2_id: "C", match_status: "pending" }
    ]
  );
  assert.equal(regular.complete, false);
  assert.equal(regular.rows.find(x => x.pairId === "A").points, 2);
  assert.equal(final89.planFinalPhase(["A", "B", "C", "D"], [
    { pair1_id: "A", pair2_id: "B", match_status: "played", sets: [[6, 3], [6, 4]] },
    { pair1_id: "A", pair2_id: "C", match_status: "pending" }
  ]).reason, "regular_pending");
});
