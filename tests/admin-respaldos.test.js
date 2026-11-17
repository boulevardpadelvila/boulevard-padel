const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const backup = require("../js/admin-respaldos.js");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("respaldo de reservas conserva exactamente nombre, fecha argentina, hora y teléfono", () => {
  const rows = backup.normalizeReservations([
    {booking_name:"Ana Pérez",booking_phone:"+54 3492 123456",starts_at:"2026-11-13T21:30:00Z",customers:{full_name:"Otra persona",phone:"000"}},
    {booking_name:null,booking_phone:null,starts_at:"2026-11-14T00:00:00Z",customers:{full_name:"Luis",phone:"12345"}}
  ]);
  assert.deepEqual(rows,[
    ["Ana Pérez","13/11/2026","18:30","+54 3492 123456"],
    ["Luis","13/11/2026","21:00","12345"]
  ]);
  rows.forEach((r)=>assert.equal(r.length,4));
  const csv=backup.toCsv(rows);
  assert.match(csv,/Nombre","Día","Hora","Teléfono/);
  assert.doesNotMatch(csv,/correo|observaciones|código|ID|notas/i);
});

test("turnos fijos solo presentan cuatro columnas con el día de semana",()=>{
  const rows=backup.normalizeFixed([{weekday:1,start_time:"18:30:00",customers:{full_name:"Martín",phone:"3492-123"}},
    {weekday:7,start_time:"09:00:00",customers:{full_name:"Belén",phone:"342-111"}}]);
  assert.deepEqual(rows,[["Martín","Lunes","18:30","3492-123"],["Belén","Domingo","09:00","342-111"]]);
});

test("el CSV evita fórmulas al importar nombres o teléfonos de jugadores",()=>{
  const content=backup.toCsv([["=IMPORTXML(\"example\")","13/11/2026","09:00","+5492111"]]);
  assert.match(content,/'=IMPORTXML/);
  assert.match(content,/'\+5492111/);
  assert.ok(content.startsWith("\ufeff"));
  assert.match(backup.html("<img src=x onerror=alert(1)>"),/&lt;img/);
  assert.doesNotMatch(backup.html("<img>"),/<img>/);
});

test("las consultas de respaldo son solo para administradores y CSV de reservas vigentes",()=>{
  const src=read("js/admin-respaldos.js");
  const page=read("admin/index.html");
  const admin=read("js/admin-torneos.js");
  assert.match(src,/supabaseClient\.rpc\("bp_tournament_is_admin"\)/);
  assert.match(src,/\.eq\("status", "confirmed"\)/);
  assert.match(src,/\.eq\("status", "approved"\)/);
  assert.match(src,/select\("booking_name,booking_phone,starts_at,customers\(full_name,phone\)"\)/);
  assert.match(src,/select\("weekday,start_time,customers\(full_name,phone\)"\)/);
  assert.match(src,/const HEADERS = \["Nombre", "Día", "Hora", "Teléfono"\]/);
  assert.match(src,/window\.open\("", "_blank"\)/);
  assert.match(page,/id="bp-backup-reservations"/);
  assert.match(page,/id="bp-backup-fixed"/);
  assert.match(page,/js\/admin-respaldos\.js/);
  assert.match(admin,/action\("PDF del torneo"/);
  assert.doesNotMatch(src,/service_role|SERVICE_ROLE_KEY|api\.google\.com|localStorage\.setItem/i);
});

test("PDF de torneo contiene parejas, ganador y marcadores sin teléfonos y escapa HTML",()=>{
  const doc=backup.tournamentHtml({
    id:"t",name:"Copa <script>alert(1)</script>",format:"groups_knockout",
    status:"completed",starts_on:"2026-11-13"
  },{
    pairs:[
      {id:"p1",status:"approved",player1_name:"Ana",player2_name:"Sofía"},
      {id:"p2",status:"approved",player1_name:"Lucía",player2_name:"Inés"}
    ],
    groups:[],groupMembers:[],groupMatches:[],groupResults:[],
    bracket:{matches:[{
      stage:1,slot:1, pair1_id:"p1",pair2_id:"p2",
      pair1_name:"Ana y Sofía",pair2_name:"Lucía y Inés",
      status:"played",sets:[[6,4],[6,3]],winner_pair_id:"p1"
    }]},
    leagueMatches:[],leagueFinals:[]
  });
  assert.match(doc,/Campeones/);
  assert.match(doc,/Subcampeones/);
  assert.match(doc,/6-4 · 6-3/);
  assert.match(doc,/Copa &lt;script&gt;/);
  assert.doesNotMatch(doc,/<script>alert/);
  assert.doesNotMatch(doc,/Teléfono|booking_phone|contact_phone/i);
  assert.match(doc,/Guardar como PDF/);
});

test("PDF horizontal muestra llave completa aun sin resultados, con nombres y códigos oficiales",()=>{
  globalThis.BPReglamento2026=require("../js/torneos-reglamento-2026.js");
  const pairs=Array.from({length:18},(_,i)=>({
    id:"p"+(i+1),status:"approved",player1_name:"Jugador "+(i+1),player2_name:"Compañero "+(i+1)
  }));
  const doc=backup.tournamentHtml({name:"Torneo de 18",format:"groups_knockout",status:"registration_closed"},{
    pairs,groups:[],groupMembers:[],groupMatches:[],groupResults:[],
    bracket:{matches:[]},leagueMatches:[],leagueFinals:[]
  });
  assert.match(doc,/@page\{size:A4 landscape/);
  assert.match(doc,/Cuadro de eliminatorias/);
  assert.match(doc,/Ronda previa/);
  assert.match(doc,/Cuartos/);
  assert.match(doc,/Semifinales/);
  assert.match(doc,/P1/);
  assert.match(doc,/C1/);
  assert.match(doc,/S1/);
  assert.match(doc,/F1/);
  assert.match(doc,/Ganador P1/);
  assert.match(doc,/2° C/);
  assert.doesNotMatch(doc,/booking_phone|contact_phone|service_role/i);
});
test("PDF permite exportar una llave en progreso sin inventar ganadores",()=>{
  globalThis.BPReglamento2026=require("../js/torneos-reglamento-2026.js");
  const pairs=Array.from({length:8},(_,i)=>({
    id:"p"+i,status:"approved",player1_name:"Ana "+i,player2_name:"Sol "+i
  }));
  const doc=backup.tournamentHtml({name:"Copa",format:"groups_knockout",status:"in_progress"},{
    pairs,groups:[],groupMembers:[],groupMatches:[],groupResults:[],
    bracket:{matches:[{stage:0,slot:1,source1:"3° A",source2:"2° B",
      pair1_name:"Ana y Sol",status:"pending"}]},
    leagueMatches:[],leagueFinals:[]
  });
  assert.match(doc,/Ana y Sol/);
  assert.match(doc,/Ganador P1/);
  assert.match(doc,/Final/);
  assert.doesNotMatch(doc,/<script src=/);
});
