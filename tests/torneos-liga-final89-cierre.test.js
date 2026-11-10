/* Boulevard Pádel · Parche 89 2C · cierre, lectura pública y borrado seguro
 * Pruebas estructurales: NO sustituyen pruebas SQL transaccionales.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const sql=fs.readFileSync(path.join(__dirname,"../sql/SQL_89_LIGA_CIERRE_PUBLICO_BORRADOR.sql"),"utf8");
const count=x=>(sql.match(x)||[]).length;

test("89 2C: desarrollo aislado, sin ejecución en producción",()=>{
  assert.match(sql,/NO INSTALAR EN SUPABASE/);
  assert.match(sql,/NO EJECUTAR NI GUARDAR EN SQL EDITOR/);
  assert.match(sql,/NO ES UNA MIGRACIÓN EJECUTABLE/);
  assert.doesNotMatch(sql,/^\s*DROP TABLE /im);
  assert.doesNotMatch(sql,/^\s*TRUNCATE /im);
});

test("89 2C: Liga debe completar todos los partidos de fase regular",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_league_finish_guard\(\)/);
  assert.match(sql,/NEW\.format='league' AND NEW\.status='completed'/);
  assert.match(sql,/FROM public\.bp_league_matches\s+WHERE tournament_id=NEW\.id AND match_status<>'played'/);
  assert.match(sql,/Completá todos los partidos de fase regular de Liga/);
});

test("89 2C: exige DOS semifinales disputadas y una final",()=>{
  assert.match(sql,/FROM public\.bp_league_final_matches\s+WHERE tournament_id=NEW\.id\)<>3/);
  assert.match(sql,/stage='semifinal'\s+AND match_status='played'\)<>2/);
  assert.match(sql,/Completá ambas semifinales antes de cerrar Liga/);
  assert.match(sql,/AND f\.match_status='played'/);
  assert.match(sql,/La final debe estar disputada/);
});

test("89 2C: finalistas de final deben coincidir con ganadores de semifinales",()=>{
  assert.match(sql,/f\.pair1_id=s1\.winner_pair_id/);
  assert.match(sql,/f\.pair2_id=s2\.winner_pair_id/);
  assert.match(sql,/f\.winner_pair_id IN\(f\.pair1_id,f\.pair2_id\)/);
  assert.match(sql,/f\.winner_pair_id IS NOT NULL/);
});

test("89 2C: consulta pública solo para Liga publicada, sin contacto",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_public_league_final89/);
  assert.match(sql,/format='league' AND is_published=true/);
  assert.match(sql,/IF NOT FOUND THEN RETURN NULL/);
  assert.match(sql,/'matches',coalesce/);
  assert.doesNotMatch(sql,/contact_phone|customer_email|customer_phone|player1_name|player2_name/i);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_public_league_final89\(uuid\)/);
  assert.match(sql,/TO anon,authenticated/);
});

test("89 2C: campeón y subcampeón solo tras final jugada y cierre oficial",()=>{
  assert.match(sql,/'champion_pair_id'/);
  assert.match(sql,/'runner_up_pair_id'/);
  assert.match(sql,/m\.match_status='played' AND v_t\.status='completed'/);
  assert.match(sql,/WHEN m\.winner_pair_id=m\.pair1_id THEN m\.pair2_id/);
  assert.match(sql,/WHEN m\.winner_pair_id=m\.pair2_id THEN m\.pair1_id/);
});

test("89 2C: vista previa incluye 3 partidos finales, resultados y bloqueos",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_admin_tournament_delete_preview/);
  assert.match(sql,/'league_final_matches'/);
  assert.match(sql,/'league_final_results'/);
  assert.match(sql,/b\.tournament_league_final_match_id IN/);
  assert.match(sql,/m\.tournament_id=p_tournament_id/);
});

test("89 2C: borrado definitivo sigue verificando admin, torneo y nombre",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_admin_delete_tournament_safely/);
  assert.match(sql,/auth\.uid\(\) IS NULL/);
  assert.match(sql,/public\.bp_tournament_is_admin\(\)/);
  assert.match(sql,/v_t\.name IS DISTINCT FROM p_expected_name/);
  assert.match(sql,/bp_revision_private\.operation_access/);
  assert.match(sql,/txid_current\(\)/);
  assert.match(sql,/t\.id=p_tournament_id AND t\.name=p_expected_name/);
});

test("89 2C: borrado final añade cuarta referencia a bloqueo y elimina tras liberar bloqueos",()=>{
  assert.equal(count(/OR b\.tournament_league_final_match_id IN/g),3);
  assert.match(sql,/v_league_final_matches bigint/);
  assert.match(sql,/DELETE FROM public\.bp_league_final_matches fm/);
  const posBlockout=sql.indexOf("DELETE FROM public.blockouts b");
  const posFinal=sql.indexOf("DELETE FROM public.bp_league_final_matches fm");
  const posRegular=sql.indexOf("DELETE FROM public.bp_league_matches lm");
  const posPairs=sql.indexOf("DELETE FROM public.bp_tournament_pairs p");
  assert.ok(posBlockout>=0&&posBlockout<posFinal&&posFinal<posRegular&&posRegular<posPairs);
  assert.match(sql,/'league_final_matches_deleted',v_league_final_matches/);
});

test("89 2C: reemplazos tienen privilegios equivalentes a los actuales",()=>{
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.bp_league_finish_guard\(\)/);
  assert.match(sql,/FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(sql,/GRANT EXECUTE ON FUNCTION public\.bp_league_finish_guard/);
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/SET search_path TO ''/);
});

test("89 2C: eliminación preserva reservas y otros torneos al filtrar por ID",()=>{
  assert.doesNotMatch(sql,/DELETE FROM public\.reservations/);
  assert.doesNotMatch(sql,/DELETE FROM public\.blockouts\s*;/);
  assert.doesNotMatch(sql,/DELETE FROM public\.bp_tournaments\s*;/);
  assert.match(sql,/WHERE fm\.tournament_id=p_tournament_id/);
  assert.match(sql,/WHERE lm\.tournament_id=p_tournament_id/);
  assert.match(sql,/WHERE p\.tournament_id=p_tournament_id/);
});
