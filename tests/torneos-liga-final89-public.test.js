/* Boulevard Pádel · P89 · Pruebas reales del render público en DOM mínimo.
 * Sin red ni Supabase: sólo visualización de datos sanitizados.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const main = fs.readFileSync(path.join(__dirname, "../js/torneos-public.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/torneos-liga-final89.css"), "utf8");
const publicUI = fs.readFileSync(
  path.join(__dirname, "../js/torneos-liga-final89-public.js"), "utf8");
const sql = fs.readFileSync(
  path.join(__dirname, "../sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql"), "utf8");

function fakeDom() {
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.textContent = "";
      this.children = [];
      this.attributes = {};
    }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "class") this.className = String(value);
    }
  }
  const context = { document: {
    createElement: (tag) => new Element(tag),
    createElementNS: (_ns, tag) => new Element(tag)
  }, Intl, Date };
  context.globalThis = context;
  vm.runInNewContext(publicUI, context, { filename: "torneos-liga-final89-public.js" });
  const text = (node) => !node ? "" : String(node.textContent || "") +
    (node.children || []).map(text).join(" ");
  const nodes = (node, classPart) =>
    !node ? [] : [
      ...(String(node.className).split(/\s+/).includes(classPart) ? [node] : []),
      ...(node.children || []).flatMap((n) => nodes(n, classPart))
    ];
  return { finalBlock: context.BPLeagueFinalPublic89.finalBlock, text, nodes };
}
const tournament = { id: "liga-1", format: "league", status: "in_progress" };
const regularReport = { pairs: [
  { id: "a", name: "Ana y Sol" }, { id: "b", name: "Berta y Luz" },
  { id: "c", name: "Cami y Paz" }, { id: "d", name: "Dora y Eva" }
] };
const sample = () => ({ tournament_id: tournament.id, status: "in_progress",
  matches: [
    { id: "s1", stage: "semifinal", slot: 1, pair1_id: "a", pair2_id: "c",
      schedule_status: "scheduled", scheduled_at: "2027-01-12T22:00:00+00:00",
      match_status: "played", sets: [[6,2],[6,3]], winner_pair_id: "a" },
    { id: "s2", stage: "semifinal", slot: 2, pair1_id: "b", pair2_id: "d",
      schedule_status: "unscheduled", match_status: "pending", sets: null },
    { id: "f", stage: "final", slot: 1, pair1_id: null, pair2_id: null,
      schedule_status: "scheduled", scheduled_at: "2027-01-19T22:00:00+00:00",
      match_status: "pending", sets: null }
  ], champion_pair_id: null, runner_up_pair_id: null
});

test("P89 público: scripts y CSS en orden; carga únicamente mediante RPC sanitizada", () => {
  const scripts = ["js/torneos-liga-public82.js", "js/torneos-liga-final89-public.js",
    "js/torneos-public.js"];
  const offsets = scripts.map((name) => html.indexOf('src="' + name + '"'));
  assert.ok(offsets.every((i) => i >= 0));
  assert.deepEqual([...offsets].sort((a,b) => a-b), offsets);
  assert.match(html, /css\/torneos-liga-final89\.css/);
  assert.match(main, /bp_public_league_final89/);
  assert.match(main, /publicLeagueFinalByTournament/);
  assert.match(main, /window\.BPLeagueFinalPublic89\?\.finalBlock/);
  assert.doesNotMatch(publicUI, /supabaseClient|contact_phone|phone|email|innerHTML/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /public-tournament-highlight__item--gold/);
  assert.match(css, /public-tournament-highlight__item--silver/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("P89 público: no mostrar fase final si falta RPC, torneo o partidos", () => {
  const { finalBlock } = fakeDom();
  assert.equal(finalBlock(tournament, regularReport, null), null);
  assert.equal(finalBlock({ ...tournament, format: "groups_knockout" },
    regularReport, sample()), null);
  assert.equal(finalBlock(tournament, regularReport, { ...sample(), tournament_id: "otro" }), null);
  assert.equal(finalBlock(tournament, regularReport, { ...sample(), matches: [] }), null);
});

test("P89 público: renderiza semifinales 1 y 2, y final con ganadores pendientes", () => {
  const { finalBlock, text, nodes } = fakeDom();
  const dom = finalBlock(tournament, regularReport, sample());
  const content = text(dom);
  assert.ok(dom);
  assert.equal(nodes(dom, "bp-public-league-final__match").length, 3);
  for(const phrase of ["Semifinal 1", "Semifinal 2", "Final",
    "Ana y Sol", "Cami y Paz", "Berta y Luz", "Dora y Eva",
    "Ganador semifinal 1", "Ganador semifinal 2"]) {
    assert.ok(content.includes(phrase), "Falta " + phrase);
  }
  assert.ok(content.includes("12/01/2027"), "Hora local argentina");
  assert.ok(content.includes("6–2 · 6–3"));
});

test("P89 público: resultado provisional nunca proclama campeón", () => {
  const { finalBlock, text, nodes } = fakeDom();
  const report = sample();
  report.champion_pair_id = "a";
  report.runner_up_pair_id = "b";
  const dom = finalBlock(tournament, regularReport, report);
  assert.equal(nodes(dom, "bp-public-league-final__champions").length, 0);
  assert.match(text(dom), /se confirmarán al finalizar la final/);
});

test("P89 público: la final disputada tampoco anuncia campeón antes del cierre oficial", () => {
  const { finalBlock, nodes } = fakeDom();
  const report = sample();
  report.matches[2] = { ...report.matches[2], pair1_id: "a", pair2_id: "b",
    match_status: "played", sets: [[6,4],[4,6],[6,3]], winner_pair_id: "a" };
  report.champion_pair_id = "a"; report.runner_up_pair_id = "b";
  assert.equal(nodes(finalBlock(tournament, regularReport, report),
    "bp-public-league-final__champions").length, 0);
  report.status = "completed";
  assert.equal(nodes(finalBlock(tournament, regularReport, report),
    "bp-public-league-final__champions").length, 0);
});

test("P89 público: al cerrar oficialmente la Liga sí anuncia campeón y subcampeón", () => {
  const { finalBlock, text, nodes } = fakeDom();
  const report = sample();
  const completed = { ...tournament, status: "completed" };
  report.status = "completed";
  report.matches[2] = { ...report.matches[2],
    pair1_id: "a", pair2_id: "b", match_status: "played",
    sets: [[6,4],[4,6],[6,3]], winner_pair_id: "a" };
  report.champion_pair_id = "a"; report.runner_up_pair_id = "b";
  const dom = finalBlock(completed, regularReport, report);
  assert.equal(nodes(dom, "bp-public-league-final__champions").length, 1);
  assert.equal(nodes(dom, "public-tournament-highlight__item--gold").length, 1);
  assert.equal(nodes(dom, "public-tournament-highlight__item--silver").length, 1);
  assert.equal(nodes(dom, "public-tournament-highlight__trophy").length, 2);
  assert.equal(nodes(dom, "bp-public-league-final__winner").length, 1);
  assert.equal(nodes(dom, "bp-public-league-final__runnerup").length, 1);
  assert.match(text(dom), /Campeones Ana y Sol/);
  assert.match(text(dom), /Subcampeones Berta y Luz/);
  assert.match(text(dom), /6–4 · 4–6 · 6–3/);
});

test("P89 público: marcadores contradictorios de campeón no generan proclamación", () => {
  const { finalBlock, nodes } = fakeDom();
  const report = sample();
  report.status = "completed"; report.champion_pair_id = "a";
  report.runner_up_pair_id = "x";
  report.matches[2] = { ...report.matches[2], pair1_id: "a", pair2_id: "b",
    match_status: "played", winner_pair_id: "a" };
  assert.equal(nodes(finalBlock({ ...tournament, status: "completed" },
    regularReport, report), "bp-public-league-final__champions").length, 0);
});

test("P89 público: nunca se consultan tablas Admin de fase final ni reservas", () => {
  assert.match(main, /await fetchPublishedLeagueFinals\(tournamentsCache\)/);
  assert.doesNotMatch(main, /\.from\("bp_league_final_matches"\)/);
  assert.doesNotMatch(publicUI, /\.from\(/);
  assert.doesNotMatch(publicUI, /reservations|fixed_bookings|weekly_bookings/);
  assert.match(sql, /WHERE id=p_tournament_id AND format='league' AND is_published=true/);
  assert.doesNotMatch(sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.bp_public_league_final89"),
    sql.indexOf("-- Previsualización de borrado seguro")), /contact_phone|customer_email|phone/i);
});
