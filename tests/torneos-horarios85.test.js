/* Boulevard Pádel · Parche 85 · Formato HH:mm. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

const html = read("admin/index.html");
const league = read("js/admin-liga82.js");
const knockout = read("js/admin-eliminatorias-partidos68.js");
const groups = read("js/admin-grupos.js");

test("Liga: lista de horarios HH:mm con 48 opciones de media hora", () => {
  assert.ok(html.includes('<select id="bp-league-schedule-time" required></select>'));
  assert.match(league, /for \(let hour = 0; hour <= 23; hour\+\+\)/);
  assert.match(league, /for \(const minute of \["00", "30"\]\)/);
  assert.match(league, /time\.add\(new Option\(value, value\)\)/);
  assert.match(league, /time\.value = m\.scheduled_at \? base\.time : "19:00"/);
  assert.match(league, /p_start: start/);
});

test("Eliminatorias: horario 09:00 a 23:30 como grupos", () => {
  assert.match(knockout, /<select required id=\\?"bp-ko68-time\\?"><\/select>/);
  assert.match(knockout, /for \(let hour = 9; hour <= 23; hour\+\+\)/);
  assert.match(knockout, /for \(const minute of \["00", "30"\]\)/);
  assert.match(knockout, /koTime\.add\(new Option\(value, value\)\)/);
  assert.match(knockout, /p_start_time: action === "postpone" \? null : time/);
  assert.ok(groups.includes('<select id="torneos-fixture-schedule-time" required></select>'));
  assert.match(groups, /for \(let hour = 9; hour <= 23; hour\+\+\)/);
});

test("Ningún selector de programación muestra AM/PM nativo", () => {
  for (const source of [html, league, knockout, groups]) {
    assert.doesNotMatch(source, /type=(?:\\?")time(?:\\?")/i);
  }
});
