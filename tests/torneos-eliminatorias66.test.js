/* Boulevard Pádel · Parche 66: cuadro de 7, pase directo editable, sin programar canchas */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const motor = require("../js/torneos-motor.js");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

function seven() {
  return [
    {
      pairId: "a1",
      groupNumber: 1,
      rank: 1,
      points: 6,
      setDifference: 4,
      setsFor: 4,
    },
    {
      pairId: "a2",
      groupNumber: 1,
      rank: 2,
      points: 3,
      setDifference: 2,
      setsFor: 2,
    },
    {
      pairId: "b1",
      groupNumber: 2,
      rank: 1,
      points: 6,
      setDifference: 3,
      setsFor: 4,
    },
    {
      pairId: "b2",
      groupNumber: 2,
      rank: 2,
      points: 3,
      setDifference: 0,
      setsFor: 3,
    },
    {
      pairId: "c1",
      groupNumber: 3,
      rank: 1,
      points: 6,
      setDifference: 4,
      setsFor: 4,
    },
    {
      pairId: "c2",
      groupNumber: 3,
      rank: 2,
      points: 3,
      setDifference: 0,
      setsFor: 3,
    },
    {
      pairId: "c3",
      groupNumber: 3,
      rank: 3,
      points: 3,
      setDifference: -1,
      setsFor: 2,
    },
  ];
}
test("empate de mejores primeros no inventa pase automático", () => {
  const p = motor.recommendSevenBye(seven());
  assert.equal(p.recommendedId, null);
  assert.deepEqual(p.tiedFirstIds, ["a1", "c1"]);
});
test("si el primer puesto es único se recomienda automáticamente", () => {
  const rows = seven();
  rows[0].setDifference = 5;
  const p = motor.recommendSevenBye(rows);
  assert.equal(p.recommendedId, "a1");
});
test("Martín puede dar pase directo a cualquiera de las siete parejas", () => {
  for (const id of ["a1", "c1", "c3"]) {
    const plan = motor.planSevenKnockout(seven(), id);
    assert.equal(plan.directSemifinalPairId, id);
    assert.equal(plan.quarterfinals.length, 3);
    assert.equal(new Set([id, ...plan.quarterfinals.flat()]).size, 7);
    assert.equal(plan.semifinals.length, 2);
    assert.equal(plan.semifinals[0].pair1, id);
    assert.equal(plan.final.pair1.from, "SF1");
    assert.equal(plan.final.pair2.from, "SF2");
  }
});
test("propuesta inicial evita enfrentar parejas del mismo grupo cuando es posible", () => {
  const p = seven();
  const map = new Map(p.map((q) => [q.pairId, q.groupNumber]));
  const plan = motor.planSevenKnockout(p, "a1");
  assert.ok(plan.quarterfinals.every(([a, b]) => map.get(a) !== map.get(b)));
});
test("una pareja no clasificada nunca obtiene pase directo", () => {
  assert.throws(
    () => motor.planSevenKnockout(seven(), "excluido"),
    /clasificada/,
  );
  assert.throws(() => motor.recommendSevenBye(seven().slice(0, 6)), /siete/);
});
test("panel Admin enlazado y sin alterar las reservas", () => {
  const html = read("admin/index.html");
  const js = read("js/admin-eliminatorias.js");
  const css = read("css/admin-eliminatorias66.css");
  assert.match(html, /js\/admin-eliminatorias\.js/);
  assert.match(html, /css\/admin-eliminatorias66\.css/);
  assert.match(js, /bp_tournament_knockout_brackets/);
  assert.match(js, /recommendSevenBye/);
  assert.match(js, /planSevenKnockout/);
  assert.match(js, /result_revision/);
  assert.match(css, /repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.doesNotMatch(js, /from\(['"](?:reservations|blockouts)['"]\)/);
});
test("SQL restringe al Admin y valida 3 cuartos completos", () => {
  const s = read("sql/SQL_65_ELIMINATORIAS_7.sql");
  assert.match(s, /ENABLE ROW LEVEL SECURITY/);
  assert.match(s, /bp_tournament_is_admin/);
  assert.match(s, /v_matches <> 10 OR v_played <> 10 OR v_results <> 10/);
  assert.match(s, /v_unique<>7/);
  assert.match(s, /result_revision/);
  assert.doesNotMatch(
    s,
    /DELETE FROM public\.reservations|DELETE FROM public\.blockouts/,
  );
});
