/* P89 etapa 2A · contrato SQL de seguridad (sin instalar la migración). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sql = fs.readFileSync(path.join(__dirname, "../sql/SQL_89_LIGA_FASE_FINAL_BORRADOR.sql"), "utf8");

test("89 SQL: NO instalar, sin alterar la fase regular", () => {
  assert.match(sql, /NO INSTALAR EN SUPABASE/);
  assert.match(sql, /NO EJECUTAR NI GUARDAR EN SQL EDITOR/);
  assert.match(sql, /CREATE TABLE public\.bp_league_final_matches/);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM|ALTER TABLE)\s+public\.bp_league_matches\b/i);
  assert.doesNotMatch(sql, /(?:UPDATE|DELETE FROM|ALTER TABLE)\s+public\.reservations\b/i);
});

test("89 SQL: tres cruces únicos, no tercer puesto", () => {
  assert.match(sql, /stage='semifinal' AND slot IN \(1,2\)/);
  assert.match(sql, /stage='final' AND slot=1/);
  assert.match(sql, /bp_lf_unique_match UNIQUE\(tournament_id,stage,slot\)/);
  assert.match(sql, /'semifinal',1,v_qualifiers\[1\],v_qualifiers\[3\]/);
  assert.match(sql, /'semifinal',2,v_qualifiers\[2\],v_qualifiers\[4\]/);
  assert.match(sql, /'final',1,NULL,NULL/);
  assert.doesNotMatch(sql, /third_place|thirdplace|tercer_puesto/i);
});

test("89 SQL: tabla privada, solo consulta admin y escrituras por RPC", () => {
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.bp_league_final_matches FROM PUBLIC,anon,authenticated/);
  assert.match(sql, /FOR SELECT TO authenticated/);
  assert.match(sql, /public\.bp_tournament_is_admin\(\)/);
  assert.doesNotMatch(sql, /GRANT (?:ALL|INSERT|UPDATE|DELETE) ON public\.bp_league_final_matches TO (?:anon|authenticated)/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.bp_league_prepare_final89\(uuid\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bp_league_prepare_final89\(uuid\)/);
  assert.match(sql, /auth\.uid\(\) IS NULL/);
});

test("89 SQL: doble control de estado y resultados antes de generar", () => {
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /FOR SHARE/);
  assert.match(sql, /v_t\.status NOT IN\('registration_closed','in_progress'\)/);
  assert.match(sql, /match_status<>'played'/);
  assert.match(sql, /fase final ya existe/);
});

test("89 SQL: orden de desempates coincide con el motor de Liga", () => {
  assert.match(sql, /points DESC,sd DESC,sf DESC,\s*gd DESC,gf DESC/);
  assert.match(sql, /PARTITION BY points,sd,sf,gd,gf/);
  assert.match(sql, /WHERE pos<=4/);
  assert.match(sql, /IF coalesce\(v_tied,false\)/);
  assert.match(sql, /Martín debe resolverlo/);
  assert.match(sql, /WHEN m\.winner_pair_id=m\.pair1_id THEN 2/);
  assert.match(sql, /WHEN m\.sets_pair1=1 THEN 1/);
});

test("89 SQL: nuevos resultados no afectan la tabla de posiciones", () => {
  assert.match(sql, /m\.sets->0/);
  assert.match(sql, /m\.sets->1/);
  assert.doesNotMatch(sql, /m\.sets->2/);
  assert.match(sql, /bp_league_final_matches/);
  assert.match(sql, /bp_lf_participants CHECK/);
  assert.match(sql, /bp_lf_score_valid CHECK/);
  assert.match(sql, /FOREIGN KEY\(pair1_id,tournament_id\)/);
});
