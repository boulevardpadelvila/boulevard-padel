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

test("Liga: todo tercer set normal, ganador 2 puntos y perdedor 2-1 un punto",()=>{
 const matches=[
  {pair1:"a",pair2:"b",sets:[[6,2],[2,6],[7,5]]},
  {pair1:"c",pair2:"d",sets:[[6,4],[6,2]]},
  {pair1:"a",pair2:"c",sets:[[6,3],[6,3]]},
  {pair1:"b",pair2:"d",sets:[[6,1],[6,0]]}
 ];
 const table=rules.leagueStandings(["a","b","c","d"],matches);
 assert.equal(table.complete,true);
 assert.equal(table.rows.reduce((n,x)=>n+x.points,0),9);
 assert.equal(table.rows.find(x=>x.pairId==="a").points,4);
 assert.equal(table.rows.find(x=>x.pairId==="b").points,3);
 assert.throws(()=>rules.leagueStandings(["a","b","c","d"],[
  {pair1:"a",pair2:"b",sets:[[6,3],[3,6],[10,8]]}
 ]),/normal inválido/);
});


/* Instantáneas independientes transcritas del PDF «Drops 6 a 40 parejas».
 * Cada hash cubre la PREVIA Y la ubicación exacta de sus ganadores en el
 * cuadro siguiente, en orden vertical. Evita que una refactorización
 * conserve la cantidad de partidos pero cambie la disposición deportiva. */
test("35 cuadros oficiales del PDF: previa y orden de llaves idénticos",()=>{
  const crypto=require("node:crypto");
  const expected=[
  "14b3b388a9fa57ab615c54c66bc601d4e6ecc59ac83ec2afe3986697fd405a2d",
  "f2d20f8ef3f4c955844a5bea150aad55d8b45bda9e2643ee42a5ba8e03311c0f",
  "1a26f35be86e5b186bc2b0e0432efdfcc05907bd5207b6d550dc160eb05c9356",
  "00d32fdd49087582842afbd5a95c2e2e2809333c5830b964ca829ab9a095ce81",
  "7ad6ef329d2cc913b6a8ff86305d9c88263fc97529b0a5b6123ef7bb2b112ad2",
  "ab1ffe51f7e10920e821d243364b2ab8ed632eff8e2e3d9b6186a9789f9f9fa7",
  "9b6e4a2016813b72fe11d25576716fd797a1b1294ffd66cbeb7a61237cb698d7",
  "74895e3ffdafc68659825f73c1aec56c3c1def87badeb0465a67eb22a44c9720",
  "58f4fa22bd73c7010ea6d852e7376be505f529cc7b7cbd2449399b9a6fe7493d",
  "80f51c0f2f8e7f20de5e98c9450d45ad54593b37a90f3c6531e35e229d0167ff",
  "14dda9982e7c5f12ac9cb0043d43f2514f69fa6c54df96765ac2db2049ee3400",
  "efd937f8f6148a7aba4cc96eb3099166324b33872a5d60c73050d1578b0e7e9d",
  "a6236d11dbc794238aa4e294ffe68cf3c7751fa3b66edf197b6ecc0a066a421a",
  "8588394fcea4f01117d6b1fd33dcac88bffa848d1a43d5e76b509490c5287d35",
  "94236614fb152d7953245f3dae9046c9b9bd9aa3bf29ca55c60773bd104d89e4",
  "e64904b6f3737ea59638867e466081c340b2a6f93ddf82deda5462273d75ba4f",
  "6fbbe338eafc18dd8db13b7a2ce097ff8dc4813c3fc518087239aa0d085e1d1d",
  "274eb5707aa4efcccb960979ec0e44ac7c81048e6c662cccc1d8af825f7a8794",
  "108ae210a71a11512b6db95fe7795c61721d7040b14312c4a72ff6af174073f2",
  "d432a831ff5232bde0c1da2039b4949a19378b460411dda216da0ae90afffb3a",
  "fd408959c479eb5a1200f240e4a8048790949239d5a3a35bb4fe5ae93423a8d5",
  "e9041c2d0049dbc8803d8cae0c3837bc81681669b18383a07259186fb48f5d3b",
  "6d50a043506257df412e3fb40e598cbacd0c69432c3bf67fb1e5a5cc96a0079f",
  "9a15fe5ffd851aca7a1c98f1b2854cce70a19913ff771337d6ae5d341a327ca1",
  "a43ee60692d27db228ea8c1b47d5a3c4784f5b7ebed6b0e99f71860ca60347c0",
  "551963554189e189949e6daa46f28d096a0a70067f972ae0b9207fb1bcdcb45a",
  "6eda48c954c34f92019c228e9acee626642e26721bdf8673bbc4ed1c72510218",
  "398d30b614a6831b237e7ceaabb2fb40cbea5e89818aafd26aa7cd026d663933",
  "af506e7ad423cf35311c06ccdf5c02df6ef69687b730808663b0c7daef74af11",
  "8b54f08cfd446e1bb0d4603cc913e693446d056bfa9bfb2621fcc8de8cafc480",
  "7cdc186250b9f4e9dfbbfb3a38f53876c70a77e42c54ab8018a91b99b4a60e48",
  "3172491be6ff4a51f0bc04c8e0e4402ce701dbe285a8d6013281f5a920d6b351",
  "465ac87f012f99ceffd0baf853f3679bdcb8619a9a9b60dae10d3b40f51319c4",
  "c2625242419c9aab2e9ec26a51a5656a90b92815b5a5ab9ae79c07dff15604b4",
  "821eb7c823ff76b6f1f6dcc409bd8fdbd1b9b2241c8b2eedab08cb50bc12707e"
];
  for(let n=6;n<=40;n++){
    const plan=rules.bracket(n);
    const actual=crypto.createHash("sha256").update(
      JSON.stringify([plan.preliminariesMatches,plan.firstRoundMatches])
    ).digest("hex");
    assert.equal(actual,expected[n-6],`El cuadro de ${n} parejas difiere de la página ${n-5} del PDF`);
    for(const [a,b] of plan.preliminariesMatches){
      assert.ok(!(a.startsWith("1° ")&&b.startsWith("1° ")),`Previa de ${n}: dos primeros se enfrentan`);
      assert.notEqual(a.slice(-1),b.slice(-1),`Previa de ${n}: mismo grupo`);
    }
  }
});

test("18 parejas: las cuatro previas son exactamente las del PDF página 13",()=>{
 const {preliminariesMatches:pre,firstRoundMatches:next}=rules.bracket(18);
 assert.deepEqual(pre,[
  ["2° C","2° F"],["1° E","2° B"],["2° A","1° F"],["2° E","2° D"]
 ]);
 assert.deepEqual(next,[
  ["1° A","P1"],["P2","1° D"],["1° C","P3"],["P4","1° B"]
 ]);
});