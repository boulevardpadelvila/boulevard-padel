/* Boulevard Pádel · CI Chromium sin red: Admin y público de eliminatorias 2026. */
"use strict";
const {test,before,after}=require("node:test");
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const src=name=>path.resolve(__dirname,"..",name);
let browser;
before(async()=>{browser=await chromium.launch({headless:true});});
after(async()=>{if(browser)await browser.close();});

test("Público 2026: 40 parejas muestra TODA la llave y horas futuras sin datos privados",async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent("<!doctype html><html><head></head><body><main id='root'></main></body></html>");
  await page.addStyleTag({path:src("css/torneos-bracket2026.css")});
  await page.addScriptTag({path:src("js/torneos-reglamento-2026.js")});
  await page.addScriptTag({path:src("js/torneos-bracket2026-public.js")});
  const outcome=await page.evaluate(()=>{
    const n=40,plan=BPReglamento2026.groupPlan(n);
    const groups=plan.sizes.map((size,i)=>({number:i+1,pairs:Array.from({length:size},(_,j)=>({id:i*4+j}))}));
    const model=BPBracket2026Public.rounds(n);
    const total=model.rounds.reduce((s,r)=>s+r.matches.length,0);
    const fixture=[{id:"fixture-1"}];
    const matches=[{stage:0,slot:1,pair1_name:"Ana y Sol",pair2_name:null,
      schedule_status:"scheduled",scheduled_at:"2027-03-20T22:00:00.000Z"}];
    const node=BPBracket2026Public.render({format:"groups_knockout"},groups,fixture,{matches});
    document.getElementById("root").append(node);
    return {count:document.querySelectorAll(".bp26-public__match").length,
      expected:total,heading:node.querySelector("summary").textContent,
      text:node.textContent};
  });
  assert.equal(outcome.count,outcome.expected);
  assert.match(outcome.heading,/Cuadro de eliminatorias/);
  assert.match(outcome.text,/Ana y Sol/);
  assert.match(outcome.text,/Programado:/);
  assert.doesNotMatch(outcome.text,/contact_phone|service_role/);
  await page.close();
});

