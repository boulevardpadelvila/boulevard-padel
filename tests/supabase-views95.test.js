/* SQL95: prueba estática de alcance, sin conexión a datos reales. */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const sql=read("sql/SQL_95_TORNEOS_PUBLICOS_SECURITY_INVOKER.sql");
const publicJS=read("js/torneos-public.js");
test("SQL95 conserva las dos vistas, barrier y los mismos nombres de columnas",()=>{
  assert.match(sql,/ALTER VIEW public\.bp_public_tournament_groups\s+SET \(security_invoker = true\)/);
  assert.match(sql,/ALTER VIEW public\.bp_public_tournament_group_fixture\s+SET \(security_invoker = true\)/);
  assert.match(sql,/security_barrier=true/);
  for(const name of ["bp_public_tournament_groups","bp_public_tournament_group_fixture"])
    assert.ok(publicJS.includes('.from("'+name+'")'),name);
});
test("SQL95 respeta contactos, excluye pendientes y sólo lee publicados",()=>{
  assert.match(sql,/CREATE POLICY bp95_anon_assigned_approved_pairs/);
  assert.match(sql,/status = 'approved'/);
  assert.match(sql,/gp\.pair_id = bp_tournament_pairs\.id/);
  assert.match(sql,/gp\.tournament_id = bp_tournament_pairs\.tournament_id/);
  assert.match(sql,/t\.groups_published_at IS NOT NULL/);
  assert.match(sql,/t\.fixture_published_at IS NOT NULL/);
  assert.doesNotMatch(sql,/GRANT SELECT\s*\(\s*[^)]*contact_phone/);
  assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE|ALL) ON/);
  assert.doesNotMatch(sql,/(?:DROP|TRUNCATE) TABLE|DELETE FROM public\./i);
});
