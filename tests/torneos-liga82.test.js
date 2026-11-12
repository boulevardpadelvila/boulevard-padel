/* Liga Boulevard Pádel · suite del motor y la integración (parche 82) */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../js/torneos-liga-motor.js");
const read=p=>fs.readFileSync(path.resolve(__dirname,"..",p),"utf8");
const ids=n=>Array.from({length:n},(_,i)=>"pareja"+(i+1));
const score20=[[6,2],[6,3]];
const score21=[[6,2],[4,6],[6,4]];
const score12=[[2,6],[6,4],[4,6]];
test("Una rueda: todas las parejas se enfrentan una sola vez",()=>{
  for(const n of [2,3,4,5,7,8,10,17]){
    const schedule=engine.buildSchedule(ids(n));
    assert.equal(schedule.length,n*(n-1)/2);
    const pairs=new Set(schedule.map(m=>[m.pair1Id,m.pair2Id].sort().join("|")));
    assert.equal(pairs.size,schedule.length);
    assert.ok(schedule.every(m=>Number.isInteger(m.roundNumber)&&m.roundNumber>0&&m.leg===1));
    assert.deepEqual(schedule.map(m=>m.matchNumber),Array.from({length:schedule.length},(_,i)=>i+1));
  }
});
test("Por ahora solo una rueda: no se admite ida y vuelta",()=>{
  assert.throws(()=>engine.buildSchedule(ids(5),2),/sola rueda/);
});
test("Una pareja participa una vez por Fecha; Martín elige día y horario",()=>{
  const matches=[
    {id:"a",pair1_id:"A",pair2_id:"B",round_number:1},
    {id:"b",pair1_id:"C",pair2_id:"D",round_number:1},
    {id:"c",pair1_id:"A",pair2_id:"E",round_number:2},
    {id:"d",pair1_id:"E",pair2_id:"F",round_number:3}
  ];
  assert.equal(engine.validateRoundAssignment(matches,"c",2),true);
  assert.throws(()=>engine.validateRoundAssignment(matches,"c",1),/un solo partido/);
  assert.equal(engine.validateRoundAssignment(matches,"b",1),true);
  assert.throws(()=>engine.validateRoundAssignment(matches,"c",0),/Fecha/);
  assert.throws(()=>engine.validateRoundAssignment(matches,"c",1000),/Fecha/);
  assert.throws(()=>engine.validateRoundAssignment(matches,"x",3),/No se encontró/);
});
test("2 puntos por victoria 2-0 o 2-1; 1 punto por derrota 2-1; 0 por 2-0",()=>{
  const pairIds=ids(3);
  const matches=[
    {pair1_id:pairIds[0],pair2_id:pairIds[1],match_status:"played",sets:score21},
    {pair1_id:pairIds[0],pair2_id:pairIds[2],match_status:"played",sets:score20},
    {pair1_id:pairIds[1],pair2_id:pairIds[2],match_status:"played",sets:score12},
  ];
  const stats=engine.standings(pairIds,matches);
  const byId=new Map(stats.rows.map(x=>[x.pairId,x]));
  assert.equal(byId.get(pairIds[0]).points,4);
  assert.equal(byId.get(pairIds[1]).points,2);
  assert.equal(byId.get(pairIds[2]).points,2);
  assert.equal(stats.complete,true);
  assert.equal(stats.champion,pairIds[0]);
});
test("Tercer set normal cuenta sets y games",()=>{
  const r=engine.analyzeScore(score21);
  assert.equal(r.winnerSide,1);
  assert.equal(r.side1Sets,2);
  assert.equal(r.side2Sets,1);
  assert.equal(r.games1,16);
  assert.equal(r.games2,12);
  assert.equal(r.loserSets,1);
});
test("Liga nueva rechaza STB y exige un tercer set normal",()=>{
  assert.throws(()=>engine.analyzeScore([[6,0],[6,1],[6,4]]),/adicionales/);
  assert.throws(()=>engine.analyzeScore([[6,3],[4,6],[9,7]]),/inválido/);
  assert.throws(()=>engine.analyzeScore([[6,3],[4,6],[10,9]]),/inválido/);
  assert.deepEqual(engine.analyzeScore([[6,3],[4,6],[7,5]]).winnerSide,1);
});
test("Liga incompleta no declara campeones, tampoco empate total al terminar",()=>{
  let a=engine.standings(ids(2),[{pair1_id:"pareja1",pair2_id:"pareja2",match_status:"pending",sets:null}]);
  assert.equal(a.champion,null);assert.equal(a.complete,false);
  a=engine.standings(["a","b","c"],[
    {pair1_id:"a",pair2_id:"b",match_status:"played",sets:score20},
    {pair1_id:"b",pair2_id:"c",match_status:"played",sets:score20},
    {pair1_id:"c",pair2_id:"a",match_status:"played",sets:score20}
  ]);
  assert.equal(a.complete,true);
  assert.equal(a.champion,null);
  assert.ok(a.rows.every(p=>p.tied));
});
test("No acepta parejas duplicadas ni varias ruedas",()=>{
  assert.throws(()=>engine.buildSchedule(["a","a"]));
  assert.throws(()=>engine.buildSchedule(["a"],1));
  assert.throws(()=>engine.buildSchedule(["a","b"],3));
});

test("Histórico: STB antiguo permanece legible pero no se admite en nuevas cargas",()=>{
  const historical=[[6,2],[4,6],[10,8]];
  const parsed=engine.analyzeScore(historical,{historical:true});
  assert.equal(parsed.historicalSTB,true);
  assert.equal(parsed.games1,10);
  assert.equal(parsed.games2,8);
  assert.throws(()=>engine.analyzeScore(historical),/inválido/);
});
