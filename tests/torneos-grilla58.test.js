const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Parche 58: enlace de hoja de estilos sin tocar los scripts", () => {
  const html = read("admin/index.html");
  assert.match(html, /href="\.\.\/css\/admin-ux57\.css"/);
  assert.match(html, /href="\.\.\/css\/admin-grilla58\.css"/);
  assert.equal((html.match(/admin-grilla58\.css/g) || []).length, 1);
});

test("Parche 58: dos columnas, hasta tres y una para móvil", () => {
  const css = read("css/admin-grilla58.css");
  assert.match(
    css,
    /#bp-results-content\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(css, /@container\s*\(min-width:\s*1620px\)/);
  assert.match(css, /:has\(>\s*\.bp-results-group:nth-child\(3\)\)/);
  assert.match(css, /repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@container\s*\(max-width:\s*1079px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("Parche 58: la tabla permanece dentro de la tarjeta", () => {
  const css = read("css/admin-grilla58.css");
  assert.match(css, /\.bp-results-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.bp-results-match\s*\{[\s\S]*?display:\s*grid/);
  assert.match(
    css,
    /\.bp-results-match\s*>\s*button\s*\{[\s\S]*?width:\s*auto/,
  );
  assert.doesNotMatch(css, /display:\s*none\s*;/);
});
