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
  assert.match(sql,/v_t\.status IN \('registration_closed','in_progress'\)/);
  assert.match(sql,/v_t\.status='registration_open' AND v_t\.max_pairs=v_count/);
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
  assert.match(sql,/bp_league_assign_round/);
  assert.match(sql,/bp_public_league_followup/);
  for(const procedure of ["bp_league_generate_fixture","bp_league_schedule_match","bp_league_save_result","bp_league_assign_round"]){
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
  assert.match(html,/súper tie-break/i);
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
  assert.match(css,/\.bp-league__buttons\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bp-league__buttons button\s*\{[^}]*width:100%;height:47px;min-height:47px;max-height:47px/s);
  assert.match(css,/\.bp-league__dialog \.admin-save-dialog__actions\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.bp-league__dialog \.admin-save-dialog__actions > button\s*\{[^}]*height:48px;min-height:48px!important;max-height:48px/s);
  assert.match(cssPublic,/\.bp-public-league__table/);
  assert.match(cssPublic,/#00432e/);
  assert.match(cssPublic,/#a48335/);
  assert.match(cssPublic,/@media\(max-width:650px\)/);
});

test("Liga en producción necesitará desplegar su Edge Function de inscripción",()=>{
  const edge=read("supabase/functions/register-tournament-pair/index.ts");
  assert.match(edge, /select\("id,format,status,is_published,max_pairs,ends_on,registration_closes_at"\)/);
  assert.match(edge,/competition\.format !== "league" && competition\.ends_on < argentinaToday/);
  assert.match(edge,/competition\.status !== "registration_open"/);
  assert.match(edge,/competition\.max_pairs/);
  assert.match(edge,/turnstile/);
  assert.doesNotMatch(edge,/return json\(200.*contact_phone/s);
});
test("Liga protege el plantel y no permite finalizar con fechas pendientes",()=>{
  assert.match(sql,/bp_league_roster_locked/);
  assert.match(sql,/bp_league_lock_roster/);
  assert.match(sql,/bp_league_finish_ready/);
  assert.match(sql,/bp_league_finish_guard/);
  assert.match(sql,/v_t\.status IN \('registration_closed','in_progress'\)/);
  assert.match(sql,/status='pending'/);
  assert.match(sql,/ends_on IS NOT NULL/);
  assert.match(sql,/scheduled_ends_at IS NOT NULL AND scheduled_ends_at>scheduled_at/);
  assert.match(create,/if \(t\.format === "league"\)/);
  assert.match(create,/stats\.champion/);
});
test("Confirmación para generar fixture usa diálogo del Admin, no confirmación de Chrome",()=>{
  assert.match(html,/id="bp-league-generate-dialog"/);
  assert.match(html,/id="bp-league-generate-cancel"/);
  assert.match(html,/id="bp-league-generate-confirm"/);
  assert.match(admin,/askGenerateFixture\(count,current\.name\)/);
  assert.doesNotMatch(admin,/window\.confirm/);
  assert.match(css,/\.bp-league__dialog \.admin-save-dialog__actions/);
});


test("Modalidades visibles: Fase de grupos + eliminatorias y Liga, sin eliminación directa",()=>{
  const select=html.match(/<select id="torneo-format">([\s\S]*?)<\/select>/);
  assert.ok(select,"El selector de modalidad sigue visible");
  assert.match(select[1],/value="groups_knockout"/);
  assert.match(select[1],/value="league">Liga<\/option>/);
  assert.doesNotMatch(select[1],/value="knockout"/);
  assert.doesNotMatch(select[1],/Todos contra todos<\/option>/);
});
test("Sorteo: una rueda, sin Fechas asignadas, al cerrar inscripciones o completar cupo",()=>{
  assert.doesNotMatch(html,/id="bp-league-legs"/);
  assert.match(html,/id="bp-league-generate"[^>]*>[\s\S]*?Sortear partidos/);
  assert.match(admin,/engine\.buildSchedule\(\[\.\.\.pairs\.keys\(\)\],1\)/);
  assert.match(admin,/p_tournament_id:id,p_legs:1/);
  assert.match(admin,/current\.status==="registration_open"&&current\.approved===current\.max_pairs/);
  assert.match(sql,/p_legs IS DISTINCT FROM 1/);
  assert.match(sql,/legs smallint NOT NULL DEFAULT 1 CHECK \(legs=1\)/);
  assert.match(sql,/SELECT array_agg\(id ORDER BY draw_key\)/);
  assert.match(sql,/SELECT id,random\(\) AS draw_key/);
  assert.match(sql,/OR \(v_t\.status='registration_open' AND v_t\.max_pairs=v_count\)/);
  assert.match(sql,/SET status='registration_closed',updated_at=now\(\)/);
  assert.match(sql,/p_tournament_id,1,NULL,v_inserted/);
  assert.match(sql,/round_number integer CHECK \(round_number IS NULL/);
  assert.match(sql,/CONSTRAINT bp_league_match_order_unique/);
});
test("Asignación de Fecha: máximo dos por pareja, independiente del día y hora",()=>{
  assert.match(html,/id="bp-league-round-dialog"/);
  assert.match(html,/id="bp-league-round-number"/);
  assert.match(admin,/function openRound\(match\)/);
  assert.match(admin,/engine\.validateRoundAssignment\(matchList,match\.id,round\)/);
  assert.match(admin,/supabaseClient\.rpc\("bp_league_assign_round"/);
  assert.match(admin,/round===null\?"Partidos sin Fecha"/);
  assert.match(sql,/FUNCTION public\.bp_league_assign_round\(/);
  assert.match(sql,/v_p1_count>=2 OR v_p2_count>=2/);
  assert.match(sql,/pg_advisory_xact_lock|FOR UPDATE/);
  assert.match(sql,/v_m\.round_number IS NULL/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_league_assign_round\(uuid,integer\) TO authenticated/);
  assert.doesNotMatch(sql,/EXTRACT\(DOW FROM|date_part\('dow'/i);
  assert.match(publicRender,/Partidos sin Fecha/);
});


test("Liga aparece automáticamente tras cargar el selector y oculta paneles incompatibles",()=>{
  assert.match(admin,/new MutationObserver\(\(\)=>load\(\)\)\.observe\(select/);
  assert.match(admin,/classList\.toggle\("bp-league-active",league\)/);
  assert.match(css,/#admin-torneos-view\.bp-league-active #bp-results-panel/);
  assert.match(css,/#admin-torneos-view\.bp-league-active #bp-ko-panel/);
  assert.match(css,/#admin-torneos-view\.bp-league-active #bp-ko68-panel/);
  assert.match(admin,/groupsPanel\.hidden=league/);
});
