const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "..");
const edge = fs.readFileSync(path.join(root, "supabase/functions/register-tournament-pair/index.ts"), "utf8");
const publicUi = fs.readFileSync(path.join(root, "js/torneos-public.js"), "utf8");
const admin = fs.readFileSync(path.join(root, "js/admin-parejas.js"), "utf8");
const tournamentId = "00000000-0000-0000-0000-000000000111";
const origin = "https://boulevard-padel.pages.dev";

function handlerFor({
  tournament={id:tournamentId,name:"Copa BP · 2026",format:"league",is_published:true,status:"registration_open",max_pairs:8,ends_on:"9999-12-31",registration_closes_at:null},
  count=2, insertError=null, turnstileOk=true, emailStatus=200, emailFail=false,
  emailKey="fake-resend-key", fromEmail="Torneos <notificaciones@example.com>"
}={}) {
  const writes=[], requests=[], warnings=[];
  const environment = new Map([
    ["TURNSTILE_SECRET_KEY","fake-turnstile-secret"],
    ["SUPABASE_SERVICE_ROLE_KEY","fake-service-role-not-exposed"],
    ["SUPABASE_URL","https://fake.supabase.co"],
    ["RESEND_API_KEY",emailKey],
    ["FIXED_TURN_FROM_EMAIL",fromEmail],
    ["FIXED_TURN_ADMIN_EMAIL","otra-casilla@example.com"]
  ]);
  const db = {
    from(table) {
      if(table==="bp_tournaments") return {
        select(){return this;},
        eq(){return this;},
        async maybeSingle(){return {data:tournament,error:null}}
      };
      if(table==="bp_tournament_pairs") return {
        select(){return this;},
        eq(){return this;},
        async in(){return {count,error:null}},
        async insert(row){writes.push(row);return {error:insertError}}
      };
      throw Error("Unexpected DB table: "+table);
    }
  };
  const fetchMock = async (url,options={})=>{
    requests.push({url,options});
    if(url.includes("siteverify")){
      return new Response(JSON.stringify({success:turnstileOk,hostname:"boulevard-padel.pages.dev"}),{status:200});
    }
    if(url.includes("api.resend.com")){
      if(emailFail)throw Error("Correo simulado sin servicio");
      return new Response(JSON.stringify({id:"fake-mail"}),{status:emailStatus});
    }
    throw Error("Unexpected URL "+url);
  };
  let handler;
  const deno={
    env:{get:k=>environment.get(k)},
    serve(fn){handler=fn;}
  };
  // Transforma únicamente los tipos triviales de ESTE archivo para evaluar
  // su lógica real en Node 22 con fetch, DB y secretos simulados.
  const runnable=edge
    .replace(/^import .*\n/m,"")
    .replace("status: number,","status,")
    .replace("body: Record<string, unknown>,","body,")
    .replace("origin: string | null,","origin,")
    .replace("(v: unknown)","(v)")
    .replace("let payload: Record<string, unknown>;","let payload;")
    .replace("origin!","origin");
  vm.runInNewContext(runnable,{
    Deno:deno,createClient:()=>db,fetch:fetchMock,
    URL,URLSearchParams,Request,Response,Date,Intl,
    console:{error:(...x)=>warnings.push(x),warn:(...x)=>warnings.push(x),log(){}}
  },{timeout:3000});
  assert.equal(typeof handler,"function");
  return {
    writes,requests,warnings,
    async send(body={
      tournamentId,
      player1_name:"Lucía Pérez",
      player2_name:"Ana Gómez",
      contact_phone:"+54 3492 123456",
      turnstileToken:"test-token",
    },requestOrigin=origin){
      const req=new Request("https://fake.supabase.co/functions/v1/register-tournament-pair",{
        method:"POST",
        headers:{"Origin":requestOrigin,"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const res=await handler(req);
      return {status:res.status,data:await res.json()};
    }
  };
}

test("El alta pública guarda aprobada y envía un único email DIRECTO a BP",async()=>{
  const run=handlerFor();
  const response=await run.send();
  assert.equal(response.status,201);
  assert.equal(response.data.ok,true);
  assert.match(response.data.message,/Inscripci[oó]n confirmada/);
  assert.equal(run.writes.length,1);
  assert.equal(run.writes[0].status,"approved");
  assert.equal(run.writes[0].source,"web");
  const mail=run.requests.filter(x=>x.url==="https://api.resend.com/emails");
  assert.equal(mail.length,1);
  const payload=JSON.parse(mail[0].options.body);
  assert.deepEqual(payload.to,["boulevardpadelvila@gmail.com"]);
  assert.match(payload.subject,/Nueva pareja inscripta y aprobada/);
  assert.match(payload.text,/Copa BP · 2026/);
  assert.match(payload.text,/Lucía Pérez/);
  assert.match(payload.text,/Ana Gómez/);
  assert.match(payload.text,/\+54 3492 123456/);
  assert.match(payload.text,/podés eliminar su inscripción manualmente/);
  assert.ok(!payload.text.includes("Pendiente de aprobación"));
  assert.ok(payload.text.includes("\n"),"Correo legible en varias líneas");
});

test("Si falta Resend, la pareja sigue aprobada y se responde éxito",async()=>{
  const run=handlerFor({emailKey:""});
  const response=await run.send();
  assert.equal(response.status,201);
  assert.equal(run.writes[0].status,"approved");
  assert.equal(run.requests.filter(x=>x.url.includes("resend.com")).length,0);
  assert.ok(run.warnings.length>0);
});

test("Fallo de red o rechazo de Resend NO borra ni rechaza la inscripción",async()=>{
  for(const scenario of [{emailFail:true},{emailStatus:503}]){
    const run=handlerFor(scenario);
    const response=await run.send();
    assert.equal(response.status,201);
    assert.equal(run.writes.length,1);
    assert.equal(run.writes[0].status,"approved");
    assert.ok(run.warnings.length>0);
  }
});

test("Cupo completo: error 409 sin INSERT ni mail",async()=>{
  const run=handlerFor({count:8});
  const response=await run.send();
  assert.equal(response.status,409);
  assert.match(response.data.error,/cupo/);
  assert.equal(run.writes.length,0);
  assert.equal(run.requests.filter(x=>x.url.includes("resend.com")).length,0);
});

test("Duplicado o cupo disparado por trigger: 409 y sin aviso",async()=>{
  for(const insertError of [{code:"23505"},{code:"23514"}]){
    const run=handlerFor({insertError});
    const response=await run.send();
    assert.equal(response.status,409);
    assert.equal(run.requests.filter(x=>x.url.includes("resend.com")).length,0);
  }
});

test("Turnstile inválido, torneo oculto u origen externo: nunca inscriben",async()=>{
  for(const scenario of [
    {params:{turnstileOk:false}},
    {params:{tournament:{id:tournamentId,name:"Oculto",format:"league",is_published:false,status:"registration_open"}}},
    {params:{},origin:"https://sitio-ajeno.example"}
  ]){
    const run=handlerFor(scenario.params);
    const response=await run.send(undefined,scenario.origin||origin);
    assert.notEqual(response.status,201);
    assert.equal(run.writes.length,0);
  }
});

test("El Admin conserva editar/eliminar, pero no aprobar ni rechazar",()=>{
  assert.match(admin,/button\("Editar",\s*\(\) => openEdit\(pair\)\)/);
  assert.match(admin,/button\("Eliminar inscripción",\s*\(\) => askRemove\(pair\), true\)/);
  assert.doesNotMatch(admin,/button\("Aprobar"/);
  assert.doesNotMatch(admin,/button\("Rechazar"/);
  assert.doesNotMatch(admin,/function askStatus\(/);
  assert.match(admin,/data\?\.length !== 1/);
});

test("El formulario público comunica inscripción confirmada",()=>{
  assert.match(publicUi,/Inscripción confirmada\. ¡La pareja ya quedó inscripta en el torneo!/);
  assert.doesNotMatch(publicUi,/Quedó pendiente de aprobación del administrador/);
});
