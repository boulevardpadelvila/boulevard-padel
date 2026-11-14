// Aislamiento total: mocks de red. Nunca consulta Supabase ni Cloudflare reales.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fnPath = path.join(root, "functions/admin/simulador-llaves.html.js");
const route = "/admin/simulador-llaves.html";
const original = fs.readFileSync(fnPath, "utf8");
const config = JSON.parse(fs.readFileSync(path.join(root,"_routes.json"),"utf8"));
const token = "jwt-ficticio-".repeat(7); // no es una sesión real
const martinId = "72eb5b79-eb7e-4cd4-9e8c-8736f0aeaa3d";

function makeHandler(mockFetch) {
  const ctx = { Response, fetch: mockFetch };
  const script = original.replace("export async function onRequest", "async function onRequest");
  vm.runInNewContext(script + "\nthis.handler = onRequest;",ctx);
  return ctx.handler;
}

function req(method="POST",authorization="Bearer "+token) {
  const headers = authorization ? {Authorization:authorization}:{};
  return new Request("https://boulevard-padel.pages.dev"+route,{method,headers});
}
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json"}});

test("La URL tiene una única ruta edge y no queda el HTML estático descargable",()=>{
  assert.deepEqual(config,{version:1,include:["/admin/simulador-llaves",route,"/functions/*"],exclude:[]});
  const alias=fs.readFileSync(path.join(root,"functions/admin/simulador-llaves.js"),"utf8");
  assert.match(alias,/export\s*\{\s*onRequest\s*\}\s*from\s*"\.\/simulador-llaves\.html\.js"/);
  const middleware=fs.readFileSync(path.join(root,"functions/_middleware.js"),"utf8");
  assert.match(middleware,/path\.startsWith\("\/functions\/"\)/);
  assert.match(middleware,/status:\s*404/);
  assert.equal(fs.existsSync(path.join(root,"admin/simulador-llaves.html")),false);
  assert.match(original,/auth\/v1\/user/);
  assert.match(original,/rest\/v1\/rpc\/is_admin/);
  assert.match(original,/martin/i);
  assert.match(original,/Cache-Control.*no-store/);
});

test("GET sin sesión recibe solamente puerta de acceso, jamás las llaves",async()=>{
  const handler=makeHandler(()=>{throw new Error("GET no debe consultar la red")});
  const response=await handler({request:req("GET")});
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/Verificando el acceso/);
  assert.match(html,/supabaseClient\.auth\.getSession/);
  assert.match(html,/method: "POST"/);
  assert.doesNotMatch(html,/BPReglamento2026\.groupPlan/);
  assert.doesNotMatch(html,/Imprimir \/ guardar en PDF/);
  assert.match(response.headers.get("cache-control"),/no-store/);
  assert.equal(response.headers.get("x-robots-tag"),"noindex, nofollow");
});

test("Sin token no se realiza consulta externa y POST responde 403",async()=>{
  let calls=0;
  const handler=makeHandler(()=>{calls++;throw Error("unexpected fetch")});
  const response=await handler({request:req("POST","")});
  assert.equal(response.status,403);
  assert.equal(calls,0);
});

test("Token inventado o vencido: Supabase Auth niega y no se entrega simulador",async()=>{
  let calls=0;
  const handler=makeHandler(async url=>{
    calls++;
    assert.match(url,/\/auth\/v1\/user$/);
    return json({error:"jwt expired"},401);
  });
  const r=await handler({request:req()});
  assert.equal(r.status,403);
  assert.equal(calls,1);
});

test("Una tercera cuenta Admin no autorizada continúa bloqueada",async()=>{
  let calls=0;
  const handler=makeHandler(async()=>{
    calls++;
    return json({id:"00000000-0000-0000-0000-000000000999"});
  });
  const r=await handler({request:req()});
  assert.equal(r.status,403);
  assert.equal(calls,1); // no consultar rol si identidad no es una de las dos cuentas permitidas
});

test("Las dos cuentas de Martín requieren además permiso Admin activo",async()=>{
  for(const adminId of [
    "72eb5b79-eb7e-4cd4-9e8c-8736f0aeaa3d",
    "2e0b2b44-28a0-4659-9f65-70c947120f12"
  ]) {
    let calls=0;
    const handler=makeHandler(async(url)=>{
      calls++;
      if(url.endsWith("/auth/v1/user"))return json({id:adminId});
      if(url.endsWith("/rest/v1/rpc/is_admin"))return json(false);
      throw Error("URL inesperada");
    });
    const r=await handler({request:req()});
    assert.equal(r.status,403);
    assert.equal(calls,2);
  }
});

test("Martín sin rol admin activo: no se devuelve el simulador",async()=>{
  let calls=0;
  const handler=makeHandler(async(url)=>{
    calls++;
    if(url.endsWith("/auth/v1/user"))return json({id:martinId});
    if(url.endsWith("/rest/v1/rpc/is_admin"))return json(false);
    throw Error("URL inesperada");
  });
  const r=await handler({request:req()});
  assert.equal(r.status,403);
  assert.equal(calls,2);
});

test("Ambas cuentas de Martín, autenticadas y Admin activas, reciben el simulador",async()=>{
  for(const adminId of [
    "72eb5b79-eb7e-4cd4-9e8c-8736f0aeaa3d",
    "2e0b2b44-28a0-4659-9f65-70c947120f12"
  ]) {
    const urls=[];
    const handler=makeHandler(async(url,opts)=>{
      urls.push(url);
      assert.equal(opts.headers.apikey?.length>10,true);
      assert.ok(opts.headers.Authorization.startsWith("Bearer "));
      if(url.endsWith("/auth/v1/user"))return json({id:adminId});
      if(url.endsWith("/rest/v1/rpc/is_admin"))return json(true);
      throw Error("URL inesperada");
    });
    const r=await handler({request:req()});
    assert.equal(r.status,200);
    const html=await r.text();
    assert.match(html,/Simulador interactivo de llaves/);
    assert.ok(html.includes("Imprimir / guardar en PDF"));
    assert.ok(html.includes("../js/torneos-reglamento-2026.js"));
    assert.equal(urls.length,2);
    assert.match(r.headers.get("cache-control"),/no-store/);
  }
});

test("Cualquier método distinto de GET/HEAD/POST recibe 405 sin datos",async()=>{
  const handler=makeHandler(()=>{throw Error("unexpected fetch")});
  const r=await handler({request:req("PUT")});
  assert.equal(r.status,405);
  assert.equal(r.headers.get("allow"),"GET, HEAD, POST");
});
