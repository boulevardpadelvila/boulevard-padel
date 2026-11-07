/* SQL 70: regresión estática del borrado integral seguro. No modifica Supabase. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(path.join(__dirname, "../sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../js/admin-torneos.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../admin/index.html"), "utf8");

test("La eliminación sólo está autorizada para admin y torneo específico", () => {
  assert.match(sql, /FUNCTION public\.bp_tournament_delete_allowed\(p_tournament_id uuid\)/);
  assert.match(sql, /a\.transaction_id\s*=\s*txid_current\(\)/);
  assert.match(sql, /a\.tournament_id\s*=\s*p_tournament_id/);
  assert.match(sql, /a\.action\s*=\s*'delete'/);
  assert.match(sql, /auth\.uid\(\) IS NULL/);
  assert.match(sql, /bp_tournament_is_admin\(\)/);
  assert.match(sql, /v_t\.name IS DISTINCT FROM p_expected_name/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.bp_admin_delete_tournament_safely\(uuid,text\)/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bp_admin_delete_tournament_safely\(uuid,text\)/);
});

test("Se incluyen todas las dependencias del torneo sin tocar reservas reales", () => {
  for (const name of [
    "bp_tournament_match_result_revisions",
    "bp_tournament_match_results",
    "bp_tournament_knockout_brackets",
    "bp_tournament_group_matches",
    "bp_tournament_group_pairs",
    "bp_tournament_groups",
    "bp_tournament_pairs",
    "bp_tournament_match_schedule_history",
    "bp_tournament_revision_log",
    "bp_tournaments",
    "blockouts",
  ]) {
    assert.ok(sql.includes("DELETE FROM public." + name), "Falta borrar " + name);
  }
  assert.doesNotMatch(sql, /DELETE FROM public\.reservations\b/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.customers\b/i);
  assert.doesNotMatch(sql, /DELETE FROM public\.bp_tournament_categories\b/i);
  assert.doesNotMatch(sql, /DISABLE TRIGGER|TRUNCATE\s|DROP TABLE\s/i);
  assert.match(sql, /DELETE FROM bp_revision_private\.operation_access a/);
});

test("Los guardianes solo habilitan DELETE del torneo identificado", () => {
  for (const name of [
    "bp_tournament_blockout_integrity_guard",
    "bp_group_match_scheduled_delete_guard",
    "bp_guard_published_fixture_matches",
    "bp_guard_started_group_match",
    "bp_guard_published_group_rows",
    "bp_guard_started_group_structure",
    "bp_guard_published_roster",
    "bp_guard_started_group_roster",
    "bp_ko_match_schedule_guard",
  ]) {
    const start = sql.indexOf("-- Protección precisa: " + name);
    assert.ok(start >= 0, "No se actualizó guardián " + name);
    const next = sql.indexOf("-- Protección precisa:", start + 5);
    const segment = sql.slice(start, next >= 0 ? next : undefined);
    assert.match(segment, /TG_OP\s*=\s*'DELETE'/);
    assert.match(segment, /bp_tournament_delete_allowed/);
  }
});

test("El Admin exige doble confirmación y nombre exacto", () => {
  assert.match(js, /bp_admin_tournament_delete_preview/);
  assert.match(js, /nextModal/);
  assert.match(js, /Confirmación definitiva/);
  assert.match(js, /typedName !== preview\.tournament_name/);
  assert.match(js, /bp_admin_delete_tournament_safely/);
  assert.match(js, /Esta operación NO SE PUEDE DESHACER/);
  assert.match(html, /id="torneo-dialog-input"[\s\S]*?maxlength="100"/);
});
