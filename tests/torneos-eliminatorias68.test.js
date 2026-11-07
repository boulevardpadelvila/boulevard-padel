/* Parche 68 · Torneos · programación y resultados de fase final. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const motor = require("../js/torneos-motor.js");

test("Parche 68 enlazado después de la planificación del cuadro", () => {
  const html = read("admin/index.html");
  const app = read("js/admin-eliminatorias-partidos68.js");
  assert.ok(
    html.indexOf("admin-eliminatorias.js") <
      html.indexOf("admin-eliminatorias-partidos68.js"),
  );
  assert.match(html, /admin-eliminatorias68\.css/);
  assert.match(app, /bp-ko68-panel/);
  assert.match(
    app,
    /stageName\s*=\s*\{\s*quarterfinal\s*:\s*["']Cuartos de final["']\s*,\s*semifinal\s*:\s*["']Semifinales["']\s*,\s*final\s*:\s*["']Final["']/,
  );
  assert.match(app, /bp_tournament_knockout_matches/);
  assert.match(app, /bp_tournament_knockout_results/);
  assert.match(app, /winner\(\s*["']quarterfinal["']\s*,\s*1\s*\)/);
  assert.match(app, /winner\(\s*["']semifinal["']\s*,\s*1\s*\)/);
  assert.match(app, /bp-ko68-champion/);
});
test("modales propios para horarios y marcadores, sin confirmaciones nativas", () => {
  const app = read("js/admin-eliminatorias-partidos68.js");
  assert.doesNotMatch(app, /\bwindow\.(?:confirm|alert|prompt)\s*\(/);
  assert.match(app, /scheduleDialog\.showModal\(\)/);
  assert.match(app, /resultDialog\.showModal\(\)/);
  assert.match(app, /bp-ko68-schedule-form/);
  assert.match(app, /bp-ko68-result-form/);
  assert.match(app, /aria-labelledby/);
  assert.match(app, /resultCancel\.addEventListener/);
  assert.match(app, /scheduleCancel\.addEventListener/);
});
test("RPC nuevas, programación futura 90-120 y postergación con motivo", () => {
  const app = read("js/admin-eliminatorias-partidos68.js");
  assert.match(app, /rpc\(\s*["']bp_admin_set_knockout_match_schedule["']/);
  assert.match(app, /rpc\(\s*["']bp_admin_save_knockout_result["']/);
  assert.match(app, /p_action\s*:\s*action/);
  assert.match(app, /action\s*===\s*["']postpone["']/);
  assert.match(app, /duration\s*=\s*Number/);
  assert.match(app, /\[\s*90\s*,\s*120\s*\]\.includes\(\s*duration\s*\)/);
  assert.match(app, /new Date\(\s*day\s*\+\s*["']T["']\s*\+\s*time\s*\+\s*["']:00-03:00["']\s*\)/);
  assert.match(app, /America\/Argentina\/Cordoba/);
  assert.match(app, /reason\.length\s*<\s*5/);
});
test("tercer set normal y nunca súper tie-break en eliminatorias", () => {
  const app = read("js/admin-eliminatorias-partidos68.js");
  assert.match(app, /evaluateSets\(\s*\{\s*sets\s*\}\s*,\s*["']three_sets["']\s*\)/);
  assert.doesNotMatch(app, /evaluateSets\(\s*\{\s*sets\s*\}\s*,\s*["']super_tb["']\s*\)/);
  assert.equal(
    motor.evaluateSets(
      {
        sets: [
          [6, 4],
          [3, 6],
          [6, 2],
        ],
      },
      "three_sets",
    ).winnerSide,
    1,
  );
  assert.throws(
    () =>
      motor.evaluateSets(
        {
          sets: [
            [6, 4],
            [3, 6],
            [10, 8],
          ],
        },
        "three_sets",
      ),
    /Set 3 inválido/,
  );
});
test("sin tocar turnero ni exponer escrituras directas", () => {
  const sql = read("sql/SQL_68_ELIMINATORIAS_PARTIDOS.sql");
  const app = read("js/admin-eliminatorias-partidos68.js");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /bp_tournament_is_admin\(\)/);
  assert.match(sql, /bp_admin_set_knockout_match_schedule/);
  assert.match(sql, /bp_admin_save_knockout_result/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /FROM public\.reservations r/);
  assert.match(sql, /FROM public\.blockouts b/);
  assert.match(sql, /tournament_knockout_match_id/);
  assert.doesNotMatch(sql, /DELETE FROM public\.reservations/);
  assert.doesNotMatch(sql, /UPDATE public\.reservations/);
  assert.doesNotMatch(
    app,
    /\.from\(['"]blockouts['"]\)\.(?:insert|update|delete)/,
  );
});
test("tarjetas compactas y modales responsive", () => {
  const css = read("css/admin-eliminatorias68.css");
  assert.match(css, /repeat\(\s*3\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/);
  assert.match(css, /@media\s*\(\s*max-width\s*:\s*1100px\s*\)/);
  assert.match(css, /@media\s*\(\s*max-width\s*:\s*690px\s*\)/);
  assert.match(css, /\.bp-ko68-dialog/);
  assert.match(css, /\[hidden\]/);
});
