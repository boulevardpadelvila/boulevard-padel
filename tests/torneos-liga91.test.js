const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../js/torneos-liga-motor.js");
const read=(p)=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("Liga 2026: acepta tres sets normales completos, incluye games y otorga 2/1 puntos",()=>{
  const score=engine.analyzeScore([[6,4],[2,6],[7,5]],"three_sets");
  assert.equal(score.winnerSide,1);
  assert.equal(score.games1,15);
  assert.equal(score.games2,15);
  assert.equal(score.loserSets,1);
  const r=engine.standings(["a","b"],[
    {match_status:"played",pair1_id:"a",pair2_id:"b",sets:[[6,4],[2,6],[7,5]]}
  ],"three_sets");
  assert.equal(r.rows.find(x=>x.pairId==="a").points,2);
  assert.equal(r.rows.find(x=>x.pairId==="b").points,1);
});

test("Liga 2026 rechaza STB como tercer set; la histórica sigue aceptándolo",()=>{
  const stb=[[6,4],[4,6],[10,8]];
  assert.throws(()=>engine.analyzeScore(stb,"three_sets"));
  assert.equal(engine.analyzeScore(stb).winnerSide,1);
});

test("Admin y sitio público seleccionan el reglamento por versión, sin reservas",()=>{
  const admin=read("js/admin-liga82.js");
  const site=read("js/torneos-liga-public82.js");
  assert.match(admin,/bp_league_save_result2026/);
  assert.match(admin,/Number\(current\?\.rules_version\) === 2026/);
  assert.match(site,/Number\(t.rules_version\) === 2026/);
  const sql=read("sql/SQL_91_LIGA_SETS_NORMALES_2026.sql");
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_league_save_result2026/);
  assert.doesNotMatch(sql,/UPDATE public\.(?:reservations|fixed_turn_requests|blockouts)/);
});
