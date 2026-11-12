/* Boulevard Pádel · Parche 80 · Dos grupos de 3/4, cuatro semifinalistas */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const motor = require("../js/torneos-motor.js");
const read = (file) =>
  fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const win1 = {
  sets: [
    [6, 4],
    [6, 4],
  ],
};
const win2 = {
  sets: [
    [4, 6],
    [4, 6],
  ],
};
const win3 = {
  sets: [
    [6, 3],
    [3, 6],
    [6, 4],
  ],
};

test("Legado A3/A4 se conserva, pero la clasificación nueva usa la tabla 2-0", () => {
  const ids = ["a", "b", "c", "d"];
  const results = { A1: win1, A2: win1, A3: win2, A4: win2 };
  // A1 gana a, A2 gana c. A3 gana c y a queda segundo.
  // A4 gana d ante b; d y a tienen tres puntos, pero d NO clasifica.
  assert.deepEqual(motor.decisiveFourPlacings(ids, results), [
    "c",
    "a",
    "d",
    "b",
  ]);
  const points = motor.calculateGroupStandings(ids, results);
  assert.equal(points.complete, true);
  assert.ok(points.table.filter((p) => p.points === 2).length >= 2);
});
test("Grupo de cuatro incompleto o cruce inválido NO habilita puestos", () => {
  assert.throws(
    () =>
      motor.decisiveFourPlacings(["a", "b", "c", "d"], {
        A1: win1,
        A2: win1,
        A3: win2,
      }),
    /Completá/,
  );
  assert.throws(
    () => motor.decisiveFourPlacings(["a", "b", "c"], { A1: win1 }),
    /cuatro parejas/,
  );
});
test("Grupo de 3: todos contra todos, pasan los primeros dos sin empate inventado", () => {
  const res = motor.calculateGroupStandings(["e", "f", "g"], {
    A1: win1,
    A2: win1,
    A3: win1,
  });
  assert.equal(res.complete, true);
  assert.equal(res.seedingReady, true);
  assert.deepEqual(res.qualifiedPairIds, ["e", "f"]);
});
test("Cuatro clasificadas: 1A-vs-2B, 1B-vs-2A y una final", () => {
  const q = [
    { pairId: "c", groupNumber: 1, rank: 1 },
    { pairId: "a", groupNumber: 1, rank: 2 },
    { pairId: "e", groupNumber: 2, rank: 1 },
    { pairId: "f", groupNumber: 2, rank: 2 },
  ];
  const plan = motor.planFourKnockout(q);
  assert.equal(plan.directSemifinalPairId, null);
  assert.deepEqual(plan.quarterfinals, []);
  assert.deepEqual(plan.semifinals, [
    ["c", "f"],
    ["e", "d"],
  ]);
  assert.equal(new Set(plan.semifinals.flat()).size, 4);
  assert.deepEqual(plan.final, [
    { from: "SF1", outcome: "winner" },
    { from: "SF2", outcome: "winner" },
  ]);
});
test("Cuadro de cuatro NO admite clasificados repetidos o faltantes", () => {
  assert.throws(
    () =>
      motor.planFourKnockout([
        { pairId: "a", groupNumber: 1, rank: 1 },
        { pairId: "a", groupNumber: 1, rank: 2 },
        { pairId: "b", groupNumber: 2, rank: 1 },
        { pairId: "c", groupNumber: 2, rank: 2 },
      ]),
    /distintas/,
  );
  assert.throws(
    () =>
      motor.planFourKnockout([
        { pairId: "a", groupNumber: 1, rank: 1 },
        { pairId: "b", groupNumber: 1, rank: 2 },
        { pairId: "c", groupNumber: 2, rank: 1 },
      ]),
    /cuatro/,
  );
});
test("Admin habilita cuatro clasificadas y selecciona dos semifinales sin bye", () => {
  const js = read("js/admin-eliminatorias.js");
  assert.match(js, /function qualifiersFour\(data\)/);
  assert.match(js, /function renderFour\(\)/);
  assert.match(js, /const selected=t\.table\.slice\(0,2\)/);
  assert.doesNotMatch(js, /summary\.decisiveFour\s*=/);
  assert.match(js, /model\.mode === "four"/);
  assert.match(js, /direct_semifinal_pair_id:null/);
  assert.match(js, /quarterfinals:\[\]/);
  assert.match(js, /semifinals:pairs/);
  assert.match(js, /askKnockoutConfirmation\(null,pairs,true\)/);
  assert.match(js, /bp_tournament_knockout_brackets/);
  assert.match(
    js,
    /const mode = data\.groups\.length === 2 \? "four" : "seven"/,
  );
  assert.match(js, /version\(data\.results,data\.matches\.length\)/);
  // Conserva el modo antiguo de siete clasificados en el mismo panel.
  assert.match(js, /recommendSevenBye/);
  assert.match(js, /planSevenKnockout/);
  assert.match(js, /askKnockoutConfirmation\(bye, pairs\)/);
});
test("Programación Admin resuelve semifinales directas o cuartos históricos", () => {
  const src = read("js/admin-eliminatorias-partidos68.js");
  assert.match(src, /br\.semifinals\[slot - 1\]\[0\]/);
  assert.match(src, /br\.direct_semifinal_pair_id/);
  assert.match(src, /winner\("quarterfinal", 3\)/);
  assert.match(src, /bp_admin_save_knockout_result/);
  assert.match(src, /bp_admin_set_knockout_match_schedule/);
});
test("Público muestra las semifinales directas sin alterar cuadro previo ni podio", () => {
  const src = read("js/torneos-public.js");
  assert.match(src, /Array\.isArray\(bracket\.semifinals\)/);
  assert.match(src, /bracket\.semifinals\[m\.slot\s*-\s*1\]/);
  assert.match(src, /bracket\.quarterfinals\?\.\[m\.slot\s*-\s*1\]/);
  assert.match(src, /knockout\.append\(podium\)/);
  assert.match(
    src,
    /function standingsForGroup\(group, groupMatches, twoGroupMode = false\)/,
  );
  assert.doesNotMatch(src, /const pairFinal\s*=\s*placeFrom\(1\)/);
  assert.match(src, /Grupo completo\. Clasifican dos parejas\./);
});
test("SQL80 valida cuatro sin alterar la protección histórica de siete y sin borrar datos", () => {
  const sql = read("sql/SQL_80_ELIMINATORIAS_CUATRO_CLASIFICADAS.sql");
  assert.match(sql, /APLICADA EN SUPABASE 08\/11\/2026/);
  assert.match(sql, /v_four := v_groups = 2/);
  assert.match(sql, /v_group\.size=3/);
  assert.match(sql, /m\.round_number=2 AND m\.match_number=1/);
  assert.match(sql, /v_qualifiers:=v_qualifiers \|\| v_pair_ids/);
  assert.match(sql, /v_participants @> v_qualifiers/);
  assert.match(sql, /NEW\.direct_semifinal_pair_id IS NOT NULL/);
  assert.match(sql, /NEW\.semifinals IS DISTINCT FROM OLD\.semifinals/);
  assert.match(sql, /v_b\.semifinals IS NOT NULL/);
  assert.match(sql, /'semifinals', b\.semifinals/);
  assert.match(
    sql,
    /v_groups <> 3 OR v_group_sizes IS DISTINCT FROM ARRAY\[3::bigint,3::bigint,4::bigint\]/,
  );
  assert.doesNotMatch(
    sql,
    /DELETE FROM public\.(?:reservations|blockouts|bp_tournaments|bp_tournament_pairs)/i,
  );
  assert.doesNotMatch(sql, /TRUNCATE\s+public\./i);
  // El único trigger sustituido es el de congelación, para cubrir
  // explícitamente las semifinales, manteniendo nombre y función previa.
  assert.match(sql, /DROP TRIGGER IF EXISTS bp_ko_freeze_started_bracket_trg/);
  assert.match(sql, /CREATE TRIGGER bp_ko_freeze_started_bracket_trg/);
  assert.match(
    sql,
    /BEFORE UPDATE OF quarterfinals, direct_semifinal_pair_id, semifinals/,
  );
  assert.equal((sql.match(/DROP TRIGGER/g) || []).length, 1);
});

