/* Boulevard Pádel · Parche 86 · Rivales de Liga en tres líneas. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

const admin = read("js/admin-liga82.js");
const publicJS = read("js/torneos-liga-public82.js");
const adminCSS = read("css/admin-liga82.css");
const publicCSS = read("css/torneos-liga82.css");

test("Admin: cada pareja y vs se dibujan en tres renglones", () => {
  assert.match(admin, /el\("strong", name\(m\.pair1_id\), "bp-league__rival"\)/);
  assert.match(admin, /el\("span", "vs", "bp-league__versus"\)/);
  assert.match(admin, /el\("strong", name\(m\.pair2_id\), "bp-league__rival"\)/);
  assert.match(admin, /card\.append\(rivals\)/);
  // El "vs." original sigue siendo válido en los modales de programación y resultados.
  // Solo prohibimos su formato anterior en las tarjetas de la Liga.
  const cards = admin.split("function renderMatches() {")[1]?.split("function render() {")[0];
  assert.ok(cards, "Debe existir el renderizado de tarjetas de Liga");
  assert.doesNotMatch(cards, /name\(m\.pair1_id\) \+ " vs\. " \+ name\(m\.pair2_id\)/);
  assert.match(admin, /"bp-league__match-meta"/);
  assert.match(admin, /"bp-league__buttons"/);
});

test("Público: misma presentación sin perder nombres, horarios ni marcadores", () => {
  assert.match(publicJS, /const rivals = make\("div", "bp-public-league__rivals"\)/);
  assert.match(publicJS, /make\("span", "bp-public-league__versus", "vs"\)/);
  assert.match(publicJS, /"bp-public-league__rival"/);
  assert.match(publicJS, /article\.append\(rivals\)/);
  assert.match(publicJS, /pairs\.get\(m\.pair1_id\) \|\| "Pareja por confirmar"/);
  assert.match(publicJS, /pairs\.get\(m\.pair2_id\) \|\| "Pareja por confirmar"/);
  assert.match(publicJS, /"bp-public-league__meta"/);
  assert.match(publicJS, /"bp-public-league__score"/);
  assert.doesNotMatch(publicJS, /" vs\. " \+/);
});

test("Admin y público: centrado y vs pequeño sin negrita", () => {
  assert.match(adminCSS, /\.bp-league__rivals \{[^}]*display:grid;justify-items:center;[^}]*text-align:center;/);
  assert.match(publicCSS, /\.bp-public-league__rivals \{[^}]*display:grid;justify-items:center;[^}]*text-align:center;/);
  assert.match(adminCSS, /\.bp-league__versus \{[^}]*font-size:\.72rem;[^}]*font-weight:400;/);
  assert.match(publicCSS, /\.bp-public-league__versus \{[^}]*font-size:\.72rem;[^}]*font-weight:400;/);
});
