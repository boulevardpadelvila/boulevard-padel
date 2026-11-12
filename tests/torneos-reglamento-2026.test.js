const test = require("node:test");
const assert = require("node:assert/strict");
const r = require("../js/torneos-reglamento-2026.js");

test("Todas las 35 llaves de 6 a 40 parejas conservan cada clasificada una vez", () => {
  for (let n=6; n<=40; n++) {
    const d=r.bracket(n), participants=d.sizes.flatMap((size,i)=>Array.from({length:size===4?3:2},(_,k)=>`${k+1}° ${String.fromCharCode(65+i)}`));
    const included=d.pre.flat().concat(d.direct);
    assert.equal(new Set(included).size,participants.length,`repetida con ${n}`);
    assert.deepEqual(included.slice().sort(),participants.slice().sort(),`participantes con ${n}`);
    assert.equal(d.pre.length,d.preCount);
    assert.equal(d.opening.length,d.base/2);
    assert.equal(d.rounds.reduce((s,round)=>s+round.matches.length,0),d.qualifiers-1);
    assert.equal(d.sizes.filter(x=>x===4).length,n%3);
    assert.deepEqual(d.sizes.slice(0,n%3),Array(n%3).fill(4));
    assert.deepEqual(d.sizes.slice(n%3),Array(Math.floor(n/3)-(n%3)).fill(3));
    if(d.preCount)assert.equal(d.direct.length,d.byes);
    for(let i=0;i<n%3;i++)assert.ok(d.direct.includes(`1° ${String.fromCharCode(65+i)}`),`prioridad zona 4, ${n}`);
  }
});

test("9 parejas: los primeros de A y B saltean la previa",()=>{
 const b=r.bracket(9);
 assert.deepEqual(b.direct,["1° A","1° B"]);
 assert.deepEqual(b.pre,[["2° B","2° C"],["1° C","2° A"]]);
});

test("4 parejas en zona: segundos y terceros dependen de la tabla, no de ganadores y perdedores",()=>{
 const matches=[
  {pair1:"A",pair2:"B",sets:[[6,0],[6,0]]},
  {pair1:"C",pair2:"D",sets:[[6,4],[6,4]]},
  {pair1:"A",pair2:"C",sets:[[6,0],[6,0]]},
  {pair1:"B",pair2:"D",sets:[[6,7],[6,7]]}
 ];
 const s=r.standings(["A","B","C","D"],matches);
 assert.equal(s.complete,true);
 assert.deepEqual(s.rows.map(x=>x.pairId),["A","D","C","B"]);
 assert.deepEqual(s.rows.map(x=>x.points),[4,2,2,0]);
 assert.deepEqual(s.qualified,["A","D","C"]);
});

test("Resultado de grupo: triunfo 2 puntos; derrota 0; STB cuenta set pero no games",()=>{
 const a=r.score([[6,4],[4,6],[10,8]],"group");
 assert.deepEqual(a.sets,[2,1]);
 assert.deepEqual(a.games,[10,10]);
 assert.throws(()=>r.score([[6,4],[4,6],[10,8]],"elimination"),/Set inválido/);
 assert.deepEqual(r.score([[6,4],[4,6],[6,3]],"elimination").games,[16,13]);
});

test("Empate múltiple no ordena arbitrariamente la clasificación",()=>{
 const matches=[
   {pair1:"A",pair2:"B",sets:[[6,0],[6,0]]},
   {pair1:"A",pair2:"C",sets:[[0,6],[0,6]]},
   {pair1:"B",pair2:"C",sets:[[6,0],[6,0]]}
 ];
 const s=r.standings(["A","B","C"],matches);
 assert.equal(s.complete,true);
 assert.equal(s.unresolved.length,1);
 assert.deepEqual(s.qualified,[]);
 const approved=r.standings(["A","B","C"],matches,["B","C","A"]);
 assert.deepEqual(approved.qualified,["B","C"]);
});
