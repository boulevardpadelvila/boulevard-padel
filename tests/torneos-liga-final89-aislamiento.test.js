/* P89: garantías estructurales de aislamiento del turnero y turnos fijos.
 * Complementan, no reemplazan, pruebas de datos transaccionales aisladas.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=(name)=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const sql=read("sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql");
const admin=read("js/admin-liga-final89-ui.js");
const publicUI=read("js/torneos-liga-final89-public.js");
const workflow=read(".github/workflows/p89-liga-final.yml");
const regular=read("js/admin-liga82.js");

test("P89 aislamiento: NO altera estructura, filas ni RPC de turnos fijos",()=>{
  assert.doesNotMatch(sql,/public\.fixed_turn_requests|ALTER TABLE public\.reservations|ALTER TABLE public\.weekly_hours/i);
  assert.doesNotMatch(sql,/UPDATE public\.reservations|DELETE FROM public\.reservations|TRUNCATE public\.reservations|TRUNCATE public\.blockouts/i);
  assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION public\.(create_booking|create_admin_booking|create_fixed|bp_fixed)/i);
  assert.doesNotMatch(admin,/fixed_turn_requests|weekly_hours|create_booking|create_admin_booking/);
  assert.doesNotMatch(publicUI,/fixed_turn_requests|weekly_hours|create_booking|create_admin_booking/);
});

test("P89 aislamiento: bloqueos de torneo limitados al partido final o torneo afectado",()=>{
  assert.match(sql,/ADD COLUMN tournament_league_final_match_id uuid/);
  assert.match(sql,/WHERE tournament_league_final_match_id=p_match_id/);
  assert.match(sql,/b\.id IS DISTINCT FROM v_block/);
  assert.match(sql,/b\.court_id=v_court/);
  assert.match(sql,/r\.status<>'cancelled'/);
  assert.match(sql,/public\.bp_tournament_delete_allowed/);
  assert.match(sql,/WHERE fm\.tournament_id=p_tournament_id/);
});

test("P89 Admin: la fase regular cierra correcciones al confirmar fase final",()=>{
  assert.match(regular,/regularLocked = false/);
  assert.match(regular,/bp:league-final-state/);
  assert.match(regular,/m\.round_number == null \|\| regularLocked/);
  assert.match(admin,/new CustomEvent\("bp:league-final-state"/);
  assert.match(admin,/locked: finalMatches\.length > 0/);
  assert.match(sql,/bp_league_final_lock_regular89/);
});

test("P89 CI: temporada realista y simulaciones solo PostgreSQL descartable",()=>{
  assert.match(workflow,/image: postgres:17/);
  assert.match(workflow,/p89_postgres_smoke\.sql/);
  assert.match(workflow,/p89_postgres_race\.sh/);
  assert.match(workflow,/p89_postgres_12pairs\.js/);
  assert.match(workflow,/p89_postgres_12pairs_check\.sql/);
  assert.doesNotMatch(workflow,/SUPABASE_DB_URL|supabase db push|apply_migration/);
});
