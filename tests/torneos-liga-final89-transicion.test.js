/* Boulevard Pádel · P89: contrato de transición al campeón por final. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const admin=fs.readFileSync(path.join(__dirname,"../js/admin-torneos.js"),"utf8");
const pub=fs.readFileSync(path.join(__dirname,"../js/torneos-liga-public82.js"),"utf8");

test("89 Admin: nunca finaliza Liga por líder de tabla regular",()=>{
  assert.match(admin,/if \(t\.format === "league"\)/);
  assert.doesNotMatch(admin,/if\s*\(!stats\.champion\)/);
  assert.match(admin,/bp_league_final_matches/);
  assert.match(admin,/final\.winner_pair_id/);
});

test("89 Admin: todas las fechas normales completas, sin truncar resultados a 1000",()=>{
  assert.match(admin,/count: "exact", head: true/);
  assert.match(admin,/total\.count !== played\.count/);
  assert.match(admin,/Completá la fase regular antes de finalizar la Liga/);
});

test("89 Admin: exactamente dos semifinales jugadas y final válida",()=>{
  assert.match(admin,/matches\.length !== 3/);
  assert.match(admin,/sf1\?\.match_status !== "played"/);
  assert.match(admin,/sf2\?\.match_status !== "played"/);
  assert.match(admin,/final\?\.match_status !== "played"/);
  assert.match(admin,/final\.pair1_id !== sf1\.winner_pair_id/);
  assert.match(admin,/final\.pair2_id !== sf2\.winner_pair_id/);
});

test("89 Admin: vista previa contabiliza partidos/resultados de Liga final",()=>{
  assert.match(admin,/Number\(preview\.league_final_matches \|\| 0\)/);
  assert.match(admin,/Number\(preview\.league_final_results \|\| 0\)/);
  assert.match(admin,/preview\.linked_blockouts/);
});

test("89 Público: primera posición es clasificación, NO campeón",()=>{
  assert.match(pub,/el campeón y subcampeón se definen en la final/);
  assert.doesNotMatch(pub,/Campeones:.*results\.champion/);
  assert.doesNotMatch(pub,/results\.champion/);
  assert.match(pub,/const results = engine\.standings/);
});
