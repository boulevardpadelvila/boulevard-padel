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
    const numberCells=[...document.querySelectorAll("#bp26-admin .bp26-admin__table tr")]
      .flatMap(tr=>[0,2,3,4].map(i=>tr.children[i]).filter(Boolean));
    const names=[...document.querySelectorAll("#bp26-admin .bp26-admin__table tr")]
      .map(tr=>tr.children[1]).filter(Boolean);
    return {numberAligns:numberCells.map(x=>getComputedStyle(x).textAlign),
      namesAlign:names.map(x=>getComputedStyle(x).textAlign),
      groupWidths:groups.map(x=>x.getBoundingClientRect().width),
      cardHeights:cards.map(x=>x.getBoundingClientRect().height),bg,text,
      tableOverflow:groups.map(x=>x.querySelector(".bp26-admin__table-scroll").scrollWidth-
       x.querySelector(".bp26-admin__table-scroll").clientWidth),
      buttonBottomDelta:cards.map(card=>{
        const program=card.querySelector(".bp26-admin__schedule button").getBoundingClientRect();
        const result=card.querySelector(".bp26-admin__actions > button.torneos-outline").getBoundingClientRect();
        return Math.abs(program.bottom-result.bottom);
      })};
  });
  assert.ok(desktop.numberAligns.length>0 && desktop.numberAligns.every(x=>x==="right"),JSON.stringify(desktop));
  assert.ok(desktop.namesAlign.every(x=>x==="left"||x==="start"),JSON.stringify(desktop));
  const threeColumns=await page.locator("#bp26-admin .bp26-admin__matches").first()
    .evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\\s+/).length);
  assert.equal(threeColumns,3,"En la prueba con semifinales hay dos tarjetas, pero la grilla conserva tres columnas");
  assert.equal(desktop.groupWidths.length,2);
  assert.ok(desktop.groupWidths.every(x=>x>500),JSON.stringify(desktop));
  assert.ok(desktop.cardHeights.every(x=>x>=180&&x<320),JSON.stringify(desktop));
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


