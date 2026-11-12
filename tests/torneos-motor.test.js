const test = require("node:test");
const assert = require("node:assert/strict");
const {
  planGroupSizes,
  buildGroupFixture,
  evaluateSets,
  resolveGroupFixture,
  calculateGroupStandings,
} = require("../js/torneos-motor.js");
const r20 = {
  sets: [
    [6, 4],
    [6, 3],
  ],
};
const r21 = {
  sets: [
    [6, 3],
    [4, 6],
    [6, 2],
  ],
};
const r02 = {
  sets: [
    [2, 6],
    [4, 6],
  ],
};
const r12 = {
  sets: [
    [6, 4],
    [2, 6],
    [3, 6],
  ],
};

test("tres parejas: todos contra todos y solo dos clasifican", () => {
  const fixture = buildGroupFixture(["a", "b", "c"]);
  assert.deepEqual(
    fixture.map((m) => [m.pair1, m.pair2]),
    [
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
    ],
  );
  const t = calculateGroupStandings(["a", "b", "c"], {
    A1: r20,
    A2: r20,
    A3: r20,
  });
  assert.equal(t.complete, true);
  assert.equal(t.totalMatches, 3);
  assert.equal(t.qualifyingPlaces, 2);
  assert.deepEqual(
    t.table.map((x) => x.points),
    [4, 2, 0],
  );
  assert.deepEqual(t.qualifiedPairIds, ["a", "b"]);
});

test("cuatro parejas: dos cruces, ganadores y perdedores dependientes", () => {
  const fixture = buildGroupFixture(["p1", "p2", "p3", "p4"]);
  assert.equal(fixture.length, 4);
  assert.equal(resolveGroupFixture(fixture)[2].pair1, null);
  const matches = resolveGroupFixture(fixture, { A1: r20, A2: r21 });
  assert.equal(matches[2].pair1, "p1");
  assert.equal(matches[2].pair2, "p3");
  assert.equal(matches[3].pair1, "p2");
  assert.equal(matches[3].pair2, "p4");
});

test("grupo de 4: 4,2,2,0 con desempate por games", () => {
  // A1 P1 gana P2 2-0, A2 P3 gana P4 2-1,
  // A3 P3 gana P1 2-0, A4 P4 gana P2 2-1.
  const result = calculateGroupStandings(["p1", "p2", "p3", "p4"], {
    A1: r20,
    A2: r21,
    A3: r02,
    A4: r12,
  });
  // A2 arriba es P3 gana 2-1; A4 P4 gana P2 2-1.
  assert.equal(result.complete, true);
  assert.deepEqual(
    result.table.map((x) => x.pairId),
    ["p3", "p4", "p1", "p2"],
  );
  assert.deepEqual(
    result.table.map((x) => x.points),
    [4, 2, 2, 0],
  );
  assert.deepEqual(
    result.table.map((x) => x.setDifference),
    [3, 0, 0, -3],
  );
  assert.equal(result.table[1].setsFor, 3);
  assert.equal(result.table[2].setsFor, 2);
  assert.equal(result.qualifyingPlaces, 3);
  assert.deepEqual(result.qualifiedPairIds, ["p3", "p4", "p1"]);
});

test("sin inventar cuarto desempate: un empate absoluto bloquea orden de semillas", () => {
  // Grupo de 3: un ciclo con tres triunfos 2-0 genera triple empate.
  const t = calculateGroupStandings(["a", "b", "c"], {
    A1: {sets:[[6,0],[6,0]]},
    A2: {sets:[[0,6],[0,6]]},
    A3: {sets:[[6,0],[6,0]]},
  });
  assert.equal(t.complete, true);
  assert.equal(t.boundaryTie, true);
  assert.equal(t.qualificationReady, false);
  assert.equal(t.seedingReady, false);
  assert.deepEqual(t.qualifiedPairIds, []);
});

test("incompleto: no hay clasificados oficiales", () => {
  const t = calculateGroupStandings(["a", "b", "c"], { A1: r20 });
  assert.equal(t.complete, false);
  assert.deepEqual(t.qualifiedPairIds, []);
});

test("solo resultados al mejor de tres: rechaza sets faltantes y adicionales", () => {
  assert.throws(
    () =>
      evaluateSets({
        sets: [
          [6, 4],
          [6, 3],
          [6, 4],
        ],
      }),
    /adicionales/,
  );
  assert.throws(
    () =>
      evaluateSets({
        sets: [
          [6, 4],
          [3, 6],
        ],
      }),
    /ganador/,
  );
  assert.throws(
    () =>
      evaluateSets({
        sets: [
          [6, 6],
          [6, 4],
        ],
      }),
    /inválidos/,
  );
});

test("no recibe resultados de cruces A3 o A4 si sus rivales aún no están definidos", () => {
  assert.throws(
    () => calculateGroupStandings(["a", "b", "c", "d"], { A3: r20 }),
    /todavía no tiene/,
  );
});

test("los grupos se calculan por cantidad APROBADA, independientemente del cupo", () => {
  assert.deepEqual(planGroupSizes(8), [4, 4]);
  assert.deepEqual(planGroupSizes(10), [4, 3, 3]);
  assert.deepEqual(planGroupSizes(12), [3, 3, 3, 3]);
  assert.deepEqual(planGroupSizes(14), [4, 4, 3, 3]);
  assert.deepEqual(planGroupSizes(16), [4, 3, 3, 3, 3]);
  assert.throws(() => planGroupSizes(5), /No se pueden/);
});
