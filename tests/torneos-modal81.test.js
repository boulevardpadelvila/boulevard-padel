/* Boulevard Pádel · Parche 81: modal de programación de eliminatorias */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (p) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

const css = read("css/admin-eliminatorias68.css");
const js = read("js/admin-eliminatorias-partidos68.js");
const html = read("admin/index.html");

test("Parche 81: el modal unifica la estética sin cambiar el formulario", () => {
  assert.match(css, /\/\* Parche 81: armonizar modal de programación\/reprogramación/);
  assert.match(css, /#bp-ko68-schedule-dialog\s*\{[^}]*width:\s*min\(540px/);
  assert.match(css, /#bp-ko68-schedule-dialog\s*\{[^}]*border:\s*1px solid #c7ae70/);
  assert.match(css, /#bp-ko68-schedule-dialog h2\s*\{[^}]*color:\s*#00432e/);
  assert.match(css, /#bp-ko68-schedule-pair/);
  for (const id of ["bp-ko68-day","bp-ko68-time","bp-ko68-duration","bp-ko68-schedule-reason",
    "bp-ko68-schedule-cancel","bp-ko68-schedule-save"]) {
    assert.ok(js.includes(id), `Debe conservarse el control ${id}`);
  }
});

test("Parche 81: campos uniformes con tipografía Inter, nota y error sin vacío", () => {
  assert.match(css, /#bp-ko68-schedule-dialog input,/);
  assert.match(css, /#bp-ko68-schedule-dialog select,/);
  assert.match(css, /#bp-ko68-schedule-dialog textarea/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /font:\s*500 14px\/1\.4 Inter/);
  assert.match(css, /#bp-ko68-schedule-dialog \.bp-ko68-error:empty\s*\{\s*display:\s*none/);
  assert.match(css, /#bp-ko68-schedule-dialog \.bp-ko68-reason\[hidden\]\s*\{\s*display:\s*none/);
  assert.match(css, /:focus-visible/);
});

test("Parche 81: Volver y Guardar horario siempre con igual ancho y alto", () => {
  assert.match(css, /#bp-ko68-schedule-dialog \.admin-save-dialog__actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  const controls = css.match(/#bp-ko68-schedule-dialog \.admin-save-dialog__actions > button\s*\{([^}]*)\}/);
  assert.ok(controls, "Ambos botones deben compartir un único estilo");
  assert.match(controls[1], /width:\s*100% !important/);
  assert.match(controls[1], /height:\s*48px/);
  assert.match(controls[1], /min-height:\s*48px !important/);
  assert.match(controls[1], /max-height:\s*48px/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /#bp-ko68-schedule-dialog \.admin-save-dialog__actions > button\s*\{[^}]*font-size:\s*12px !important/);
});

test("Parche 81: se aplica sólo al modal de programación, no a resultados", () => {
  assert.match(html, /href="\.\.\/css\/admin-eliminatorias68\.css"/);
  const patch=css.slice(css.indexOf("/* Parche 81:"));
  assert.ok(patch.length>2000);
  assert.doesNotMatch(patch, /#bp-ko68-result-dialog|#bp-ko68-set-grid|\.bp-ko68-result-dialog/);
  assert.ok(patch.includes("#bp-ko68-schedule-dialog"));
  for (const word of ["supabaseClient", "fetch(", ".rpc(", "ALTER TABLE", "DELETE FROM", "DROP TABLE"]) {
    assert.ok(!patch.includes(word), `CSS no debe contener ${word}`);
  }
  assert.match(js, /bp_admin_set_knockout_match_schedule/);
  assert.match(js, /p_match_id:\s*pending\.matchId/);
  assert.match(js, /p_duration_minutes:\s*action === "postpone" \? null : duration/);
});
