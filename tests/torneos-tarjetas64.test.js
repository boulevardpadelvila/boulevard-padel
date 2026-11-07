/* Parche 64 (visual): las tres columnas son tres tarjetas, no un encabezado extra. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("la lista genera sólo tarjetas; el título ya pertenece al panel", () => {
  const js = read("js/admin-torneos.js"),
    html = read("admin/index.html");
  assert.match(html, /id="torneos-library-title">Torneos registrados/);
  assert.doesNotMatch(js, /heading\.textContent\s*=\s*"Torneos registrados"/);
  assert.match(js, /box\.replaceChildren\(\)/);
  assert.match(js, /card\.className\s*=\s*"torneos-entry"/);
  assert.match(js, /box\.append\(card\)/);
});
test("tarjetas 3/2/1 responsive, con acciones al pie", () => {
  const css = read("css/admin-torneos-compacto61.css");
  assert.match(
    css,
    /#torneos-list\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3/,
  );
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /#torneos-list > \.torneos-entry \{/);
  assert.match(css, /\.torneos-entry__actions\s*\{\s*margin-top:\s*auto/);
});
