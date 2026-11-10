/* Boulevard Pádel · P89 2D · SQL consolidado (SOLO CONTRATOS ESTÁTICOS).
 * No ejecuta migraciones ni consulta producción.
 * NO sustituye ejecución transaccional en una base de pruebas aislada.
 */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const sql=fs.readFileSync(path.join(__dirname,"../sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql"),"utf8");
const at=s=>sql.indexOf(s);
const count=re=>(sql.match(re)||[]).length;

test("89 2D: SQL consolidado es BORRADOR, sin autorización de instalación",()=>{
  assert.match(sql,/NO INSTALAR EN SUPABASE/);
  assert.match(sql,/NO EJECUTAR NI GUARDAR EN SQL EDITOR/);
  assert.match(sql,/NO ES UNA MIGRACIÓN DEFINITIVA/);
});

test("89 2D: orden de dependencias 2A, 2B, 2C",()=>{
  const markers=[
    "CREATE TABLE public.bp_league_final_matches",
    "ADD COLUMN tournament_league_final_match_id uuid",
    "CREATE OR REPLACE FUNCTION public.bp_league_final_save_result89",
    "CREATE OR REPLACE FUNCTION public.bp_league_finish_guard",
    "CREATE OR REPLACE FUNCTION public.bp_admin_delete_tournament_safely"
  ];
  const positions=markers.map(at);
  assert.ok(positions.every(p=>p>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
});

test("89 2D: tabla nueva protegida con RLS, lectura exclusiva Admin",()=>{
  assert.equal(count(/CREATE TABLE public\.bp_league_final_matches\s*\(/g),1);
  assert.match(sql,/ALTER TABLE public\.bp_league_final_matches ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.bp_league_final_matches FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/CREATE POLICY bp_lf_admin_read/);
  assert.match(sql,/public\.bp_tournament_is_admin\(\)/);
});

test("89 2D: integridad de bloqueos contempla cuatro referencias",()=>{
  assert.match(sql,/ADD COLUMN tournament_league_final_match_id uuid/);
  assert.match(sql,/ADD CONSTRAINT bp_blockout_one_match CHECK\([\s\S]*?tournament_league_final_match_id\)<=1/);
  assert.match(sql,/CREATE UNIQUE INDEX bp_lf_blockout_unique/);
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_tournament_blockout_integrity_guard/);
});

test("89 2D: RPC Admin controladas y lectura pública sin contacto",()=>{
  for(const name of ["bp_league_prepare_final89","bp_league_final_schedule89","bp_league_final_save_result89"]){
    assert.equal(count(new RegExp("CREATE OR REPLACE FUNCTION public\\."+name+"\\(","g")),1);
  }
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_league_final_save_result89\(uuid,jsonb\)[\s\S]*?TO authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_public_league_final89\(uuid\)[\s\S]*?TO anon,authenticated/);
  assert.doesNotMatch(sql,/contact_phone|customer_phone|customer_email/i);
});

test("89 2D: partidos finales con 2 o 3 sets normales, nunca STB",()=>{
  assert.match(sql,/v_n NOT IN \(2,3\)/);
  assert.match(sql,/v_hi=6 AND v_lo<=4/);
  assert.match(sql,/v_hi=7 AND v_lo IN\(5,6\)/);
  assert.match(sql,/no súper tie-break/i);
});

test("89 2D: final anticipada solo recibe finalistas tras ambas semifinales",()=>{
  assert.match(sql,/v_sf1 IS NOT NULL AND v_sf2 IS NOT NULL/);
  assert.match(sql,/WHERE id=v_final\.id AND match_status='pending'/);
  assert.match(sql,/Conservar día\/hora de la final/);
});

test("89 2D: fase regular congelada luego de crear la fase final",()=>{
  assert.match(sql,/BEFORE INSERT OR UPDATE OR DELETE ON public\.bp_league_matches/);
  assert.match(sql,/IF TG_OP='INSERT' THEN/);
  assert.match(sql,/IF TG_OP='DELETE' THEN/);
  assert.match(sql,/NEW\.match_number,NEW\.round_number,NEW\.leg/);
  assert.match(sql,/NEW\.pair1_id,NEW\.pair2_id,NEW\.match_status/);
  assert.match(sql,/NEW\.sets,NEW\.sets_pair1,NEW\.sets_pair2,NEW\.winner_pair_id/);
});

test("89 2D: cierre oficial depende de la final jugada, no de la tabla",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_league_finish_guard/);
  assert.match(sql,/stage='semifinal'[\s\S]*?match_status='played'/);
  assert.match(sql,/f\.pair1_id=s1\.winner_pair_id/);
  assert.match(sql,/f\.pair2_id=s2\.winner_pair_id/);
  assert.match(sql,/m\.match_status='played' AND v_t\.status='completed'/);
});

test("89 2D: borrado íntegro respeta IDs y no borra reservas",()=>{
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_admin_delete_tournament_safely/);
  assert.match(sql,/bp_revision_private\.operation_access/);
  assert.match(sql,/WHERE fm\.tournament_id=p_tournament_id/);
  assert.doesNotMatch(sql,/\bDELETE FROM public\.reservations\b/i);
  assert.doesNotMatch(sql,/\bUPDATE public\.bp_league_matches\b/i);
  assert.doesNotMatch(sql,/\bTRUNCATE\s+(?:public\.)?/i);
});

test("89 2D: solo una definición por cada función principal",()=>{
  for(const name of ["bp_league_finish_guard","bp_tournament_blockout_integrity_guard","bp_public_league_final89","bp_admin_delete_tournament_safely","bp_admin_tournament_delete_preview"]){
    assert.equal(count(new RegExp("CREATE OR REPLACE FUNCTION public\\."+name+"\\(","g")),1);
  }
});

test("89 2D: migración SQL atómica con espera máxima corta",()=>{
  assert.match(sql,/\bBEGIN;\s*SET LOCAL lock_timeout = '5s';\s*SET LOCAL statement_timeout = '90s';/);
  assert.match(sql,/\bCOMMIT;\s*$/);
  assert.equal(count(/^BEGIN;$/gm),1);
  assert.equal(count(/^COMMIT;$/gm),1);
});

test("89 2D: reemplazo de RPC administrativas no abre permisos al público",()=>{
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.bp_admin_tournament_delete_preview\(uuid\)\s+FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_admin_tournament_delete_preview\(uuid\)\s+TO authenticated/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.bp_admin_delete_tournament_safely\(uuid,text\)\s+FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_admin_delete_tournament_safely\(uuid,text\)\s+TO authenticated/);
});

test("89 2F: desempate manual solo dentro de igualdad y con motivo auditado",()=>{
  assert.match(sql,/CREATE TABLE public\.bp_league_final_tiebreak_decisions89/);
  assert.match(sql,/bp_league_final_tiebreak_decisions89 ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/REVOKE ALL ON public\.bp_league_final_tiebreak_decisions89/);
  assert.match(sql,/CREATE POLICY bp_lf_tiebreak_admin_read89/);
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_league_prepare_final_manual89/);
  assert.match(sql,/rank\(\) OVER\(ORDER BY points DESC,sd DESC,sf DESC/);
  assert.match(sql,/first_seed<=seed AND first_seed\+group_size-1>=seed/);
  assert.match(sql,/v_unique<>4 OR v_invalid<>0/);
  assert.match(sql,/VALUES\(p_tournament_id,p_qualifiers,btrim\(p_reason\),auth\.uid\(\)\)/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_league_prepare_final_manual89\(uuid,uuid\[\],text\)\s+TO authenticated/);
});
