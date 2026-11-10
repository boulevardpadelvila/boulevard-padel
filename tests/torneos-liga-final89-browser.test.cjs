/* Boulevard Pádel · P89 · Prueba real en Chromium.
 * Aislada: datos ficticios, funciones Supabase simuladas, sin red/producción.
 * Se ejecuta separadamente de node --test tests/*.test.js en GitHub Actions.
 */
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
const src = (name) => path.resolve(__dirname, "..", name);
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { if (browser) await browser.close(); });

const fakeTournament = { id: "liga-fixture-89", name: "Liga de prueba 89",
  format: "league", status: "in_progress", settings: { legs: 1 } };
const fakePairs = [["a","Pareja Ana y Sol"],["b","Pareja Berta y Luz"],
  ["c","Pareja Cami y Paz"],["d","Pareja Dora y Eva"]];
const regular = [{ id:"reg-1", pair1_id:"a",pair2_id:"b",
  match_status:"played",sets:[[6,2],[6,3]],sets_pair1:2,sets_pair2:0,
  winner_pair_id:"a" }];
const finalsFixture = [
  { id:"sf1", stage:"semifinal", slot:1, pair1_id:"a",pair2_id:"c",
    match_status:"pending",schedule_status:"unscheduled",sets:null },
  { id:"sf2", stage:"semifinal", slot:2, pair1_id:"b",pair2_id:"d",
    match_status:"pending",schedule_status:"unscheduled",sets:null },
  { id:"final", stage:"final", slot:1, pair1_id:null,pair2_id:null,
    match_status:"pending",schedule_status:"unscheduled",sets:null }
];

