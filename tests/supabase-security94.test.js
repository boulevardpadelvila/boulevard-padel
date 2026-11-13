/* SQL94: contrato de seguridad observable desde frontend en Cloudflare y localhost.
 * Solo lee código; no requiere credenciales, navegador ni base productiva.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const sql = read("sql/SQL_94_MINIMO_PRIVILEGIO_RPC.sql");
const reservas = read("js/reservas.js");
const admin = read("js/admin.js");
const publicTournaments = read("js/torneos-public.js");
const config = read("js/supabase-config.js");

const internals = [
  "bp_guard_group_fixture_publication",
  "bp_guard_published_fixture_matches",
  "bp_guard_published_group_rows",
  "bp_guard_published_roster",
  "bp_guard_published_tournament",
  "bp_guard_started_group_match",
  "bp_guard_started_group_roster",
  "bp_guard_started_group_structure",
  "bp_knockout_validate_seven_bracket",
  "bp_ko_freeze_started_bracket",
  "bp_ko_match_schedule_sync",
  "bp_ko_seed_matches",
  "bp_pairs_enforce_capacity",
  "bp_reservation_blockout_guard",
  "bp_tournaments_guard_capacity"
];

test("SQL94 restringe exactamente los 15 disparadores internos, no las funciones públicas", () => {
  assert.equal(internals.length, 15);
  for (const name of internals) {
    assert.ok(sql.includes("REVOKE EXECUTE ON FUNCTION public." + name + "() FROM PUBLIC, anon, authenticated;"), name);
    assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION public." + name + "() TO service_role;"), name);
  }
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.rls_auto_enable\(\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.generate_booking_code\(\) FROM PUBLIC, anon, authenticated;/);
  assert.match(sql, /ALTER FUNCTION public\.set_updated_at\(\) SET search_path = '';/);
  for (const rpc of ["get_booking_config","get_available_slots_flexible","cancel_booking_by_code",
     "get_booking_by_code","bp_public_tournament_followup","bp_public_league_final89",
     "bp_tournament_bracket_report2026","is_admin","bp_tournament_is_admin"]) {
    assert.ok(!new RegExp("REVOKE EXECUTE ON FUNCTION public\\." + rpc + "\\(").test(sql), "No restringir RPC público " + rpc);
  }
});

test("Las funciones Admin dejan de estar expuestas a anon sin perder authenticated", () => {
  for (const rpc of ["create_admin_booking_flexible", "update_admin_booking_flexible"]) {
    const from = sql.indexOf("REVOKE EXECUTE ON FUNCTION public." + rpc + "(");
    assert.ok(from >= 0);
    const clause = sql.slice(from, sql.indexOf(";", from) + 1);
    assert.match(clause, /FROM PUBLIC, anon;/);
    const grant = sql.indexOf("GRANT EXECUTE ON FUNCTION public." + rpc + "(",from);
    assert.ok(grant > from);
    assert.match(sql.slice(grant,sql.indexOf(";",grant)+1),/TO authenticated, service_role;/);
  }
  assert.match(admin, /rpc\(\s*["']create_admin_booking_flexible["']/);
  assert.match(admin, /rpc\(\s*["']update_admin_booking_flexible["']/);
});

test("Las rutas públicas siguen usando RPC públicos y Edge Functions", () => {
  for (const f of ["get_booking_config","get_booking_by_code","cancel_booking_by_code"]) {
    assert.ok(reservas.includes('rpc("' + f + '"'), "Falta RPC pública " + f);
  }
  assert.match(reservas, /functions\\.invoke\\(\\s*["\']create-booking-secure/);
  assert.match(reservas, /functions\\.invoke\\(\\s*["\']request-fixed-turn/);
  assert.ok(publicTournaments.includes('bp_public_tournament_followup'));
  assert.ok(publicTournaments.includes('register-tournament-pair'));
  assert.match(config, /supabase\.createClient\(/);
  assert.doesNotMatch(config, /SERVICE_ROLE_KEY|service_role|secret_key/i);
});
