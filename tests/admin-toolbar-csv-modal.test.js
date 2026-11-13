/* Admin Reservas: seis acciones, una fila, CSV con modal accesible.
 * Suite aislada: no accede a Supabase ni a contactos reales.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const html = read("admin/index.html");
const css = read("css/admin-respaldos-ui.css");
const js = read("js/admin-respaldos.js");

test("las seis acciones están en orden y la última hoja CSS define una única fila", () => {
  const block = html.split('class="dashboard-actions"')[1]?.split("</div>")[0];
  assert.ok(block, "Falta el contenedor de acciones");
  const ids = ["reservations-today", "new-booking-open", "show-cancelled",
    "refresh-reservations", "bp-backup-reservations", "bp-cleanup88-open"];
  const indices = ids.map((id) => block.indexOf('id="' + id + '"'));
  assert.ok(indices.every((i) => i >= 0));
  assert.deepEqual(indices, [...indices].sort((a, b) => a - b));
  assert.match(css, /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.dashboard-actions > button \{[^}]*width: 100%;[^}]*height: 48px;[^}]*min-height: 48px;/);
  assert.match(css, /font:\s*700 13\.5px\/1\.15/);
  assert.match(css, /white-space:\s*nowrap/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /repeat\(6, minmax\(178px, 1fr\)\)/);
  const old = html.indexOf("admin-limpieza88.css");
  const modern = html.indexOf("admin-respaldos-ui.css");
  assert.ok(modern > old, "CSS de seis botones debe cargar al final");
});

test("sin mensaje suelto, con diálogo nativo reutilizable de éxito y error", () => {
  assert.doesNotMatch(html, /id="bp-backup-reservations-message"/);
  assert.doesNotMatch(html, /id="bp-backup-fixed-message"/);
  assert.match(html, /<dialog id="bp-backup-dialog" class="admin-save-dialog bp-backup-dialog"/);
  for (const id of ["bp-backup-dialog-title", "bp-backup-dialog-description",
    "bp-backup-dialog-hint", "bp-backup-dialog-close"])
    assert.ok(html.includes('id="' + id + '"'), "Falta " + id);
  assert.match(css, /\.bp-backup-dialog \.admin-save-dialog__actions\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(js, /button\.disabled = false/);
  assert.match(js, /dialog\.addEventListener\("close"/);
});

function mockAdmin({ error = false } = {}) {
  const elements = new Map();
  const event = (id) => {
    if (!elements.has(id)) {
      const e = {
        id, disabled: false, open: false, dataset: {}, style: {},
        isConnected: true, textContent: "", handlers: {},
        addEventListener(name, callback) {
          this.handlers[name] = callback;
        },
        click() { return this.handlers.click?.(); },
        focus() { this.focusCount = (this.focusCount || 0) + 1; },
        showModal() { this.open = true; },
        close() {
          this.open = false;
          this.handlers.close?.();
        },
      };
      elements.set(id, e);
    }
    return elements.get(id);
  };
  const downloads = [];
  const requests = [];
  const document = {
    readyState: "complete", getElementById: event,
    body: { append() {} },
    createElement: (tag) => ({
      click() { downloads.push(this.download); }, remove() {},
    }),
  };
  const table = {
    select(columns) { requests.push("select:" + columns); return this; },
    eq(...args) { requests.push("eq:" + args.join(":")); return this; },
    order() { return this; },
    range() {
      return Promise.resolve({ data: error ? null : [{
        booking_name: "Jugador de prueba", booking_phone: "3492-111",
        starts_at: "2026-11-13T21:30:00Z", customers: null
      }], error: error ? { message: "Simulación de lectura fallida" } : null });
    },
  };
  const supabaseClient = {
    auth: { async getUser() { return { data: { user: { id: "admin-test" } } }; } },
    async rpc() { return { data: true }; },
    from() { return table; },
  };
  const scope = {
    document, window: {}, supabaseClient, console: { error(){} },
    Blob, URL: { createObjectURL: () => "blob:fake", revokeObjectURL() {} },
    setTimeout(callback) { callback(); },
    Intl, Date,
  };
  vm.runInNewContext(js, scope, { filename: "js/admin-respaldos.js" });
  return { event, downloads, requests };
}

test("la exportación exitosa abre modal, no reemplaza el botón y lo rehabilita", async () => {
  const { event, downloads } = mockAdmin();
  const button = event("bp-backup-reservations");
  await button.click();
  assert.equal(button.disabled, false, "El botón no debe quedar bloqueado");
  assert.equal(event("bp-backup-dialog").open, true);
  assert.equal(event("bp-backup-dialog-title").textContent, "CSV generado");
  assert.match(event("bp-backup-dialog-description").textContent, /1 registro de reservas/);
  assert.equal(event("bp-backup-dialog").dataset.result, "success");
  assert.equal(downloads.length, 1);
  assert.match(downloads[0], /^boulevard-padel-reservas-\d{4}-\d{2}-\d{2}\.csv$/);
  event("bp-backup-dialog-close").click();
  assert.equal(event("bp-backup-dialog").open, false);
  assert.ok(button.focusCount >= 1, "El foco debe volver al botón exportar");
  await button.click();
  assert.equal(downloads.length, 2, "Se puede volver a exportar inmediatamente");
});

test("un fallo no descarga nada, abre aviso y habilita reintento", async () => {
  const { event, downloads } = mockAdmin({ error: true });
  const button = event("bp-backup-reservations");
  await button.click();
  assert.equal(button.disabled, false);
  assert.equal(downloads.length, 0);
  assert.equal(event("bp-backup-dialog").dataset.result, "error");
  assert.match(event("bp-backup-dialog-title").textContent, /No se pudo exportar/);
  event("bp-backup-dialog").close(); // Esc tiene el mismo evento de cierre.
  assert.ok(button.focusCount >= 1);
});