test("P89 Chromium público móvil: cuadro y proclamación sólo con final oficial",async()=>{
  const page = await browser.newPage({ viewport:{width:390,height:844},
    locale:"es-AR", timezoneId:"America/Argentina/Cordoba" });
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="public-tournaments" id="t"></main></body></html>');
  await page.addStyleTag({path:src("css/torneos-liga-final89.css")});
  await page.addScriptTag({path:src("js/torneos-liga-final89-public.js")});
  await page.evaluate(()=>{
    const t={id:"t1",format:"league",status:"in_progress"};
    const p={pairs:[{id:"a",name:"Ana y Sol"},{id:"b",name:"Berta y Luz"},{id:"c",name:"Cami y Paz"},{id:"d",name:"Dora y Eva"}]};
    const data={tournament_id:"t1",status:"in_progress",
      champion_pair_id:null,runner_up_pair_id:null,matches:[
      {id:"s1",stage:"semifinal",slot:1,pair1_id:"a",pair2_id:"c",
       match_status:"played",sets:[[6,2],[6,3]],schedule_status:"scheduled",
       scheduled_at:"2027-01-12T22:00:00+00:00"},
      {id:"s2",stage:"semifinal",slot:2,pair1_id:"b",pair2_id:"d",
       match_status:"pending",sets:null,schedule_status:"unscheduled"},
      {id:"f",stage:"final",slot:1,pair1_id:null,pair2_id:null,
       match_status:"pending",sets:null,schedule_status:"scheduled",
       scheduled_at:"2027-01-19T22:00:00+00:00"}]};
    window.p89public={t,p,data};
    const block=BPLeagueFinalPublic89.finalBlock(t,p,data);
    document.getElementById("t").append(block);
  });
  // En el sitio la fase final es una tarjeta plegable (details).
  await page.locator(".bp-public-league-final > summary").click();
  assert.equal(await page.locator(".bp-public-league-final__match").count(),3);
  assert.match(await page.locator("#t").innerText(),/Ganador semifinal 1/);
  assert.match(await page.locator("#t").innerText(),/12\/01\/2027/);
  assert.equal(await page.locator(".bp-public-league-final__champions").count(),0);
  await page.evaluate(()=>{
    const {t,p,data}=window.p89public;
    t.status="completed";data.status="completed";
    data.champion_pair_id="a";data.runner_up_pair_id="b";
    data.matches[2]={...data.matches[2],pair1_id:"a",pair2_id:"b",
      winner_pair_id:"a",sets:[[6,4],[4,6],[6,3]],match_status:"played"};
    document.getElementById("t").replaceChildren(
      BPLeagueFinalPublic89.finalBlock(t,p,data));
  });
  // Re-renderizar sustituye <details>; la nueva tarjeta empieza cerrada.
  await page.locator(".bp-public-league-final > summary").click();
  assert.equal(await page.locator(".bp-public-league-final__champions").count(),1);
  assert.match(await page.locator(".bp-public-league-final__champions").innerText(),/Campeón: Ana y Sol/);
  assert.match(await page.locator(".bp-public-league-final__champions").innerText(),/Subcampeón: Berta y Luz/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  assert.equal(overflow,false,"La fase final creó desplazamiento horizontal en móvil");
  await page.close();
});

function adminFixtureHtml() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
  <select id="torneos-pairs-tournament"><option value="liga-fixture-89">Liga de prueba</option></select>
  <button id="bp-league-refresh" type="button">Actualizar</button>
  <section id="bp-league-final-panel" hidden>
  <button id="bp-league-final-generate" type="button">Generar semifinales</button>
  <p id="bp-league-final-message"></p>
  <div id="bp-league-final-fixture"></div></section>
  <dialog id="bp-league-final-generate-dialog">
    <p id="bp-league-final-generate-description"></p>
    <button id="bp-league-final-generate-cancel" type="button">Volver</button>
    <button id="bp-league-final-generate-confirm" type="button">Generar semifinales</button>
  </dialog>
  <dialog id="bp-league-final-schedule-dialog">
    <h2 id="bp-league-final-schedule-title"></h2>
    <p id="bp-league-final-schedule-rivals"></p>
    <form id="bp-league-final-schedule-form">
      <input id="bp-league-final-day" type="date" required>
      <select id="bp-league-final-time" required></select>
      <select id="bp-league-final-duration"><option value="90">90</option><option value="120">120</option></select>
      <input id="bp-league-final-court" type="text">
      <input id="bp-league-final-postpone" type="checkbox">
      <p id="bp-league-final-schedule-error"></p>
      <button id="bp-league-final-schedule-cancel" type="button">Volver</button>
      <button id="bp-league-final-schedule-save" type="submit">Guardar horario</button>
    </form></dialog>
  <dialog id="bp-league-final-result-dialog">
    <h2 id="bp-league-final-result-title"></h2>
    <p id="bp-league-final-result-rivals"></p>
    <form id="bp-league-final-result-form">
      <div id="bp-league-final-sets"></div>
      <p id="bp-league-final-result-error"></p>
      <button id="bp-league-final-result-cancel" type="button">Volver</button>
      <button id="bp-league-final-result-save" type="submit">Guardar resultado</button>
    </form></dialog>
  </body></html>`;
}

test("P89 Chromium Admin móvil: generar, programar y cargar resultado sin tocar fase regular",async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844},
    locale:"es-AR",timezoneId:"America/Argentina/Cordoba"});
  await page.setContent(adminFixtureHtml());
  await page.addStyleTag({path:src("css/admin-liga82.css")});
  await page.addStyleTag({path:src("css/admin-liga-final89-ui.css")});
  await page.evaluate(({fakeTournament,fakePairs,regular,finalsFixture})=>{
    window.P89fixture={fakeTournament,fakePairs,regular,finals:[],requests:[]};
    window.BPLeagueEngine={standings:()=>({complete:true})};
    window.BPLeagueFinal89={planFinalPhase:()=>({ready:true,reason:null})};
    window.BPTournamentEngine={evaluateSets:({sets})=>{
      if (sets.length===2 && sets[0][0]===sets[0][1]) throw Error("Marcador inválido");
      return {winnerSide:1};
    }};
    window.supabaseClient={
      from:(table)=>{
        if (table!=="bp_league_final_matches") throw Error("Tabla Admin inesperada: "+table);
        return {select:()=>({eq:()=>Promise.resolve({data:P89fixture.finals.map(x=>({...x})),error:null})})};
      },
      rpc:async (name,args)=>{
        P89fixture.requests.push({name,args});
        if (name==="bp_league_prepare_final89") {
          P89fixture.finals=finalsFixture.map(x=>({...x}));
        } else if (name==="bp_league_final_schedule89") {
          const m=P89fixture.finals.find(x=>x.id===args.p_match_id);
          m.schedule_status=args.p_start?"scheduled":"postponed";
          m.scheduled_at=args.p_start;
          m.scheduled_ends_at=args.p_start
            ? new Date(Date.parse(args.p_start)+args.p_duration_minutes*60000).toISOString():null;
          m.court_label=args.p_court_label;
        } else if (name==="bp_league_final_save_result89") {
          const m=P89fixture.finals.find(x=>x.id===args.p_match_id);
          m.sets=args.p_sets;m.match_status="played";
          m.winner_pair_id=m.pair1_id;
        } else throw Error("RPC Admin inesperada: "+name);
        return {error:null};
      }
    };
    document.getElementById("bp-league-refresh").addEventListener("click",()=>{
      window.dispatchEvent(new CustomEvent("bp:league-loaded",{detail:{
        tournament:P89fixture.fakeTournament,pairs:P89fixture.fakePairs,
        matches:P89fixture.regular}}));
    });
  },{fakeTournament,fakePairs,regular,finalsFixture});
  await page.addScriptTag({path:src("js/admin-liga-final89-ui.js")});
  await page.locator("#bp-league-refresh").click();
  await page.locator("#bp-league-final-panel:visible").waitFor();
  await page.locator("#bp-league-final-generate").click();
  assert.equal(await page.locator("#bp-league-final-generate-dialog").evaluate(e=>e.open),true);
  await page.locator("#bp-league-final-generate-cancel").click();
  assert.equal(await page.locator("#bp-league-final-generate-dialog").evaluate(e=>e.open),false);
  await page.locator("#bp-league-final-generate").click();
  await page.locator("#bp-league-final-generate-confirm").click();
  await page.locator("#bp-league-final-fixture article").first().waitFor();
  assert.equal(await page.locator("#bp-league-final-fixture article").count(),3);
  const schedule=page.locator("#bp-league-final-fixture article").first();
  await schedule.getByRole("button",{name:"Programar"}).click();
  assert.equal(await page.locator("#bp-league-final-schedule-dialog").evaluate(e=>e.open),true);
  await page.locator("#bp-league-final-day").fill("2027-01-12");
  await page.locator("#bp-league-final-time").selectOption("19:00");
  await page.locator("#bp-league-final-duration").selectOption("120");
  await page.locator("#bp-league-final-schedule-save").click();
  await page.waitForFunction(()=>P89fixture.requests.some(x=>x.name==="bp_league_final_schedule89"));
  const rpc=await page.evaluate(()=>P89fixture.requests.find(x=>x.name==="bp_league_final_schedule89"));
  assert.equal(rpc.args.p_duration_minutes,120);
  assert.match(rpc.args.p_start,/2027-01-12T22:00:00/);
  await page.locator("#bp-league-final-fixture article").first().getByRole("button",{name:"Cargar resultado"}).click();
  assert.equal(await page.locator("#bp-league-final-result-dialog").evaluate(e=>e.open),true);
  const rows=page.locator("#bp-league-final-sets .bp-league__set");
  assert.equal(await rows.count(),3);
  await rows.nth(0).locator("input").nth(0).fill("6");
  await rows.nth(0).locator("input").nth(1).fill("2");
  await rows.nth(1).locator("input").nth(0).fill("6");
  await rows.nth(1).locator("input").nth(1).fill("3");
  await page.locator("#bp-league-final-result-save").click();
  await page.waitForFunction(()=>P89fixture.requests.some(x=>x.name==="bp_league_final_save_result89"));
  const result=await page.evaluate(()=>P89fixture.requests.find(x=>x.name==="bp_league_final_save_result89"));
  assert.equal(result.args.p_match_id,"sf1");
  assert.equal(result.args.p_sets.length,2);
  const forbidden=await page.evaluate(()=>P89fixture.requests.filter(x=>/^(create_booking|create_admin_booking|bp_league_save_result)$/.test(x.name)));
  assert.equal(forbidden.length,0);
  await page.close();
});