test("El cálculo real del Admin usa la tabla y games para zona de cuatro", () => {
  const admin = read("js/admin-eliminatorias.js");
  const start = admin.indexOf(
    "  function standings(members, matches, allResults) {",
  );
  const end = admin.indexOf("  function valid(qs, bye, list) {", start);
  assert.ok(start > 0 && end > start);
  const funcs = admin.slice(start, end); // incluye qualifiersFour y la rutina legacy
  const calculate = new Function(
    "motor",
    "const letter=(n)=>String.fromCharCode(64+Number(n));" +
      funcs +
      "; return qualifiersFour;",
  )(motor);
  const groups = [
    { id: "ga", group_number: 1 },
    { id: "gb", group_number: 2 },
  ];
  const assignments = [
    ...["a", "b", "c", "d"].map((pair_id) => ({ group_id: "ga", pair_id })),
    ...["e", "f", "g"].map((pair_id) => ({ group_id: "gb", pair_id })),
  ];
  const match = (
    id,
    group_id,
    round_number,
    match_number,
    pair1_id,
    pair2_id,
  ) => ({
    id,
    group_id,
    round_number,
    match_number,
    pair1_id,
    pair2_id,
    match_status: "played",
  });
  const matches = [
    match("mA1", "ga", 1, 1, "a", "b"),
    match("mA2", "ga", 1, 2, "c", "d"),
    match("mA3", "ga", 2, 1, null, null),
    match("mA4", "ga", 2, 2, null, null),
    match("mB1", "gb", 1, 1, "e", "f"),
    match("mB2", "gb", 2, 1, "e", "g"),
    match("mB3", "gb", 3, 1, "f", "g"),
  ];
  const result = (match_id, group_id, p1, p2, sets) => ({
    match_id,
    group_id,
    resolved_pair1_id: p1,
    resolved_pair2_id: p2,
    sets,
    score_format: "legacy",
  });
  const results = [
    result("mA1", "ga", "a", "b", win1.sets),
    result("mA2", "ga", "c", "d", win1.sets),
    result("mA3", "ga", "a", "c", [[2,6],[2,6]]),
    result("mA4", "ga", "b", "d", win2.sets),
    result("mB1", "gb", "e", "f", win1.sets),
    result("mB2", "gb", "e", "g", win1.sets),
    result("mB3", "gb", "f", "g", win1.sets),
  ];
  const list = calculate({ groups, assignments, matches, results });
  assert.deepEqual(
    list.map((x) => [x.pairId, x.groupNumber, x.rank]),
    [
      ["c", 1, 1],
      ["d", 1, 2],
      ["e", 2, 1],
      ["f", 2, 2],
    ],
  );
  assert.deepEqual(motor.planFourKnockout(list).semifinals, [
    ["c", "f"],
    ["e", "a"],
  ]);
  assert.throws(
    () =>
      calculate({ groups, assignments, matches, results: results.slice(0, 6) }),
    /completá|complet/i,
  );
});
