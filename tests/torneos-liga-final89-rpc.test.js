/* Boulevard Pádel · Parche 89 · RPC SQL (solo verificación estructural) */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sql = fs.readFileSync(
  path.join(__dirname, "../sql/SQL_89_LIGA_FASE_FINAL_RPC_BORRADOR.sql"),
  "utf8",
);

test("89 RPC: borrador NO autorizado para Supabase", () => {
  assert.match(sql, /NO INSTALAR EN SUPABASE/);
  assert.match(sql, /NO EJECUTAR NI GUARDAR EN SQL EDITOR/);
  assert.match(sql, /NO ES UNA MIGRACIÓN EJECUTABLE/);
});

test("89 RPC: añadir vínculo a bloqueos sin perder los tres existentes", () => {
  assert.match(sql, /ADD COLUMN tournament_league_final_match_id uuid/);
  assert.match(sql, /REFERENCES public\.bp_league_final_matches\(id\)/);
  assert.match(sql, /bp_blockout_one_match/);
  assert.match(sql, /bp_tournament_blockout_requires_match/);
  assert.match(sql, /bp_blockout_tournament_type_valid/);
  assert.match(sql, /bp_lf_blockout_unique/);
  for (const col of [
    "tournament_group_match_id",
    "tournament_knockout_match_id",
    "tournament_league_match_id",
    "tournament_league_final_match_id"
  ]) {
    assert.match(sql, new RegExp(col));
  }
});

test("89 RPC: guardianes protegen bloqueos activos y relaciones existentes", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.bp_tournament_blockout_integrity_guard/);
  assert.match(sql, /OLD\.tournament_league_final_match_id/);
  assert.match(sql, /OLD\.tournament_league_match_id/);
  assert.match(sql, /OLD\.tournament_group_match_id/);
  assert.match(sql, /OLD\.tournament_knockout_match_id/);
  assert.match(sql, /No se puede borrar un bloqueo activo de partido/);
  assert.match(sql, /No se puede desvincular el bloqueo de su partido/);
  assert.match(sql, /bloqueo debe coincidir con la programación/);
});

test("89 RPC: programación flexible de semifinales y final sin exigir ganadores anticipados", () => {
  assert.match(sql, /bp_league_final_schedule89/);
  assert.match(sql, /FINAL antes de conocer finalistas/);
  assert.match(sql, /p_start timestamptz,p_duration_minutes integer/);
  assert.match(sql, /p_duration_minutes NOT IN\(90,120\)/);
  assert.match(sql, /schedule_status='scheduled'/);
  assert.match(sql, /schedule_status='postponed'/);
  assert.match(sql, /scheduled_ends_at=NULL/);
  assert.match(sql, /No se puede reprogramar un partido disputado/);
});

test("89 RPC: no puede ocupar cancha de reservas ni partidos existentes", () => {
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /FROM public\.reservations r/);
  assert.match(sql, /r\.status<>'cancelled'/);
  assert.match(sql, /FROM public\.blockouts b/);
  assert.match(sql, /b\.active AND b\.id IS DISTINCT FROM v_block/);
  assert.match(sql, /b\.starts_at<v_end AND b\.ends_at>p_start/);
  assert.match(sql, /Horario ocupado por reserva u otro partido/);
});

test("89 RPC: resultados semifinal y final usan sets normales, nunca STB", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.bp_league_final_save_result89/);
  assert.match(sql, /v_n NOT IN \(2,3\)/);
  assert.match(sql, /v_hi=6 AND v_lo<=4/);
  assert.match(sql, /v_hi=7 AND v_lo IN\(5,6\)/);
  assert.match(sql, /no súper tie-break/i);
  assert.match(sql, /v_n=3 AND least\(v_s1,v_s2\)<>1/);
  assert.match(sql, /v_n=2 AND least\(v_s1,v_s2\)<>0/);
  assert.match(sql, /No corresponde otro set/);
});

test("89 RPC: final solo recibe DOS ganadores; protege corrección posterior", () => {
  assert.match(sql, /v_sf1 IS NOT NULL AND v_sf2 IS NOT NULL/);
  assert.match(sql, /THEN v_sf1 ELSE NULL END/);
  assert.match(sql, /THEN v_sf2 ELSE NULL END/);
  assert.match(sql, /La final ya tiene resultado: no se puede corregir una semifinal/);
  assert.match(sql, /Esperá el resultado de ambas semifinales/);
  assert.match(sql, /Conservar día\/hora de la final/);
});

test("89 RPC: modificaciones sujetas a admin real y privilegios explícitos", () => {
  for (const name of ["bp_league_final_schedule89", "bp_league_final_save_result89"]) {
    assert.match(sql, new RegExp("CREATE OR REPLACE FUNCTION public\\." + name));
    assert.match(sql, new RegExp("REVOKE ALL ON FUNCTION public\\." + name));
    assert.match(sql, new RegExp("GRANT EXECUTE ON FUNCTION public\\." + name));
  }
  assert.match(sql, /auth\.uid\(\) IS NULL/);
  assert.match(sql, /public\.bp_tournament_is_admin\(\)/);
  assert.match(sql, /v_t\.format<>'league'/);
  assert.match(sql, /status NOT IN\('registration_closed','in_progress'\)/);
});

test("89 RPC: congelar marcadores regulares sin bloquear cambios de programación", () => {
  assert.match(sql, /bp_league_final_lock_regular89/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON public\.bp_league_matches/);
  assert.match(sql, /NEW\.match_status,NEW\.sets,NEW\.sets_pair1,NEW\.sets_pair2,NEW\.winner_pair_id/);
  assert.doesNotMatch(sql, /NEW\.scheduled_at,NEW\.scheduled_ends_at/);
  assert.match(sql, /Fase final generada: los resultados de Liga están cerrados/);
});

test("89 RPC: no toca resultados ni reservas existentes directamente", () => {
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM)\s+public\.bp_league_matches(?:\s|;)/i);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM)\s+public\.reservations(?:\s|;)/i);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM)\s+public\.bp_tournament_knockout_matches(?:\s|;)/i);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM)\s+public\.bp_tournament_group_matches(?:\s|;)/i);
});
