/* Boulevard Pádel · Parche 88 · Regresiones de limpieza segura, sin conectar BD. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const html = read("admin/index.html");
const css = read("css/admin-limpieza88.css");
const js = read("js/admin-limpieza88.js");
const sql = read("sql/SQL_88_LIMPIEZA_HISTORIAL_RESERVAS.sql");

test("88: cinco botones iguales en Reservas, en escritorio y móvil", () => {
  const block = html.split('class="dashboard-actions"')[1]?.split("</div>")[0];
  assert.ok(block);
  for(const id of ["reservations-today","new-booking-open","show-cancelled","refresh-reservations","bp-cleanup88-open"])
    assert.ok(block.includes('id="' + id + '"'), "Falta botón "+id);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.dashboard-actions > button \{[^}]*width: 100%;[^}]*min-height: 46px;[^}]*height: 46px;/);
});

test("88: modal institucional y control con dos confirmaciones", () => {
  assert.match(html, /id="bp-cleanup88-dialog"\s+class="admin-save-dialog bp-cleanup88__dialog"/);
  for(const id of ["bp-cleanup88-cancelled","bp-cleanup88-finished","bp-cleanup88-fixed","bp-cleanup88-count-total","bp-cleanup88-phrase"])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(html, /Segunda confirmación: escribí <strong>ELIMINAR<\/strong>/);
  assert.match(js, /phrase\.value\.trim\(\) !== "ELIMINAR"/);
  assert.doesNotMatch(js, /window\.confirm\(|window\.prompt\(|\.from\(["']reservations["']\)\.delete\(/);
});

test("88: RPC requiere administrador activo y restringe acceso anónimo", () => {
  assert.match(sql, /SECURITY DEFINER\s+SET search_path TO ''/);
  assert.match(sql, /auth\.uid\(\) IS NULL OR NOT public\.is_admin\(\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.bp_admin_cleanup_reservations/);
  assert.match(sql, /FROM PUBLIC, anon;/);
  assert.match(sql, /TO authenticated;/);
  assert.doesNotMatch(sql, /GRANT\s+DELETE\b/i);
});

test("88: turnos fijos vigentes protegidos, incluso con partidos ya jugados", () => {
  assert.match(sql, /f\.status IN \('cancelled', 'ended'\)/);
  assert.match(sql, /f\.status = 'approved'\s+AND f\.duration_type = 'defined'\s+AND f\.end_date < v_today/);
  assert.match(sql, /future\.status = 'confirmed'\s+AND future\.ends_at > v_now/);
  assert.match(sql, /r\.fixed_turn_request_id = ANY\(v_fixed_ids\)/);
  assert.doesNotMatch(sql, /f\.status IN \('pending', 'approved'\)/);
  assert.doesNotMatch(sql, /DELETE FROM public\.customers/);
  assert.doesNotMatch(sql, /DELETE FROM public\.blockouts/);
});

test("88: reservas finales por horario real, canceladas sin borrar vigentes", () => {
  assert.match(sql, /r\.fixed_turn_request_id IS NULL\s+AND r\.source <> 'fixed'\s+AND r\.status = 'cancelled'/);
  assert.match(sql, /r\.status IN \('confirmed', 'completed'\)\s+AND r\.ends_at <= v_now/);
  assert.match(sql, /SELECT COALESCE\(array_agg\(r\.id ORDER BY r\.id\)/);
  assert.doesNotMatch(sql, /TRUNCATE\s+public\./i);
});

test("88: previsualización NO borra; firma atómica y revalidación", () => {
  const preview = sql.indexOf("IF p_expected_signature IS NULL THEN");
  const del = sql.indexOf("DELETE FROM public.reservations r");
  assert.ok(preview > 0 && del > preview);
  assert.match(sql, /IF p_expected_signature <> v_signature THEN/);
  assert.match(sql, /v_deleted_reservations <> v_expected/);
  assert.match(sql, /v_deleted_fixed <> cardinality\(v_fixed_ids\)/);
  assert.match(sql, /IF v_expected = 0 AND cardinality\(v_fixed_ids\) = 0 THEN/);
  assert.match(js, /p_expected_signature: null/);
  assert.match(js, /p_expected_signature: saved\.signature/);
});

test("88: carga del módulo sin afectar otras secciones ni SQL automático", () => {
  assert.match(html, /href="\.\.\/css\/admin-limpieza88\.css"/);
  assert.match(html, /src="\.\.\/js\/admin-limpieza88\.js" defer/);
  assert.ok(html.indexOf("admin-limpieza88.css") > html.indexOf("torneos-tablas87.css"));
  assert.ok(html.indexOf("admin-limpieza88.js") > html.indexOf("admin.js"));
  assert.doesNotMatch(js, /eval\(|fetch\(|service_role|ALTER TABLE/);
});

function fakeUi(handler) {
  class FakeNode {
    constructor() {
      this.handlers = new Map();
      this.textContent = "";
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.value = "";
      this.className = "";
      this.open = false;
      this.clicks = 0;
    }
    addEventListener(name, cb) {
      const listeners = this.handlers.get(name) || [];
      listeners.push(cb);
      this.handlers.set(name,listeners);
    }
    fire(name) {
      for (const cb of this.handlers.get(name) || []) cb({preventDefault() {}});
    }
    showModal() { this.open = true; }
    close() { this.open = false; this.fire("close"); }
    focus() {}
    click() { this.clicks++; this.fire("click"); }
  }
  const nodes = new Map();
  const document = {getElementById(id) {
    if (!nodes.has(id)) nodes.set(id,new FakeNode());
    return nodes.get(id);
  }};
  const calls = [];
  const supabaseClient = { rpc: async(name,args) => {
    calls.push({name,args});
    return handler(name,args);
  }};
  vm.runInNewContext(js,{document,supabaseClient});
  const get=(id)=>document.getElementById(id);
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  return {get,calls,tick};
}

test("88: integración DOM: no se borra antes del resumen y palabra exacta", async () => {
  const counts = {
    cancelled_reservations: 4, finished_reservations: 3,
    fixed_turns: 0, fixed_reservations: 0,
    total_reservations: 7, total_rows: 7, signature: "test-signature",
  };
  const ui = fakeUi(async(_name, args) => ({
    data: { ...counts, deleted: args.p_expected_signature !== null },
    error: null,
  }));
  ui.get("bp-cleanup88-open").click();
  ui.get("bp-cleanup88-next").click();
  await ui.tick();
  assert.equal(ui.calls.length,0,"No se consulta sin categoría elegida");
  ui.get("bp-cleanup88-cancelled").checked=true;
  ui.get("bp-cleanup88-finished").checked=true;
  ui.get("bp-cleanup88-next").click();
  await ui.tick();
  assert.equal(ui.calls.length,1);
  assert.equal(ui.calls[0].args.p_expected_signature,null);
  assert.equal(ui.get("bp-cleanup88-next").disabled,true,"Antes de escribir ELIMINAR");
  ui.get("bp-cleanup88-phrase").value="ELIMINAR";
  ui.get("bp-cleanup88-phrase").fire("input");
  assert.equal(ui.get("bp-cleanup88-next").disabled,false);
  ui.get("bp-cleanup88-next").click();
  await ui.tick();
  assert.equal(ui.calls.length,2);
  assert.equal(ui.calls[1].args.p_expected_signature,"test-signature");
  assert.equal(ui.get("refresh-reservations").clicks,1);
  assert.equal(ui.get("admin-fixed-refresh").clicks,1);
  assert.match(ui.get("bp-cleanup88-feedback").textContent,/7 reservas/);
});

test("88: una firma vencida cancela la acción y exige nueva vista previa", async () => {
  const ui = fakeUi(async(_name,args)=>{
    if (args.p_expected_signature !== null)
      return {data:null,error:{message:"El historial cambió"}};
    return {data:{
      cancelled_reservations:1, finished_reservations:0,
      fixed_turns:0,fixed_reservations:0,
      total_reservations:1,total_rows:1,signature:"old",deleted:false,
    },error:null};
  });
  ui.get("bp-cleanup88-open").click();
  ui.get("bp-cleanup88-cancelled").checked=true;
  ui.get("bp-cleanup88-next").click();
  await ui.tick();
  ui.get("bp-cleanup88-phrase").value="ELIMINAR";
  ui.get("bp-cleanup88-phrase").fire("input");
  ui.get("bp-cleanup88-next").click();
  await ui.tick();
  assert.equal(ui.get("bp-cleanup88-choose").hidden,false);
  assert.equal(ui.get("bp-cleanup88-feedback").textContent,"");
  assert.match(ui.get("bp-cleanup88-error").textContent,/cambió/);
  assert.equal(ui.get("refresh-reservations").clicks,0);
});
