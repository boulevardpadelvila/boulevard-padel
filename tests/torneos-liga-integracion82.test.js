/* Boulevard Pádel · Etapa Liga: contrato de integración / seguridad */
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const sql=read("sql/SQL_82_LIGA_TEMPORADA.sql");
const html=read("admin/index.html");
const publicHTML=read("index.html");
const admin=read("js/admin-liga82.js");
const publicJS=read("js/torneos-public.js");
const publicRender=read("js/torneos-liga-public82.js");
const create=read("js/admin-torneos.js");
const css=read("css/admin-liga82.css");
const cssPublic=read("css/torneos-liga82.css");

test("Liga se integra dentro de Torneos, no crea navegación paralela",()=>{
  assert.match(html,/id="admin-torneos-view"/);
  assert.match(html,/id="bp-league-panel"/);
  assert.match(html,/id="torneos-groups-panel"/);
  assert.match(html,/id="torneos-pairs-tournament"/);
  assert.match(html,/src="\.\.\/js\/torneos-liga-motor\.js"/);
  assert.match(html,/src="\.\.\/js\/admin-liga82\.js"/);
  assert.match(html,/href="\.\.\/css\/admin-liga82\.css"/);
  assert.match(admin,/select\.addEventListener\("change",load\)/);
  assert.match(admin,/updateVisible\(true\)/);
  assert.match(admin,/groupsPanel\.hidden=league/);
});
test("Liga utiliza inscripciones ya existentes pero no exige fecha final",()=>{
  assert.match(create,/const format = \$\("torneo-format"\)\.value/);
  assert.match(create,/ends_on = format === "league" \? null :/);
  assert.match(create,/format === "league" && max_pairs > 64/);
  assert.match(create,/endWrap\.hidden = league/);
  assert.match(create,/t\.format === "league" \? "" : t\.ends_on/);
  assert.match(sql,/ALTER TABLE public\.bp_tournaments ALTER COLUMN ends_on DROP NOT NULL/);
  assert.match(sql,/v_t\.status NOT IN \('registration_closed','in_progress'\)/);
  assert.match(sql,/status='approved'/);
});
test("SQL 82 NO está ejecutada: RLS, permisos seguros y RPC sin teléfono público",()=>{
  assert.match(sql,/NO INSTALADA/);
  assert.match(sql,/ALTER TABLE public\.bp_league_matches ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/ALTER TABLE public\.bp_league_settings ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/bp_league_matches_admin_read/);
  assert.match(sql,/bp_league_generate_fixture/);
  assert.match(sql,/bp_league_schedule_match/);
  assert.match(sql,/bp_league_save_result/);
  assert.match(sql,/bp_public_league_followup/);
  for(const procedure of ["bp_league_generate_fixture","bp_league_schedule_match","bp_league_save_result"]){
    assert.match(sql,new RegExp("REVOKE ALL ON FUNCTION public\\."+procedure));
    assert.match(sql,new RegExp("GRANT EXECUTE ON FUNCTION public\\."+procedure));
  }
  assert.match(sql,/WHERE id=p_tournament_id AND format='league' AND is_published=true/);
  assert.doesNotMatch(sql,/player1_name.*contact_phone|player2_name.*contact_phone/);
  assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE|ALL) ON public\.bp_league_matches TO anon/i);
  assert.doesNotMatch(sql,/TRUNCATE\s+|DROP TABLE\s+public\.bp_tournaments/i);
});
test("SQL 82 protege reservas y todos los bloqueos, incluido borrado seguro",()=>{
  assert.match(sql,/tournament_league_match_id/);
  assert.match(sql,/num_nonnulls\(tournament_group_match_id,tournament_knockout_match_id,tournament_league_match_id\)/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/FROM public\.reservations r/);
  assert.match(sql,/FROM public\.blockouts b/);
  assert.match(sql,/bp_tournament_blockout_integrity_guard/);
  assert.match(sql,/bp_admin_delete_tournament_safely/);
  assert.match(sql,/bp_admin_tournament_delete_preview/);
  assert.match(sql,/DELETE FROM public\.bp_league_matches/);
  assert.doesNotMatch(sql,/DELETE FROM public\.reservations|TRUNCATE public\.blockouts/);
});
test("Resultado Liga es 2 sets más súper tie-break; no tercero normal",()=>{
  assert.match(sql,/v_i=2 AND NOT\(\(v_high=10 AND v_low<=8\)/);
  assert.match(sql,/v_high>10 AND v_high-v_low=2/);
  assert.match(admin,/engine\.analyzeScore\(sets\)/);
  assert.match(admin,/p_sets:sets/);
  assert.match(html,/Súper tie-break/);
  assert.match(html,/bp-league-result-form/);
  assert.match(admin,/inputs\.slice\(0,2\)/);
  assert.match(admin,/toggleThird/);
});
test("Vista pública Liga: fixture, tabla, campeón y RPC con información filtrada",()=>{
  assert.match(publicHTML,/src="js\/torneos-liga-motor\.js"/);
  assert.match(publicHTML,/src="js\/torneos-liga-public82\.js"/);
  assert.match(publicHTML,/href="css\/torneos-liga82\.css"/);
  assert.ok(publicHTML.indexOf('src="js/torneos-liga-public82.js"')<
    publicHTML.indexOf('src="js/torneos-public.js"'));
  assert.match(publicJS,/bp_public_league_followup/);
  assert.match(publicJS,/publicLeagueByTournament/);
  assert.match(publicJS,/Inicio estimado:/);
  assert.match(publicJS,/t\.format==="league"/);
  assert.match(publicRender,/Calendario de Liga/);
  assert.match(publicRender,/Tabla general/);
  assert.match(publicRender,/Campeones/);
  assert.doesNotMatch(publicRender,/contact_phone|teléfono|telefono/);
});
test("Todos los botones de Liga son simétricos en escritorio y móvil",()=>{
  assert.match(css,/\.bp-league__buttons\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bp-league__buttons button\s*\{[^}]*width:100%;height:47px;min-height:47px;max-height:47px/s);
  assert.match(css,/\.bp-league__dialog \.admin-save-dialog__actions\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bp-league__dialog \.admin-save-dialog__actions > button\s*\{[^}]*height:48px;min-height:48px!important;max-height:48px/s);
  assert.match(cssPublic,/\.bp-public-league__table/);
  assert.match(cssPublic,/#00432e/);
  assert.match(cssPublic,/#a48335/);
  assert.match(cssPublic,/@media\(max-width:650px\)/);
});
