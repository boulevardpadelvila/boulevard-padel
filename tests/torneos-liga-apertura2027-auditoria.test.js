/* Auditoría reproducible Apertura 2027 · marcadores deportivos anonimizados.
 * Réplica numérica de los 10 resultados reales verificados por SELECT, sin
 * nombres ni datos de contacto en el repositorio. Ningún acceso a Supabase.
 */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const classic = require("../js/torneos-motor.js");
const league = require("../js/torneos-liga-motor.js");
const finalEngine = require("../js/torneos-liga-final89.js");

// C = 1°; A = 2°; B = 3°; E = 4°; D = 5°. Letras sintéticas.
const rows = [
  ["A", "B", [[6,3],[6,2]], "A", 1],
  ["C", "D", [[6,3],[6,4]], "C", 1],
  ["B", "E", [[7,5],[7,5]], "B", 2],
  ["C", "A", [[6,3],[6,2]], "C", 2],
  ["E", "D", [[6,1],[6,1]], "E", 3],
  ["B", "C", [[7,5],[7,5]], "B", 3],
  ["C", "E", [[6,4],[6,4]], "C", 4],
  ["A", "D", [[6,4],[3,6],[10,4]], "A", 4],
  ["E", "A", [[6,3],[5,7],[5,10]], "A", 5],
  ["D", "B", [[6,1],[3,6],[10,5]], "D", 5]
];
const fixtures = rows.map(([pair1_id,pair2_id,sets,winner_pair_id,round_number],i)=>({
  id: "f"+(i+1), pair1_id,pair2_id,sets,winner_pair_id,round_number,
  match_status: "played"
}));

test("Apertura 2027: fixture regular completo, una rueda y cinco fechas",()=>{
  assert.equal(fixtures.length,10);
  const seen=new Set();
  const count=new Map(["A","B","C","D","E"].map(id=>[id,0]));
  for(const f of fixtures){
    assert.notEqual(f.pair1_id,f.pair2_id);
    const key=[f.pair1_id,f.pair2_id].sort().join("-");
    assert.ok(!seen.has(key),"Cruce duplicado: "+key);
    seen.add(key);
    count.set(f.pair1_id,count.get(f.pair1_id)+1);
    count.set(f.pair2_id,count.get(f.pair2_id)+1);
    const outcome=league.analyzeScore(f.sets);
    const expected=outcome.winnerSide===1?f.pair1_id:f.pair2_id;
    assert.equal(expected,f.winner_pair_id);
  }
  for(const n of count.values())assert.equal(n,4);
  assert.deepEqual([...new Set(fixtures.map(f=>f.round_number))],[1,2,3,4,5]);
});

test("Apertura 2027: ranking 2/1/0 y cinco criterios, super tie-break sin games",()=>{
  const report=league.standings(["A","B","C","D","E"],fixtures);
  assert.equal(report.played,10);
  assert.equal(report.total,10);
  assert.equal(report.complete,true);
  assert.deepEqual(report.rows.map(r=>r.pairId),["C","A","B","E","D"]);
  const expected=[
    ["C",4,3,1,6,6,2,4,46,34,12],
    ["A",4,3,1,6,6,4,2,36,38,-2],
    ["B",4,2,2,5,5,4,1,40,41,-1],
    ["E",4,1,3,3,3,6,-3,41,38,3],
    ["D",4,1,3,3,3,7,-4,28,40,-12]
  ];
  assert.deepEqual(report.rows.map(r=>[
    r.pairId,r.played,r.won,r.lost,r.points,r.setsFor,r.setsAgainst,
    r.setDifference,r.gamesFor,r.gamesAgainst,r.gameDifference
  ]),expected);
  assert.ok(report.rows.every(r=>!r.tied),"No hay empate absoluto");
  assert.equal(report.rows[0].points,report.rows[1].points);
  assert.ok(report.rows[0].setDifference>report.rows[1].setDifference);
  assert.equal(report.rows[3].points,report.rows[4].points);
  assert.ok(report.rows[3].setDifference>report.rows[4].setDifference);
  const tiebreak=league.analyzeScore([[6,4],[3,6],[10,4]]);
  assert.equal(tiebreak.winnerSide,1);
  assert.deepEqual([tiebreak.games1,tiebreak.games2],[9,10],
    "El tercer set super TB NO agrega games");
  assert.throws(()=>classic.evaluateSets({sets:[[11,3],[6,3]]},"super_tb"));
});

test("Apertura 2027: clasificados, semifinales, campeón y subcampeón desde final",()=>{
  const plan=finalEngine.planFinalPhase(["A","B","C","D","E"],fixtures);
  assert.equal(plan.ready,true);
  assert.deepEqual(plan.qualifiers.map(p=>p.pairId),["C","A","B","E"]);
  assert.deepEqual(plan.semifinals.map(m=>[m.pair1Id,m.pair2Id]),[
    ["C","B"],["A","E"]
  ]);
  const result=finalEngine.resolveFinalPhase(plan,{
    SF1:{pair1Id:"C",pair2Id:"B",sets:[[6,3],[6,3]]},
    SF2:{pair1Id:"A",pair2Id:"E",sets:[[7,5],[6,4]]},
    F1:{pair1Id:"C",pair2Id:"A",sets:[[7,5],[5,7],[7,5]]}
  });
  assert.equal(result.complete,true);
  assert.equal(result.championPairId,"C");
  assert.equal(result.runnerUpPairId,"A");
  assert.equal(result.final.winnerPairId,"C");
  assert.notEqual(result.championPairId,"D");
});
