/* Boulevard Pádel · Parche 80 · Dos grupos de 3/4, cuatro semifinalistas */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const motor=require("../js/torneos-motor.js");
const read=(file)=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
const win1={sets:[[6,4],[6,4]]};
const win2={sets:[[4,6],[4,6]]};
const win3={sets:[[6,3],[3,6],[6,4]]};

test("Grupo de 4: A3 ganador es primero y A3 perdedor segundo, aunque A4 gane 3 puntos",()=>{
  const ids=["a","b","c","d"];
  const results={A1:win1,A2:win1,A3:win2,A4:win2};
  // A1 gana a, A2 gana c. A3 gana c y a queda segundo.
  // A4 gana d ante b; d y a tienen tres puntos, pero d NO clasifica.
  assert.deepEqual(motor.decisiveFourPlacings(ids,results),["c","a","d","b"]);
  const points=motor.calculateGroupStandings(ids,results);
  assert.equal(points.complete,true);
  assert.ok(points.table.filter(p=>p.points===3).length>=2);
});
test("Grupo de cuatro incompleto o cruce inválido NO habilita puestos",()=>{
  assert.throws(()=>motor.decisiveFourPlacings(["a","b","c","d"],{A1:win1,A2:win1,A3:win2}),/Completá/);
  assert.throws(()=>motor.decisiveFourPlacings(["a","b","c"],{A1:win1}),/cuatro parejas/);
});
test("Grupo de 3: todos contra todos, pasan los primeros dos sin empate inventado",()=>{
  const res=motor.calculateGroupStandings(["e","f","g"],{
    A1:win1,A2:win1,A3:win1
  });
  assert.equal(res.complete,true);
  assert.equal(res.seedingReady,true);
  assert.deepEqual(res.qualifiedPairIds,["e","f"]);
});
test("Cuatro clasificadas: 1A-vs-2B, 1B-vs-2A y una final",()=>{
  const q=[
    {pairId:"c",groupNumber:1,rank:1},
    {pairId:"a",groupNumber:1,rank:2},
    {pairId:"e",groupNumber:2,rank:1},
    {pairId:"f",groupNumber:2,rank:2}
  ];
  const plan=motor.planFourKnockout(q);
  assert.equal(plan.directSemifinalPairId,null);
  assert.deepEqual(plan.quarterfinals,[]);
  assert.deepEqual(plan.semifinals,[["c","f"],["e","a"]]);
  assert.equal(new Set(plan.semifinals.flat()).size,4);
  assert.deepEqual(plan.final,[{from:"SF1",outcome:"winner"},{from:"SF2",outcome:"winner"}]);
});
test("Cuadro de cuatro NO admite clasificados repetidos o faltantes",()=>{
  assert.throws(()=>motor.planFourKnockout([
    {pairId:"a",groupNumber:1,rank:1},{pairId:"a",groupNumber:1,rank:2},
    {pairId:"b",groupNumber:2,rank:1},{pairId:"c",groupNumber:2,rank:2}
  ]),/distintas/);
  assert.throws(()=>motor.planFourKnockout([
    {pairId:"a",groupNumber:1,rank:1},{pairId:"b",groupNumber:1,rank:2},
    {pairId:"c",groupNumber:2,rank:1}
  ]),/cuatro/);
});
test("Admin habilita cuatro clasificadas y selecciona dos semifinales sin bye",()=>{
  const js=read("js/admin-eliminatorias.js");
  assert.match(js,/function qualifiersFour\(data\)/);
  assert.match(js,/function renderFour\(\)/);
  assert.match(js,/members\.length === 4 && summary\.complete/);
  assert.match(js,/motor\.decisiveFourPlacings\(ids, mapped\)/);
  assert.match(js,/model\.mode === "four"/);
  assert.match(js,/direct_semifinal_pair_id:null/);
  assert.match(js,/quarterfinals:\[\]/);
  assert.match(js,/semifinals:pairs/);
  assert.match(js,/askKnockoutConfirmation\(null,pairs,true\)/);
  assert.match(js,/bp_tournament_knockout_brackets/);
  assert.match(js,/const mode = data\.groups\.length === 2 \? "four" : "seven"/);
  assert.match(js,/version\(data\.results,data\.matches\.length\)/);
  // Conserva el modo antiguo de siete clasificados en el mismo panel.
  assert.match(js,/recommendSevenBye/);
  assert.match(js,/planSevenKnockout/);
  assert.match(js,/askKnockoutConfirmation\(bye, pairs\)/);
});
test("Programación Admin resuelve semifinales directas o cuartos históricos",()=>{
  const src=read("js/admin-eliminatorias-partidos68.js");
  assert.match(src,/br\.semifinals\[slot - 1\]\[0\]/);
  assert.match(src,/br\.direct_semifinal_pair_id/);
  assert.match(src,/winner\("quarterfinal", 3\)/);
  assert.match(src,/bp_admin_save_knockout_result/);
  assert.match(src,/bp_admin_set_knockout_match_schedule/);
});
test("Público muestra las semifinales directas sin alterar cuadro previo ni podio",()=>{
  const src=read("js/torneos-public.js");
  assert.match(src,/Array\.isArray\(bracket\.semifinals\)/);
  assert.match(src,/bracket\.semifinals\[m.slot-1\]/);
  assert.match(src,/bracket\.quarterfinals\?\.\[m.slot-1\]/);
  assert.match(src,/knockout\.append\(podium\)/);
  assert.match(src,/function standingsForGroup\(group, groupMatches, twoGroupMode = false\)/);
  assert.match(src,/const pairFinal=placeFrom\(1\), consolation=placeFrom\(2\)/);
  assert.match(src,/Clasifican las dos parejas del cruce de ganadores/);
});
test("SQL80 valida cuatro sin alterar la protección histórica de siete y sin borrar datos",()=>{
  const sql=read("sql/SQL_80_ELIMINATORIAS_CUATRO_CLASIFICADAS.sql");
  assert.match(sql,/NO APLICADA/);
  assert.match(sql,/v_four := v_groups = 2/);
  assert.match(sql,/v_group\.size=3/);
  assert.match(sql,/m\.round_number=2 AND m\.match_number=1/);
  assert.match(sql,/v_qualifiers:=v_qualifiers \|\| v_pair_ids/);
  assert.match(sql,/v_participants @> v_qualifiers/);
  assert.match(sql,/NEW\.direct_semifinal_pair_id IS NOT NULL/);
  assert.match(sql,/NEW\.semifinals IS DISTINCT FROM OLD\.semifinals/);
  assert.match(sql,/v_b\.semifinals IS NOT NULL/);
  assert.match(sql,/'semifinals', b\.semifinals/);
  assert.match(sql,/v_groups <> 3 OR v_group_sizes IS DISTINCT FROM ARRAY\[3::bigint,3::bigint,4::bigint\]/);
  assert.doesNotMatch(sql,/DELETE FROM public\.(?:reservations|blockouts|bp_tournaments|bp_tournament_pairs)/i);
  assert.doesNotMatch(sql,/TRUNCATE\s+public\./i);
  assert.ok(!sql.includes("DROP TRIGGER"));
});
