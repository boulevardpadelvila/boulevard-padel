/* Boulevard Pádel · P89 · Contratos del Admin de Liga (no hace llamadas a Supabase).
 * La integración funcional con RPC se ensaya en PostgreSQL temporal.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const admin = read("admin/index.html");
const regular = read("js/admin-liga82.js");
const finalUI = read("js/admin-liga-final89-ui.js");
const css = read("css/admin-liga-final89-ui.css");

test("89 Admin: la fase final está dentro del mismo panel Liga y oculta inicialmente", () => {
  const panel = admin.indexOf('id="bp-league-panel"');
  const finalPanel = admin.indexOf('id="bp-league-final-panel"');
  const close = admin.indexOf('</section>', admin.indexOf('id="bp-league-final-fixture"'));
  assert.ok(panel > -1 && finalPanel > panel && close > finalPanel);
  assert.match(admin, /id="bp-league-final-panel"[^>]*hidden>/);
  assert.match(finalUI, /if \(!report\.complete\) return;/);
});

test("89 Admin: carga primero motores, luego módulo regular y fase final", () => {
  const scripts = [
    "../js/torneos-motor.js",
    "../js/torneos-liga-motor.js",
    "../js/torneos-liga-final89.js",
    "../js/admin-liga82.js",
    "../js/admin-liga-final89-ui.js"
  ];
  const points = scripts.map((src) => admin.indexOf('src="' + src + '"'));
  assert.ok(points.every((x) => x >= 0));
  assert.deepEqual([...points].sort((a,b)=>a-b), points);
  assert.match(regular, /new CustomEvent\("bp:league-loaded"/);
  assert.match(finalUI, /addEventListener\("bp:league-loaded"/);
});

test("89 Admin: confirmar antes de generar y usar exclusivamente RPC P89", () => {
  assert.match(admin, /id="bp-league-final-generate-dialog"/);
  assert.match(finalUI, /bp_league_prepare_final89/);
  assert.match(finalUI, /bp_league_final_schedule89/);
  assert.match(finalUI, /bp_league_final_save_result89/);
  assert.doesNotMatch(finalUI, /\.insert\(|\.update\(|\.delete\(|bp_league_save_result\s*["']/);
  assert.match(finalUI, /planning\.planFinalPhase/);
});

test("89 Admin: conserva el fixture regular y no publica al sortear", () => {
  assert.match(regular, /bp_league_generate_fixture/);
  assert.match(regular, /bp_league_schedule_match/);
  assert.match(regular, /bp_league_save_result/);
  assert.doesNotMatch(finalUI, /from\("bp_league_matches"\)/);
  assert.doesNotMatch(finalUI, /update\(\{[\s\S]*is_published/);
});

test("89 Admin: tercer set de semifinales/final es normal, con validación del motor", () => {
  assert.match(finalUI, /scores\.evaluateSets\(\{ sets \}, "three_sets"\)/);
  assert.match(finalUI, /const split = /);
  assert.match(admin, /tercer set es normal/i);
  assert.match(admin, /id="bp-league-final-result-form"/);
  assert.doesNotMatch(finalUI, /analyzeScore\(sets\)|"super_tb"/);
});

test("89 Admin: final programable sin finalistas, resultado exige ambos", () => {
  assert.match(finalUI, /m\.stage === "final" \? "Ganador semifinal 1"/);
  assert.match(finalUI, /m\.stage === "final" \? "Ganador semifinal 2"/);
  assert.match(finalUI, /!m\.pair1_id \|\| !m\.pair2_id/);
  assert.match(finalUI, /m\.match_status === "played"/);
});

test("89 Admin: nunca llama campeón al primero de la fase regular", () => {
  assert.doesNotMatch(regular, /report\.champion|Primera pareja:/);
  assert.match(regular, /Campeón y subcampeón se deciden en la final/);
  assert.match(finalUI, /tournament\.status === "completed"/);
  assert.match(finalUI, /championship\.winner_pair_id/);
});

test("89 Admin: modales y acciones explícitas, estilo móvil independiente", () => {
  for (const suffix of [
    "generate", "generate-confirm", "generate-cancel", "message", "fixture",
    "schedule-dialog", "schedule-form", "schedule-save", "schedule-cancel",
    "result-dialog", "result-form", "result-save", "result-cancel"
  ]) {
    assert.match(admin, new RegExp('id="bp-league-final-' + suffix + '"'));
  }
  assert.match(admin, /\.\.\/css\/admin-liga-final89-ui\.css/);
  assert.match(css, /@media \(max-width: 550px\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("89 Admin: Martín resuelve empate sin alterar marcadores ni otros puestos",()=>{
  assert.match(admin, /id="bp-league-final-tie-form"/);
  assert.match(admin, /id="bp-league-final-tie-reason"/);
  assert.match(finalUI, /bp_league_prepare_final_manual89/);
  assert.match(finalUI, /sameMetrics\(row, other\)/);
  assert.match(finalUI, /new Set\(selected\)\.size !== 4/);
  assert.match(finalUI, /p_qualifiers: decision\.qualifiers/);
  assert.match(finalUI, /p_reason: decision\.reason/);
  assert.doesNotMatch(finalUI, /\.from\("bp_league_matches"\)/);
});
