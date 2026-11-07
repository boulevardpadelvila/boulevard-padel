const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) =>
  fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Parche 57: columna Pts al final, datos del motor preservados", () => {
  const js = read("js/admin-resultados.js");
  assert.match(
    js,
    /["']Pos\.["'],\s*["']Pareja["'],\s*["']PJ["'],\s*["']PG["'],\s*["']PP["'],\s*["']SF["'],\s*["']SC["'],\s*["']Dif\.["'],\s*["']Pts["']/,
  );
  assert.match(
    js,
    /row\.setsFor\s*,\s*row\.setsAgainst\s*,\s*row\.setDifference\s*>\s*0[\s\S]*row\.points\s*,?\s*\]\s*\)/,
  );
});
test("Parche 57: ningún formulario requiere escribir motivo", () => {
  const result = read("js/admin-resultados.js"),
    groups = read("js/admin-grupos.js"),
    html = read("admin/index.html"),
    admin = read("js/admin.js");
  assert.doesNotMatch(result, /Motivo de la corrección \(obligatorio\)/);
  assert.match(result, /Corrección de resultado desde Admin/);
  assert.doesNotMatch(groups, /Motivo de la operación/);
  assert.doesNotMatch(groups, /Motivo de la corrección<\/label>/);
  assert.doesNotMatch(groups, /Motivo del cambio \(obligatorio\)/);
  assert.match(groups, /Revisión de grupos desde Admin/);
  assert.match(groups, /Postergación administrativa de partido/);
  assert.match(groups, /Corrección de cruces desde Admin/);
  assert.doesNotMatch(html, /Motivo \(opcional\)/);
  assert.match(admin, /p_reason: null,/);
});
test("Parche 57: CSS establece dos sets en columnas y verde/dorado", () => {
  const css = read("css/admin-ux57.css");
  const html = read("admin/index.html");
  assert.match(
    css,
    /#bp-results-sets\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(2/,
  );
  assert.match(css, /\.bp-results-set:nth-child\(3\)/);
  assert.match(css, /--bp57-green:/);
  assert.match(css, /--bp57-gold:/);
  assert.match(html, /href="\.\.\/css\/admin-ux57\.css"/);
});
