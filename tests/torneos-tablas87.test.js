/* Boulevard Pádel · Parche 87 · Posiciones en una fila por tabla en PC. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const css = read("css/torneos-tablas87.css");

test("Admin y público cargan CSS de tablas 87 al final", () => {
  const admin = read("admin/index.html");
  const pub = read("index.html");
  assert.ok(admin.includes('href="../css/torneos-tablas87.css"'));
  assert.ok(pub.includes('href="css/torneos-tablas87.css"'));
  for (const html of [admin, pub]) {
    assert.ok(html.indexOf("torneos-tablas87.css") > html.indexOf("torneos-tablas83.css"));
    assert.ok(html.indexOf("torneos-tablas87.css") > html.indexOf("torneos-rivales86.css"));
  }
});

test("El ajuste es solo en escritorio y no oculta columnas", () => {
  assert.match(css, /@media \(min-width: 900px\) \{/);
  assert.doesNotMatch(css, /display:\s*none|visibility:\s*hidden|overflow-x:\s*hidden/i);
});

test("Grupos Admin: 1 tabla por fila, ancho total y sin mínimo forzado", () => {
  assert.match(css, /#bp-results-content:has\(> \.bp-results-group:nth-child\(3\)\)/);
  assert.match(css, /\.bp-results-panel #bp-results-content,/);
  assert.match(css, /\.bp-results-panel \.bp-results-group \.bp-results-table \{[^}]*width: 100%;[^}]*min-width: 0;[^}]*table-layout: fixed;/);
  assert.match(css, /\.bp-results-panel \.bp-results-group \.bp-results-table th:nth-child\(2\),/);
});

test("Grupos público: 1 tabla por fila, último grupo impar a ancho completo", () => {
  assert.match(css, /\.public-tournaments \.public-tournament-standings-grid \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.public-tournament-standings-group:last-child:nth-child\(odd\) \{/);
  assert.match(css, /\.public-tournaments \.public-tournament-standings-grid \.public-tournament-table \{[^}]*width: 100%;[^}]*min-width: 0;[^}]*table-layout: fixed;/);
});

test("Liga Admin y público: tablas anchas sin mínimos en PC", () => {
  assert.match(css, /\.bp-league__table,\s*\.public-tournaments \.bp-public-league__table \{[^}]*width: 100%;[^}]*min-width: 0;/);
  assert.match(css, /\.public-tournaments \.bp-public-league__table td:nth-child\(2\) \{/);
  assert.match(css, /overflow-x: auto;/);
});
