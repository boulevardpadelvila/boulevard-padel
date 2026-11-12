const test=require("node:test");
const assert=require("node:assert/strict");
const rules=require("../js/torneos-reglamento-2026.js");
test("cada cantidad 6..40 tiene todos sus participantes una única vez",()=>{
  for(let n=6;n<=40;n++){
    const p=rules.bracket(n);
    assert.equal(p.sizes.reduce((x,y)=>x+y,0),n);
    assert.ok(p.sizes.slice(0,n%3).every(s=>s===4),String(n));
    assert.ok(p.sizes.slice(n%3).every(s=>s===3),String(n));
    assert.equal(p.groupMatches,p.sizes.reduce((sum,s)=>sum+(s===4?4:3),0));
    assert.equal(p.knockoutMatches,p.qualified-1);
    assert.equal(p.preliminariesMatches.length,p.preliminaries);
    assert.equal(p.firstRoundMatches.length,p.base/2);
    assert.equal(p.directEntrants.length,p.direct);
  }
});
test("casos conocidos del simulador",()=>{
  const a=rules.bracket(7);
  assert.deepEqual(a.preliminariesMatches,[["3° A","2° B"]]);
  assert.deepEqual(a.directEntrants,["1° A","2° A","1° B"]);
  const b=rules.bracket(9);
  assert.deepEqual(b.directEntrants,["1° A","1° B"]);
  const c=rules.bracket(14);
  assert.ok(c.directEntrants.includes("1° A"));
  assert.ok(c.directEntrants.includes("1° B"));
});
test("prioridad de zonas de cuatro para pase a ronda siguiente",()=>{
  for(let n=15;n<=40;n++){
    const p=rules.bracket(n);
    const eligible=p.sizes.map((size,i)=>({size,label:`1° ${String.fromCharCode(65+i)}`}));
    const available=p.directEntrants;
    const fourLeaders=eligible.filter(x=>x.size===4).map(x=>x.label);
    const eligibleLeaders=eligible.map(x=>x.label);
    if(p.preliminaries>0){
      const expected=fourLeaders.slice(0,Math.min(fourLeaders.length,p.direct));
      expected.forEach(e=>assert.ok(available.includes(e),`n=${n}: falta pase para ${e}`));
      // Si hay suficientes pases para todos los primeros, todos avanzan.
      if(p.direct>=eligibleLeaders.length)
        eligibleLeaders.forEach(e=>assert.ok(available.includes(e),`n=${n}: primero excluido ${e}`));
    }
  }
});
test("grupo de cuatro: puntuación 2/0 y tabla puede diferir de cruces",()=>{
  const ids=["a","b","c","d"];
  const r=rules.standings(ids,[
    {pair1:"a",pair2:"b",sets:[[6,4],[6,4]]},
    {pair1:"c",pair2:"d",sets:[[6,3],[3,6],[10,8]]},
    {pair1:"a",pair2:"c",sets:[[6,4],[6,4]]},
    {pair1:"b",pair2:"d",sets:[[6,2],[6,2]]}
  ]);
  assert.equal(r.complete,true);
  assert.deepEqual(r.rows.map(x=>x.points),[4,2,2,0]);
  assert.deepEqual(r.rows.map(x=>x.pairId),["a","b","c","d"]);
  assert.deepEqual(r.qualified,["a","b","c"]);
});
test("STB solo en grupos y no suma games",()=>{
  const m=[[6,4],[3,6],[10,8]];
  const x=rules.checkScore(m,"groups");
  assert.equal(x.winner,1);
  assert.deepEqual(x.games,[9,10]);
  assert.throws(()=>rules.checkScore(m,"knockout"),/normal inválido/);
  assert.deepEqual(rules.checkScore([[6,4],[3,6],[6,2]],"knockout").games,[15,12]);
});
test("desempate directo y empate múltiple pendiente de Martín",()=>{
  const ids=["a","b","c"];
  const ties=rules.standings(ids,[
    {pair1:"a",pair2:"b",sets:[[6,4],[6,4]]},
    {pair1:"b",pair2:"c",sets:[[6,4],[6,4]]},
    {pair1:"a",pair2:"c",sets:[[4,6],[4,6]]}
  ]);
  assert.equal(ties.unresolved.length,1);
  assert.equal(ties.qualificationReady,false);
  const resolved=rules.standings(ids,[
    {pair1:"a",pair2:"b",sets:[[6,4],[6,4]]},
    {pair1:"b",pair2:"c",sets:[[6,4],[6,4]]},
    {pair1:"a",pair2:"c",sets:[[4,6],[4,6]]}
  ],["b","a","c"]);
  assert.equal(resolved.qualificationReady,true);
  assert.deepEqual(resolved.qualified,["b","a"]);
});
