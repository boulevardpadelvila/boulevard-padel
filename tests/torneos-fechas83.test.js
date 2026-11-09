/* Boulevard Pádel · Parche 83 · Fechas automáticas y games visibles. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const group=require("../js/torneos-motor.js");
const league=require("../js/torneos-liga-motor.js");
const sql=read("sql/SQL_83_LIGA_FECHAS_AUTOMATICAS.sql");
const groupAdmin=read("js/admin-resultados.js");
const groupPublic=read("js/torneos-public.js");
const leagueAdmin=read("js/admin-liga82.js");
const leaguePublic=read("js/torneos-liga-public82.js");
const publicHTML=read("index.html");
const adminHTML=read("admin/index.html");
const css=read("css/torneos-tablas83.css");
const ids=n=>Array.from({length:n},(_,i)=>"pareja"+(i+1));

test("Liga: con 12 parejas hay 11 Fechas, 6 partidos por Fecha y 66 en total",()=>{
  const matches=league.buildSchedule(ids(12));
  assert.equal(matches.length,66);
  const dates=new Map();
  for(const m of matches){
    if(!dates.has(m.roundNumber))dates.set(m.roundNumber,[]);
    dates.get(m.roundNumber).push(m);
  }
  assert.equal(dates.size,11);
  for(const round of dates.values()){
    assert.equal(round.length,6);
    const players=round.flatMap(m=>[m.pair1Id,m.pair2Id]);
    assert.equal(new Set(players).size,12);
  }
});
test("Liga: impares y pares tienen rondas completas sin repetir parejas por Fecha",()=>{
  for(const n of [2,3,4,5,7,8,10,11,13,16,31,64]){
    const fixtures=league.buildSchedule(ids(n));
    assert.equal(fixtures.length,n*(n-1)/2);
    const expectedDates=n%2===0?n-1:n;
    const expectedGames=Math.floor(n/2);
    for(let round=1;round<=expectedDates;round++){
      const games=fixtures.filter(m=>m.roundNumber===round);
      assert.equal(games.length,expectedGames,"n="+n+" round="+round);
      const players=games.flatMap(m=>[m.pair1Id,m.pair2Id]);
      assert.equal(new Set(players).size,expectedGames*2);
    }
  }
});
test("Grupos: GF, GC y Dif.G suman games normales, nunca puntos de súper tie-break",()=>{
  assert.deepEqual(group.countNormalGames([[6,4],[4,6],[10,8]],"super_tb"),[10,10]);
  assert.deepEqual(group.countNormalGames([[6,3],[3,6],[7,5]],"three_sets"),[16,14]);
  assert.deepEqual(group.countNormalGames([[6,3],[3,6],[11,9]],"legacy"),[9,9]);
  const table=group.calculateGroupStandings(["A","B","C"],{
    A1:{sets:[[6,4],[4,6],[10,8]],format:"super_tb"}
  });
  const rows=new Map(table.table.map(r=>[r.pairId,r]));
  assert.equal(rows.get("A").gamesFor,10);
  assert.equal(rows.get("A").gamesAgainst,10);
  assert.equal(rows.get("A").gameDifference,0);
  assert.equal(rows.get("B").gamesFor,10);
  assert.equal(rows.get("C").gamesFor,0);
  assert.equal(rows.get("A").points,3);
  assert.equal(rows.get("B").points,0);
});
test("Admin y público de grupos muestran GF/GC/Dif.G y referencias accesibles",()=>{
  assert.match(groupAdmin,/"GF",\s*"GC",\s*"Dif.G"/);
  assert.match(groupAdmin,/row\.gamesFor/);
  assert.match(groupAdmin,/row\.gamesAgainst/);
  assert.match(groupAdmin,/row\.gameDifference/);
  assert.match(groupAdmin,/motor\.standingsLegend/);
  assert.match(groupPublic,/const cols = \["Pos\.","Pareja","PJ","PG","PP","SF","SC","Dif\.","GF","GC","Dif.G","Pts"\]/);
  assert.match(groupPublic,/window\.BPTournamentEngine\.countNormalGames/);
  assert.match(groupPublic,/window\.BPTournamentEngine\.standingsLegend/);
  for(const term of ["PJ:","PG:","PP:","SF:","SC:","Dif.:","GF:","GC:","Dif.G:","Pts:"])
    assert.ok(group.standingsLegend.includes(term),term);
});
test("Liga presenta 2 acciones por partido y leyenda de posiciones",()=>{
  assert.match(leagueAdmin,/buttons\.append\(plan,result\)/);
  assert.doesNotMatch(leagueAdmin,/buttons\.append\(roundAction/);
  assert.match(leagueAdmin,/window\.BPTournamentEngine\.standingsLegend/);
  assert.match(leaguePublic,/root\.BPTournamentEngine\.standingsLegend/);
  assert.match(css,/\.bp-league__buttons\s*\{\s*grid-template-columns:\s*repeat\(2/);
  assert.match(publicHTML,/href="css\/torneos-tablas83\.css"/);
  assert.match(adminHTML,/href="\.\.\/css\/torneos-tablas83\.css"/);
});
test("SQL83 asigna Fechas en sorteo y solo rellena fixtures antiguos sin cambios",()=>{
  assert.match(sql,/p_tournament_id,1,v_round,v_inserted/);
  assert.match(sql,/'rounds_assigned',v_size-1/);
  assert.match(sql,/v_p1_count>=1 OR v_p2_count>=1/);
  assert.match(sql,/v_item\.without_round<>v_item\.matches/);
  assert.match(sql,/v_item\.with_schedule<>0 OR v_item\.with_result<>0/);
  assert.match(sql,/v_item\.first_number<>1 OR v_item\.last_number<>v_expected/);
  assert.match(sql,/GROUP BY round_no,pair_id HAVING count\(\*\)>1/);
  assert.match(sql,/SET round_number=\(m\.match_number-1\)\/v_per_round\+1/);
  assert.match(sql,/auth\.uid\(\) IS NULL OR NOT public\.bp_tournament_is_admin\(\)/);
  assert.doesNotMatch(sql,/\bDELETE\s+FROM\s+public\.(reservations|blockouts|bp_league_matches)/i);
});
