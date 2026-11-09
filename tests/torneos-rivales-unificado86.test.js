/* Boulevard Pádel · Ampliación Parche 86 · coherencia en Admin y público. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

const unified = read("css/torneos-rivales86.css");
const publicJS = read("js/torneos-public.js");
const groupAdmin = read("js/admin-grupos.js");
const resultAdmin = read("js/admin-resultados.js");

test("La hoja de unificación se carga después de otras hojas en Admin y público", () => {
  const admin = read("admin/index.html");
  const publicHTML = read("index.html");
  assert.match(admin, /href="\.\.\/css\/torneos-rivales86\.css"/);
  assert.match(publicHTML, /href="css\/torneos-rivales86\.css"/);
  assert.ok(admin.indexOf("torneos-rivales86.css") > admin.indexOf("torneos-tablas83.css"));
  assert.ok(publicHTML.indexOf("torneos-rivales86.css") > publicHTML.indexOf("torneos-tablas83.css"));
});

test("Admin grupos conserva su estructura de partidos y acciones al mostrar nombres apilados", () => {
  assert.match(groupAdmin, /function fixturePairNode\(pair, match, side\)/);
  assert.match(groupAdmin, /className = "torneos-fixture-pair"/);
  assert.match(groupAdmin, /className = "torneos-fixture-versus"/);
  assert.match(resultAdmin, /pairNodes\[side - 1\]\.replaceChildren\(first, second\)/);
  assert.match(unified, /\.torneos-fixture-entry \.torneos-fixture-match \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(unified, /\.torneos-fixture-entry \.torneos-fixture-pair > span \+ span::before \{[^}]*content: " y "/);
  assert.match(unified, /\.torneos-fixture-entry \.torneos-fixture-versus \{[^}]*font-weight: 400/);
});

test("Público programación de grupos muestra cada pareja y vs centrados", () => {
  assert.match(publicJS, /public-tournament-fixture__versus-row/);
  assert.match(publicJS, /public-tournament-fixture__pair--first/);
  assert.match(publicJS, /public-tournament-fixture__pair--second/);
  assert.match(unified, /\.public-tournaments \.public-tournament-fixture__versus-row \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(unified, /\.public-tournaments \.public-tournament-fixture__player \+ \.public-tournament-fixture__player::before \{[^}]*content: " y "/);
  assert.match(unified, /\.public-tournaments \.public-tournament-fixture__vs \{[^}]*font-weight: 400/);
});

test("Resultados de grupos y eliminatorias envían rivales independientes al render común", () => {
  assert.match(publicJS, /make\("strong", "public-tournament-result__rival", item\.pair1\)/);
  assert.match(publicJS, /make\("span", "public-tournament-result__vs", "vs"\)/);
  assert.match(publicJS, /make\("strong", "public-tournament-result__rival", item\.pair2\)/);
  assert.match(publicJS, /pair1: nameOf\(match\.resolved_pair1_id \|\| match\.pair1_id\)/);
  assert.match(publicJS, /pair2: nameOf\(match\.resolved_pair2_id \|\| match\.pair2_id\)/);
  assert.match(publicJS, /pair1: nameOf\(m\.resolved_pair1_id \|\| p1, fallback1\)/);
  assert.match(publicJS, /pair2: nameOf\(m\.resolved_pair2_id \|\| p2, fallback2\)/);
  assert.match(publicJS, /score: publicScore\(match\.sets\)/);
  assert.match(unified, /\.public-tournaments \.public-tournament-result__teams \{[^}]*display: grid/);
  assert.match(unified, /\.public-tournaments \.public-tournament-result__vs \{[^}]*font-weight: 400/);
});

test("Admin eliminatorias conserva partidos pero normaliza vs", () => {
  const ko = read("js/admin-eliminatorias-partidos68.js");
  const planner = read("js/admin-eliminatorias.js");
  assert.match(ko, /rivals\.append\(el\("span", "vs", "bp-ko68-versus"\)\)/);
  assert.match(planner, /rivals\.append\(el\("span",\s*"vs",\s*"bp-ko-versus"\)\)/);
  assert.match(unified, /\.admin-torneos \.bp-ko68-versus,/);
  assert.match(unified, /\.admin-torneos \.bp-ko-versus \{[^}]*font-weight: 400/);
});
