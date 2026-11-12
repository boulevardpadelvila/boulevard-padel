const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../js/torneos-motor.js");
const score = (...sets) => ({ sets });
test("solo grupos STB; todas las eliminatorias con tercer set normal", () => {
  for (const round of ["group"])
    assert.equal(m.scoringModeForStage(round), "super_tb");
  for (const round of ["preliminary", "round_of_16", "quarterfinal", "semifinal", "final"])
    assert.equal(m.scoringModeForStage(round), "three_sets");
  assert.throws(() => m.scoringModeForStage("unknown"), /Etapa desconocida/);
});
test("sets normales válidos: 6-4, 7-5, 7-6, e inversos", () => {
  for (const [a, b] of [
    [6, 0],
    [6, 4],
    [7, 5],
    [7, 6],
    [4, 6],
    [5, 7],
    [6, 7],
  ])
    assert.equal(m.validRegularSet(a, b), true);
  for (const [a, b] of [
    [5, 6],
    [6, 5],
    [6, 6],
    [7, 4],
    [8, 6],
    [1, 0],
  ])
    assert.equal(m.validRegularSet(a, b), false);
});
test("súper tie-break mínimo 10 y 2 de margen", () => {
  for (const [a, b] of [
    [10, 0],
    [10, 8],
    [11, 9],
    [12, 10],
    [8, 10],
  ])
    assert.equal(m.validSuperTieBreak(a, b), true);
  for (const [a, b] of [
    [10, 9],
    [9, 7],
    [12, 8],
    [8, 9],
    [10, 10],
  ])
    assert.equal(m.validSuperTieBreak(a, b), false);
});
test("grupos: con 1-1 exige súper tie-break, no tercer set normal", () => {
  assert.equal(
    m.evaluateSets(score([6, 4], [4, 6], [10, 8]), "super_tb").winnerSide,
    1,
  );
  assert.throws(
    () => m.evaluateSets(score([6, 4], [4, 6], [6, 2]), "super_tb"),
    /Súper tie-break/,
  );
  assert.throws(
    () => m.evaluateSets(score([6, 5], [6, 4]), "super_tb"),
    /Set 1/,
  );
});
test("cuartos, semifinal y final: tercer set normal (no super TB)", () => {
  assert.equal(
    m.evaluateSets(score([6, 4], [4, 6], [6, 2]), "three_sets").winnerSide,
    1,
  );
  assert.throws(
    () => m.evaluateSets(score([6, 4], [4, 6], [10, 8]), "three_sets"),
    /Set 3/,
  );
});
test("partido resuelto 2-0: rechaza el tercero; 1-1: tercero necesario", () => {
  assert.equal(m.evaluateSets(score([6, 4], [7, 5]), "super_tb").side1Sets, 2);
  assert.throws(
    () => m.evaluateSets(score([6, 4], [7, 5], [10, 8]), "super_tb"),
    /adicionales/,
  );
  assert.throws(
    () => m.evaluateSets(score([6, 4], [4, 6]), "super_tb"),
    /ganador/,
  );
});
test("posición: súper tie-break equivale a un set (no diez sets)", () => {
  const x = m.calculateGroupStandings(["a", "b", "c"], {
    A1: { ...score([6, 4], [4, 6], [10, 8]), format: "super_tb" },
    A2: { ...score([6, 4], [6, 4]), format: "super_tb" },
    A3: { ...score([6, 4], [6, 4]), format: "super_tb" },
  });
  assert.equal(x.complete, true);
  assert.equal(x.table[0].points, 4);
  assert.equal(x.table[0].setsFor, 4);
});
test("resultado legado continúa visible sin modificar sus datos", () => {
  assert.equal(m.evaluateSets(score([6, 5], [7, 6]), "legacy").winnerSide, 1);
  assert.throws(
    () => m.evaluateSets(score([6, 5], [7, 6]), "super_tb"),
    /Set 1/,
  );
});