test("Admin 2026: modal de posiciones permite cancelar y confirmar sin diálogo nativo",async()=>{
  const page=await browser.newPage({viewport:{width:1360,height:900}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="admin-torneos"><select id="torneos-pairs-tournament"><option value="t1" selected>Campeonato de prueba</option></select><section id="bp-results-panel"></section></main></body></html>');
  for(const css of ["css/admin.css","css/admin-torneos.css","css/admin-torneos2026.css"])
    await page.addStyleTag({path:src(css)});
  await page.evaluate(()=>{
    window.rpcCalls=[];
    window.confirm=()=>{throw Error("No corresponde abrir confirm() nativo");};
    const tournament={id:"t1",format:"groups_knockout",rules_version:2026,status:"registration_closed",
      fixture_published_at:"2026-11-13T00:00:00Z",groups_published_at:"2026-11-13T00:00:00Z"};
    const groups=[{id:"g1",group_number:1},{id:"g2",group_number:2}];
    const pairs=Array.from({length:6},(_,i)=>({id:"p"+(i+1),
      player1_name:"Jugador "+(i+1),player2_name:"Compañero "+(i+1)}));
    const assignments=pairs.map((p,i)=>({group_id:i<3?"g1":"g2",pair_id:p.id}));
    const matches=[],results=[];
    for(let g=0;g<2;g++){
      const ids=pairs.slice(g*3,g*3+3).map(p=>p.id);
      for(const [j,[i,k]] of [[0,1],[1,2],[0,2]].entries()){
        const id="m"+g+"-"+j;
        matches.push({id,group_id:groups[g].id});
        results.push({match_id:id,resolved_pair1_id:ids[i],
          resolved_pair2_id:ids[k],sets:[[6,3],[6,4]]});
      }
    }
    const rows={bp_tournament_groups:groups,bp_tournament_group_pairs:assignments,
      bp_tournament_pairs:pairs,bp_tournament_group_matches:matches,
      bp_tournament_match_results:results};
    window.supabaseClient={
      from(table){
        const value=table==="bp_tournaments"?tournament:rows[table]||[];
        const query={select(){return query},eq(){return query},order(){return query},
          maybeSingle(){return Promise.resolve({data:value,error:null})},
          then(ok,bad){return Promise.resolve({data:value,error:null}).then(ok,bad)}};
        return query;
      },
      rpc(name,args){
        window.rpcCalls.push({name,args});
        return Promise.resolve({data:name==="bp_tournament_bracket_report2026"?
          {published:true,placements:null,matches:[]}:{},error:null});
      }
    };
  });
  await page.addScriptTag({path:src("js/torneos-reglamento-2026.js")});
  await page.addScriptTag({path:src("js/admin-torneos2026.js")});
  const opener=page.getByRole("button",{name:"Confirmar posiciones oficiales"});
  await opener.waitFor();
  await opener.click();
  const dialog=page.locator("#bp26-placements-dialog");
  assert.ok(await dialog.evaluate(el=>el.open));
  assert.equal(await dialog.locator(".bp26-placements-dialog__zone").count(),2);
  assert.equal(await dialog.locator("li").count(),6);
  assert.match(await dialog.textContent(),/Sí, confirmar posiciones/);
  await dialog.getByRole("button",{name:"Cancelar"}).click();
  assert.ok(!(await dialog.evaluate(el=>el.open)));
  assert.equal(await page.evaluate(()=>window.rpcCalls.filter(x=>x.name==="bp_tournament_confirm_placements2026").length),0);
  await opener.click();
  await page.setViewportSize({width:390,height:844});
  const bounds=await dialog.evaluate(el=>({
    max:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth,
    width:el.getBoundingClientRect().width,
    cols:getComputedStyle(el.querySelector(".bp26-placements-dialog__review")).gridTemplateColumns
  }));
  assert.ok(bounds.width<=bounds.max && bounds.scroll<=bounds.max+2,JSON.stringify(bounds));
  await dialog.getByRole("button",{name:"Sí, confirmar posiciones"}).click();
  await page.waitForFunction(()=>window.rpcCalls.some(x=>x.name==="bp_tournament_confirm_placements2026"));
  const sent=await page.evaluate(()=>window.rpcCalls.find(x=>x.name==="bp_tournament_confirm_placements2026"));
  assert.equal(sent.args.p_tournament_id,"t1");
  assert.deepEqual(sent.args.p_placements.A,["p1","p2","p3"]);
  assert.deepEqual(sent.args.p_placements.B,["p4","p5","p6"]);
  assert.ok(!(await dialog.evaluate(el=>el.open)));
  await page.close();
});


test("Admin 2026: eliminatorias grandes 3/2/1 columnas sin perder controles",async()=>{
  const page=await browser.newPage({viewport:{width:1500,height:960}});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main class="admin-torneos" style="width:calc(100% - 24px);max-width:1470px;margin:auto"><select id="torneos-pairs-tournament"><option value="t1" selected>Llave grande</option></select><section id="bp-results-panel"></section></main></body></html>');
  for(const name of ["css/admin.css","css/admin-torneos.css","css/admin-contraste.css","css/admin-torneos2026.css"])
    await page.addStyleTag({path:src(name)});
  await page.evaluate(()=>{
    const tr={id:"t1",format:"groups_knockout",rules_version:2026,
      fixture_published_at:"2026-11-13T00:00:00Z",groups_published_at:"2026-11-13T00:00:00Z"};
    const rounds=[16,8,4,2,1];
    const matches=rounds.flatMap((count,i)=>Array.from({length:count},(_,j)=>({
      id:"ko"+i+"-"+j,stage:i+1,slot:j+1,
      source1:"1° A",source2:"2° B",
      pair1_id:null,pair2_id:null,
      pair1_name:"Jugadores de nombre largo "+j+" y Apellido",
      pair2_name:"Otros jugadores de nombre extenso "+j+" y Otro",
      status:"pending",sets:null,
      schedule_status:j===0&&i===0?"scheduled":j===1&&i===0?"postponed":"unscheduled",
      scheduled_at:j===0&&i===0?"2027-04-02T22:00:00Z":null
    })));
    const report={published:true,placements:null,matches};
    window.supabaseClient={
      from(table){
        const value=table==="bp_tournaments"?tr:[];
        const q={select(){return q},eq(){return q},order(){return q},
          maybeSingle(){return Promise.resolve({data:value,error:null})},
          then(ok,bad){return Promise.resolve({data:value,error:null}).then(ok,bad)}};
        return q;
      },
      rpc(name){return Promise.resolve({data:name==="bp_tournament_bracket_report2026"?report:{},error:null});}
    };
  });
  await page.addScriptTag({path:src("js/torneos-reglamento-2026.js")});
  await page.addScriptTag({path:src("js/admin-torneos2026.js")});
  await page.waitForFunction(()=>document.querySelectorAll("#bp26-admin .bp26-admin__match").length===31);
  const measure=()=>page.evaluate(()=>{
    const grids=[...document.querySelectorAll("#bp26-admin .bp26-admin__matches")];
    const first=grids[0];
    const cards=[...first.querySelectorAll(".bp26-admin__match")];
    const firstThree=cards.slice(0,3).map(x=>x.getBoundingClientRect());
    const footers=cards.map(card=>card.querySelector(".bp26-admin__actions"));
    return {
      columns:getComputedStyle(first).gridTemplateColumns.trim().split(/\\s+/).length,
      rounds:grids.length,
      total:document.querySelectorAll("#bp26-admin .bp26-admin__match").length,
      width:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth,
      firstThreeRows:firstThree.map(x=>Math.round(x.top)),
      actions:footers.every(x=>x&&getComputedStyle(x).display==="grid"),
      scheduledButtons:cards[0].querySelectorAll(".bp26-admin__schedule button").length,
      postergado:cards[1].textContent.includes("Partido postergado"),
      firstButtonDelta:Math.abs(
        cards[2].querySelector(".bp26-admin__schedule button").getBoundingClientRect().bottom-
        cards[2].querySelector(".bp26-admin__actions > button").getBoundingClientRect().bottom)
    };
  });
  const desktop=await measure();
  assert.equal(desktop.rounds,5,JSON.stringify(desktop));
  assert.equal(desktop.total,31,JSON.stringify(desktop));
  assert.equal(desktop.columns,3,JSON.stringify(desktop));
  assert.equal(new Set(desktop.firstThreeRows).size,1,JSON.stringify(desktop));
  assert.equal(desktop.scheduledButtons,2,JSON.stringify(desktop));
  assert.ok(desktop.postergado&&desktop.actions,JSON.stringify(desktop));
  assert.ok(desktop.firstButtonDelta<1,JSON.stringify(desktop));
  assert.ok(desktop.width<=desktop.viewport+2,JSON.stringify(desktop));
  await page.setViewportSize({width:1010,height:960});
  const tablet=await measure();
  assert.equal(tablet.columns,2,JSON.stringify(tablet));
  assert.ok(tablet.width<=tablet.viewport+2,JSON.stringify(tablet));
  await page.setViewportSize({width:390,height:844});
  const mobile=await measure();
  assert.equal(mobile.columns,1,JSON.stringify(mobile));
  assert.ok(mobile.width<=mobile.viewport+2,JSON.stringify(mobile));
  await page.close();
});
