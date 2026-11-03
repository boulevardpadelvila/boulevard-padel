/* Boulevard Pádel · Parche 62: acciones de resultado junto al fixture. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('Parche 62: un único punto de carga y corrección por partido',()=>{
 const results=read('js/admin-resultados.js'),fixture=read('js/admin-grupos.js');
 assert.match(fixture,/entry\.dataset\.matchId = match\.id;/);
 assert.match(results,/syncFixtureResultActions\(data,pairMap,byResult\)/);
 assert.match(results,/document\.querySelector\('\.torneos-fixture-list'\)/);
 assert.match(results,/\.torneos-fixture-entry\[data-match-id\]/);
 assert.match(results,/torneos-fixture-entry__button--result/);
 assert.match(results,/Corregir resultado/);
 assert.match(results,/Cargar resultado/);
 assert.match(results,/Esperando resultados previos/);
 assert.doesNotMatch(results,/const row = element\('div','', 'bp-results-match'\)/);
 assert.match(results,/tableForStandings\(standings,pairMap\)/);
});
test('Parche 62: reglas y guardado de sets sin cambios de backend',()=>{
 const results=read('js/admin-resultados.js');
 assert.match(results,/bp_admin_save_group_match_result/);
 assert.match(results,/motor\.evaluateSets\(\{sets\}, 'super_tb'\)/);
 assert.match(results,/Corrección de resultado desde Admin/);
 assert.match(results,/selectedData !== data/);
 assert.match(results,/fixture_published_at/);
 assert.match(results,/registration_closed','in_progress/);
});
test('Parche 62: verde y dorado responsive, hoja cargada al final',()=>{
 const css=read('css/admin-partidos62.css'),html=read('admin/index.html');
 assert.match(css,/--result:not\(:disabled\)/);
 assert.match(css,/#d9b65a/);
 assert.match(css,/@media \(max-width: 580px\)/);
 assert.match(html,/href="\.\.\/css\/admin-partidos62\.css"/);
 assert.ok(html.indexOf('admin-partidos62.css')>html.indexOf('admin-torneos-compacto61.css'));
});
