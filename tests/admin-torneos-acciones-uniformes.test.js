/* Torneos: tamaños uniformes y distribución adaptable de acciones.
 * Verificaciones estáticas, sin conexión a Supabase ni operaciones reales.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
const css = read("css/admin-torneos-compacto61.css");
const js = read("js/admin-torneos.js");
const section = css.split("/* 13/11/2026 — Tarjetas de torneos: acciones simétricas")[1];

test("Torneos: grilla de botones iguales, adaptable al ancho sin JS adicional", () => {
  assert.ok(section, "Falta el ajuste CSS de las acciones de Torneos");
  assert.match(section, /#torneos-list > \.torneos-entry > \.torneos-entry__actions\s*\{[^}]*display:\s*grid;/);
  assert.match(section, /grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 142px\), 1fr\)\)/);
  assert.match(section, /> \.torneos-entry__button\s*\{[^}]*width:\s*100%;[^}]*height:\s*42px;/);
  assert.match(section, /justify-content:\s*center/);
  assert.match(section, /text-align:\s*center/);
  assert.doesNotMatch(section, /(?:\.dashboard-actions|#admin-reservas-view)/);
});

test("Torneos: la presencia de los botones sigue dependiendo del estado original", () => {
  assert.match(js, /registrationOpen\(t\)\s*\?\s*"Cerrar inscripciones"\s*:\s*"Abrir inscripciones"/);
  assert.match(js, /if\s*\(t\.status\s*===\s*"draft"\)/);
  for (const label of ["Editar", "Publicar", "Finalizar", "PDF del torneo", "Eliminar"]) {
    assert.ok(js.includes(label), "Falta botón " + label);
  }
  assert.match(js, /actions\.className = "torneos-entry__actions"/);
});
