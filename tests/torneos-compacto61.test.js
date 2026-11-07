/* Parche 61: invariantes estáticas del centro de torneos, sin acceso a Supabase. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "admin/index.html"), "utf8");
const css = fs.readFileSync(
  path.join(root, "css/admin-torneos-compacto61.css"),
  "utf8",
);
const js = fs.readFileSync(
  path.join(root, "js/admin-torneos-compacto61.js"),
  "utf8",
);

test("Parche 61: existe una sola lista de torneos y siguen presentes los módulos", () => {
  assert.equal((html.match(/id="torneos-list"/g) || []).length, 1);
  for (const id of [
    "torneos-pairs-tournament",
    "torneos-groups-panel",
    "torneos-pairs-list",
    "torneos-groups-list",
    "torneo-create-button",
    "torneo-edit-cancel",
  ]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.ok(html.includes('class="torneos-panel torneos-library"'));
});
test("Parche 61: creación desplegable y conservada al editar", () => {
  for (const id of ["torneos-create-toggle", "torneos-create-details"])
    assert.ok(html.includes('id="' + id + '"'));
  assert.match(js, /MutationObserver/);
  assert.match(js, /cancelEdit\.hidden/);
  assert.match(js, /aria-expanded/);
  assert.doesNotMatch(js, /supabaseClient|fetch\s*\(|\.rpc\s*\(/);
});
test("Parche 61: tres columnas máximas y selectores compactos", () => {
  assert.match(css, /#torneos-list[\s\S]*?grid-template-columns:\s*repeat\(3/);
  assert.match(
    css,
    /#torneos-pairs-list[\s\S]*?grid-template-columns:\s*repeat\(3/,
  );
  assert.match(
    css,
    /#torneos-groups-list[\s\S]*?grid-template-columns:\s*repeat\(3/,
  );
  assert.match(css, /#torneos-pairs-tournament/);
  assert.match(css, /#torneos-groups-tournament/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
test("Parche 61: CSS y JS se cargan al final de los estilos y módulos", () => {
  assert.ok(html.includes("../css/admin-torneos-compacto61.css"));
  assert.ok(html.includes("../js/admin-torneos-compacto61.js"));
  assert.ok(
    html.indexOf("../css/admin-torneos-compacto61.css") >
      html.indexOf("../css/admin-fechas60.css"),
  );
  assert.ok(
    html.indexOf("../js/admin-torneos-compacto61.js") >
      html.indexOf("../js/admin-resultados.js"),
  );
});
