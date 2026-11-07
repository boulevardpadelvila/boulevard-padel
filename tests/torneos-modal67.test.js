const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const js = fs.readFileSync(
  path.join(__dirname, "../js/admin-eliminatorias.js"),
  "utf8",
);
const css = fs.readFileSync(
  path.join(__dirname, "../css/admin-eliminatorias66.css"),
  "utf8",
);
test("eliminar confirmaciones nativas de Chrome", () => {
  assert.doesNotMatch(js, /\bwindow\.(?:confirm|alert|prompt)\s*\(/);
  assert.match(js, /document\.createElement\(\s*["']dialog["']\s*\)/);
  assert.match(js, /koConfirmDialog\.showModal\(\)/);
  assert.match(js, /koConfirmDialog\.close\(\s*["']confirmed["']\s*\)/);
  assert.match(js, /koConfirmDialog\.close\(\s*["']cancelled["']\s*\)/);
  assert.match(js, /koConfirmBack\.focus\(\)/);
});
test("el modal muestra quién pasa a semifinales y los tres cuartos", () => {
  assert.match(js, /bp-ko-confirm-bye/);
  assert.match(js, /bp-ko-confirm-matches/);
  assert.match(js, /matchups\.forEach\(\(\s*\[\s*a\s*,\s*b\s*\]\s*,\s*i\s*\)\s*=>/);
  assert.match(js, /askKnockoutConfirmation\(\s*bye\s*,\s*pairs\s*\)/);
  assert.match(js, /model\s*!==\s*snapshot/);
  assert.match(js, /JSON\.stringify\(\s*quarters\s*\)\s*!==\s*JSON\.stringify\(\s*pairs\s*\)/);
  assert.match(js, /bp_tournament_knockout_brackets/);
});
test("estética consistente y responsive", () => {
  assert.match(js, /admin-save-dialog bp-ko-confirm-dialog/);
  assert.match(js, /aria-labelledby/);
  assert.match(js, /aria-describedby/);
  assert.match(css, /\.bp-ko-confirm-dialog/);
  assert.match(css, /#095138/);
  assert.match(css, /@media\s*\(\s*max-width\s*:\s*480px\s*\)/);
});
