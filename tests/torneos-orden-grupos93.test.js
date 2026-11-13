const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = p => fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("SQL93 valida la secuencia de grupos 4/3 al publicar y conserva el trigger original",()=>{
  const sql=read("sql/SQL_93_ORDEN_GRUPOS_2026.sql");
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_tournament_validate_group_sizes_3_4\(\)/);
  assert.match(sql,/OLD\.groups_published_at IS NULL AND NEW\.groups_published_at IS NOT NULL/);
  assert.match(sql,/NEW\.rules_version = 2026/);
  assert.match(sql,/NEW\.format = 'groups_knockout'/);
  assert.match(sql,/row_number\(\) OVER \(ORDER BY g\.group_number\)/);
  assert.match(sql,/s\.group_number <> s\.position/);
  assert.match(sql,/s\.position <= \(v_approved % 3\) THEN 4/);
  assert.match(sql,/v_assigned <> v_approved/);
  assert.match(sql,/v_invalid_order <> 0/);
  assert.doesNotMatch(sql,/\b(?:DELETE|TRUNCATE|DROP|ALTER TABLE|INSERT INTO|UPDATE public\.)\b/i);
  assert.doesNotMatch(sql,/SECURITY DEFINER/i);
  assert.doesNotMatch(sql,/\breservations\b|\bblockouts\b|\bfixed_turn_requests\b/i);
});

test("Admin consulta versión y bloquea publicación y fixture, pero permite reorganizar",()=>{
  const js=read("js/admin-grupos.js");
  assert.match(js,/id,name,format,rules_version,status,is_published/);
  assert.match(js,/const orderedGroups = !isRules2026/);
  assert.match(js,/g\.group_number === index \+ 1/);
  assert.match(js,/groupSizes\[index\] === \(index < approved\.length % 3 \? 4 : 3\)/);
  assert.match(js,/const eligible = canOrganize && orderedGroups;/);
  assert.match(js,/!published && canOrganize && groups\.length > 1/);
  assert.match(js,/published &&\s+complete &&\s+balanced &&\s+orderedGroups/);
  assert.match(js,/publishButton\.disabled = busy \|\| published \|\| !eligible/);
  assert.match(js,/No podés publicar esta distribución/);
});

test("Pruebas PostgreSQL 17 de 35 tamaños y distribuciones A/B/C invertidas",()=>{
  const sql=read("tests/fixtures/t93_postgres_smoke.sql");
  const workflow=read(".github/workflows/reglamento-6-40.yml");
  assert.match(sql,/FOR v_n IN 6\.\.40 LOOP/);
  assert.match(sql,/ARRAY\[7,10,11,14,40\]/);
  assert.match(sql,/EXCEPTION WHEN check_violation THEN/);
  assert.match(sql,/SELECT count\(\*\) FROM public\.reservations/);
  assert.match(workflow,/sql\/SQL_93_ORDEN_GRUPOS_2026\.sql/);
  assert.match(workflow,/tests\/fixtures\/t93_postgres_smoke\.sql/);
});