test("Admin 2026: abrir horario y enviar RPC nueva con marcador aún desconocido",async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:"America/Argentina/Cordoba"});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><select id="torneos-pairs-tournament"><option value="t1" selected>Campeonato</option></select><section id="bp-results-panel"></section></body></html>');
  await page.evaluate(()=>{
    const rows={
      bp_tournament_groups:[],bp_tournament_group_pairs:[],bp_tournament_pairs:[],
      bp_tournament_group_matches:[],bp_tournament_match_results:[]
    };
    const tournament={id:"t1",format:"groups_knockout",rules_version:2026,
      status:"registration_closed",fixture_published_at:"2026-11-13T00:00:00Z",
      groups_published_at:"2026-11-13T00:00:00Z"};
    const report={published:true,placements:null,matches:[
      {id:"ko1",stage:1,slot:1,source1:"1° A",source2:"2° B",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"},
      {id:"ko2",stage:1,slot:2,source1:"2° A",source2:"1° B",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"},
      {id:"ko3",stage:2,slot:1,source1:"W:1:1",source2:"W:1:2",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"}
    ]};
    const wrapper=(value)=>{
      const query={select(){return query},eq(){return query},order(){return query},
        maybeSingle(){return Promise.resolve({data:value,error:null})},
        then(yes,no){return Promise.resolve({data:value,error:null}).then(yes,no)}};
      return query;
    };
    window.calls=[];
    window.supabaseClient={
      from(table){return wrapper(table==="bp_tournaments"?tournament:rows[table]||[]);},
      rpc(name,args){
        window.calls.push({name,args});
        return Promise.resolve({data:name==="bp_tournament_bracket_report2026"?report:{},error:null});
      }
    };
    window.confirm=()=>true;
  });
  await page.addScriptTag({path:src("js/torneos-reglamento-2026.js")});
  await page.addScriptTag({path:src("js/admin-torneos2026.js")});
  await page.waitForSelector("#bp26-admin:not([hidden])");
  assert.equal(await page.getByText("Programar",{exact:true}).count(),3);
  await page.getByText("Programar",{exact:true}).first().click();
  await page.locator("#bp26-schedule-day").fill("2027-04-01");
  await page.locator("#bp26-schedule-time").selectOption("19:00");
  await page.locator("#bp26-schedule-save").click();
  await page.waitForFunction(()=>window.calls.some(x=>x.name==='bp_tournament_schedule_bracket_match2026'));
  const call=await page.evaluate(()=>window.calls.find(x=>x.name==='bp_tournament_schedule_bracket_match2026'));
  assert.equal(call.name,"bp_tournament_schedule_bracket_match2026");
  assert.equal(call.args.p_match_id,"ko1");
  assert.equal(call.args.p_duration_minutes,90);
  await page.close();
});


test("Admin 2026: dos tablas legibles y tarjetas compactas en escritorio y móvil",async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="admin-torneos" style="max-width:1400px;width:calc(100% - 24px);margin:auto"><select id="torneos-pairs-tournament"><option value="t1" selected>Prueba 6 parejas</option></select><section class="torneos-panel" id="bp-results-panel"></section></main></body></html>');
  for(const css of ["css/admin.css","css/admin-torneos.css","css/admin-contraste.css","css/admin-torneos2026.css"])
    await page.addStyleTag({path:src(css)});
  await page.evaluate(()=>{
    const pairs=Array.from({length:6},(_,i)=>({
      id:"p"+(i+1),player1_name:"Jugador muy largo "+(i+1),
      player2_name:"Apellido y Compañero "+(i+1)
    }));
    const groups=[{id:"g1",group_number:1},{id:"g2",group_number:2}];
    const assignments=pairs.map((p,i)=>({group_id:i<3?"g1":"g2",pair_id:p.id,created_at:"2026-01-01"}));
    const matches=Array.from({length:6},(_,i)=>({id:"m"+i,group_id:i<3?"g1":"g2"}));
    const rows={
      bp_tournament_groups:groups,bp_tournament_group_pairs:assignments,
      bp_tournament_pairs:pairs,bp_tournament_group_matches:matches,
      bp_tournament_match_results:[]
    };
    const tournament={id:"t1",format:"groups_knockout",rules_version:2026,
      status:"registration_closed",fixture_published_at:"2026-11-13T00:00:00Z",
      groups_published_at:"2026-11-13T00:00:00Z"};
    const report={published:true,placements:null,matches:[
      {id:"ko1",stage:1,slot:1,source1:"1° A",source2:"2° B",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"},
      {id:"ko2",stage:1,slot:2,source1:"2° A",source2:"1° B",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"},
      {id:"ko3",stage:2,slot:1,source1:"W:1:1",source2:"W:1:2",
       pair1_name:null,pair2_name:null,pair1_id:null,pair2_id:null,status:"pending",schedule_status:"unscheduled"}
    ]};
    window.supabaseClient={
      from(table){
        const value=table==="bp_tournaments"?tournament:rows[table]||[];
        const query={select(){return query},eq(){return query},order(){return query},
          maybeSingle(){return Promise.resolve({data:value,error:null})},
          then(ok,bad){return Promise.resolve({data:value,error:null}).then(ok,bad)}};
        return query;
      },
      rpc(name){return Promise.resolve({data:name==="bp_tournament_bracket_report2026"?report:{},error:null});}
    };
  });
  await page.addScriptTag({path:src("js/torneos-reglamento-2026.js")});
  await page.addScriptTag({path:src("js/admin-torneos2026.js")});
  await page.waitForSelector("#bp26-admin .bp26-admin__group");
  await page.waitForFunction(()=>document.querySelectorAll("#bp26-admin .bp26-admin__match").length===3);
  const desktop=await page.evaluate(()=>{
    const groups=[...document.querySelectorAll("#bp26-admin .bp26-admin__group")];
    const cards=[...document.querySelectorAll("#bp26-admin .bp26-admin__match")];
    const bg=getComputedStyle(cards[0]).backgroundColor;
    const text=getComputedStyle(cards[0].querySelector("div")).color;
    return {groupWidths:groups.map(x=>x.getBoundingClientRect().width),
      cardHeights:cards.map(x=>x.getBoundingClientRect().height),bg,text,
      tableOverflow:groups.map(x=>x.querySelector(".bp26-admin__table-scroll").scrollWidth-
       x.querySelector(".bp26-admin__table-scroll").clientWidth),
      buttonBottomDelta:cards.map(card=>{
        const program=card.querySelector(".bp26-admin__schedule button").getBoundingClientRect();
        const result=card.querySelector(":scope > button.torneos-outline").getBoundingClientRect();
        return Math.abs(program.bottom-result.bottom);
      })};
  });
  assert.equal(desktop.groupWidths.length,2);
  assert.ok(desktop.groupWidths.every(x=>x>500),JSON.stringify(desktop));
  assert.ok(desktop.cardHeights.every(x=>x<125),JSON.stringify(desktop));
  assert.ok(desktop.buttonBottomDelta.every(x=>x<1),JSON.stringify(desktop));
  assert.match(desktop.bg,/rgb\(247,\s*250,\s*246\)/);
  assert.match(desktop.text,/rgb\(3[0-9],\s*6[0-9],\s*4[0-9]\)/);
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll("#bp26-admin .bp26-admin__match")];
    const tables=[...document.querySelectorAll("#bp26-admin .bp26-admin__table-scroll")];
    return {viewport:document.documentElement.clientWidth,
      pageWidth:document.documentElement.scrollWidth,
      groupCount:tables.length,
      scrollable:tables.every(x=>x.scrollWidth>x.clientWidth),
      cardWidths:cards.map(x=>x.getBoundingClientRect().width)};
  });
  assert.equal(mobile.groupCount,2);
  assert.ok(mobile.scrollable,JSON.stringify(mobile));
  assert.ok(mobile.cardWidths.every(x=>x<390),JSON.stringify(mobile));
  assert.ok(mobile.pageWidth<=mobile.viewport+2,JSON.stringify(mobile));
  await page.close();
});
