/* Boulevard Pádel · Parche 78 · Regresiones de identidad pública */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const theme = read("css/torneos-tema78.css");
const publicCSS = read("css/torneos-public.css");
const fixturesCSS = read("css/torneos-fechas60.css");
const publicJS = read("js/torneos-public.js");

test("El tema se carga después de ambos CSS públicos existentes y no modifica JS", () => {
  const base = html.indexOf('href="css/torneos-public.css"');
  const fixture = html.indexOf('href="css/torneos-fechas60.css"');
  const visual = html.indexOf('href="css/torneos-tema78.css"');
  assert.ok(base >= 0 && fixture > base && visual > fixture);
  assert.equal(html.split('href="css/torneos-tema78.css"').length, 2);
  assert.match(theme,/Parche 78/);
  assert.match(publicJS,/function knockoutBlock\(t\)/);
  assert.match(publicJS,/function publishedFixtureBlock\(t\)/);
});

test("El diseño conserva las tablas y el podio aprobados", () => {
  assert.match(publicCSS,/\.public-tournament-standings-grid \.public-tournament-table thead th\s*\{\s*background:\s*#00432e/);
  assert.match(publicCSS,/\.public-tournament-standings-grid \.public-tournament-table thead th:last-child\s*\{\s*background:\s*#a48335/);
  assert.doesNotMatch(theme,/\.public-tournament-standings-grid\b|\.public-tournament-table\b|\.public-tournament-highlight__item--gold\b|\.public-tournament-highlight__item--silver\b/);
  assert.match(publicJS,/knockout\.append\(podium\)/);
  assert.match(publicJS,/publicTrophyIcon\(rank\)/);
});

test("Paleta coherente en tarjetas, pestañas y cuatro acordeones", () => {
  assert.match(theme,/--bp78-green:\s*#00432e/);
  assert.match(theme,/--bp78-gold:\s*#a48335/);
  for (const css of [
    ".public-tournament-card",
    ".public-tournaments__tabs",
    ".public-tournament-groups__summary",
    ".public-tournament-fixture__summary",
    ".public-tournament-more__summary",
    ".public-tournament-group__pair",
    ".public-tournament-fixture__calendar-heading",
    ".public-tournament-day__title",
    ".public-tournament-result__score",
    ".public-tournament-ko-stage",
  ]) assert.ok(theme.includes(css), `Falta estilo ${css}`);
  assert.match(theme,/\.public-tournaments \.public-tournament-more\[open\]/);
  assert.match(theme,/:focus-visible/);
});

test("La programación sigue sin marcadores y ambas grillas mantienen 3/2/1 columnas", () => {
  const a=publicJS.indexOf("  function publishedFixtureBlock(t) {");
  const z=publicJS.indexOf("  function cardFor(t) {", a);
  assert.ok(a > 0 && z > a);
  const program=publicJS.slice(a,z);
  assert.doesNotMatch(program,/winner_pair_id|publicScore\(/);
  assert.match(program,/Programación de partidos/);
  assert.match(fixturesCSS,/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(fixturesCSS,/@container \(max-width: 810px\)/);
  assert.match(fixturesCSS,/@container \(max-width: 530px\)/);
  assert.match(publicCSS,/\.public-tournament-group-results \.public-tournament-days\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(theme,/@media \(max-width: 650px\)/);
  assert.match(theme,/@media \(prefers-reduced-motion: reduce\)/);
});

test("No altera servicios, reservas, navegación ni formularios", () => {
  assert.doesNotMatch(theme,/#admin|\.admin-|\.reservation|\.booking|\bdisplay:\s*none\b/);
  assert.ok(!theme.includes("!important"));
  assert.match(html,/id="public-tournaments-current-tab"/);
  assert.match(html,/id="public-tournaments-finished-tab"/);
  assert.match(html,/id="public-tournament-form"/);
  assert.match(publicJS,/\.addEventListener\("submit"/);
});
