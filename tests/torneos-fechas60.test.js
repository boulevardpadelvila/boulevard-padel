const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = path.join(__dirname, "..");
test("Admin reagrupa fixture por calendario sin jornadas visibles", () => {
  const s = fs.readFileSync(path.join(base, "js/admin-grupos.js"), "utf8");
  assert.match(s, /regroupFixtureBySchedule\(matches, groups\)/);
  assert.match(s, /new Intl\.DateTimeFormat\("es-AR"/);
  assert.match(s, /"Sin programar"/);
  assert.match(s, /grid\.append\(node\.entry\)/);
});
test("Público usa horarios publicados sin nombres de jornadas", () => {
  const s = fs.readFileSync(path.join(base, "js/torneos-public.js"), "utf8");
  assert.match(s, /schedule_status,scheduled_at,scheduled_ends_at/);
  assert.match(s, /public-tournament-fixture__calendar-grid/);
  assert.match(s, /"Sin programar"/);
});
test("CSS grilla tres, dos y una columnas y panel público", () => {
  for (const f of ["css/admin-fechas60.css", "css/torneos-fechas60.css"]) {
    const s = fs.readFileSync(path.join(base, f), "utf8");
    assert.match(s, /repeat\(\s*3\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/);
    assert.match(s, /repeat\(\s*2\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/);
    assert.match(s, /grid-template-columns\s*:\s*1fr/);
  }
});
