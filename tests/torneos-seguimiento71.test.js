/* Boulevard Pádel · SQL 71 · Validación de lectura pública y pantalla */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname,"..");
const read = (p) => fs.readFileSync(path.join(root,p),"utf8");
const sql = read("sql/SQL_71_SEGUIMIENTO_PUBLICO_TORNEOS.sql");
const js = read("js/torneos-public.js");
const css = read("css/torneos-public.css");

test("SQL 71: solo lectura y solo torneos publicados", () => {
  assert.match(sql,/CREATE OR REPLACE FUNCTION public\.bp_public_tournament_followup/);
  assert.match(sql,/WHERE t\.id = p_tournament_id/);
  assert.match(sql,/t\.is_published IS TRUE/);
  assert.match(sql,/v_t\.groups_published_at IS NULL OR v_t\.fixture_published_at IS NULL/);
  assert.match(sql,/RETURN NULL/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.bp_public_tournament_followup\(uuid\)/);
  assert.doesNotMatch(sql,/^\s*(?:DELETE\s+FROM|UPDATE\s+public\.|INSERT\s+INTO|TRUNCATE)\b/im);
  assert.doesNotMatch(sql,/['\"](?:contact_phone|created_by|updated_by)['\"]\s*,/i);
});

test("No se concede SELECT público a tablas privadas del torneo", () => {
  assert.doesNotMatch(sql,/GRANT\s+SELECT\s+ON\s+(?:public\.)?bp_tournament_(?:pairs|match_results|knockout_results)/i);
  assert.match(sql,/SECURITY DEFINER/);
  assert.match(sql,/SET search_path TO ''/);
  assert.match(sql,/p\.status = 'approved'/);
  assert.match(js,/bp_public_tournament_followup/);
});

test("El seguimiento es responsive y conserva las tarjetas actuales", () => {
  assert.match(css,/public-tournament-standings-group/);
  assert.match(css,/public-tournament-ko-stage/);
  assert.match(css,/public-tournament-fixture__score/);
  assert.match(css,/@media \(max-width: 480px\)/);
  assert.match(js,/publishedGroupsBlock\(t\)/);
  assert.match(js,/publishedFixtureBlock\(t\)/);
  assert.match(js,/registrationOpen\(t\)/);
  assert.doesNotMatch(js,/Los resultados aparecerán aquí cuando la organización los registre/);
});

class Element {
  constructor(tag="div") {
    this.tag=tag; this.children=[];this.textContent="";this.className="";
    this.dataset={};this.attributes={};this.style={};
    this.classList={toggle(){}};
  }
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(event,callback){this.handlers ||= {};this.handlers[event]=callback;}
  setAttribute(k,v){this.attributes[k]=v;}
  focus(){}
  showModal(){}
  close(){}
  reset(){}
  querySelector(){return null;}
  querySelectorAll(){return [];}
}
const collect=(el) => (el.textContent||"")+(el.children||[]).map(collect).join(" ");
function buildReport(){
  const p=(id)=>({id,player1_name:"Jugador "+id,player2_name:"Compañero "+id});
  const a=p("a"),b=p("b"),c=p("c");
  const results=[
    ["a","b",1,1,"a",[[6,4],[6,4]]],
    ["a","c",2,1,"a",[[6,3],[6,3]]],
    ["b","c",3,1,"b",[[6,2],[6,2]]],
  ].map(([p1,p2,round,number,winner,sets],i)=>({
    id:"m"+i,group_id:"g1",round_number:round,match_number:number,
    pair1_id:p1,pair2_id:p2,resolved_pair1_id:p1,resolved_pair2_id:p2,
    winner_pair_id:winner,sets,sets_pair1:2,sets_pair2:0,
    match_status:"played",schedule_status:"scheduled",scheduled_at:[
      "2027-03-05T21:00:00Z", "2027-03-06T21:00:00Z", "2027-03-07T21:00:00Z"
    ][i]
  }));
  return {
    tournament_id:"torneo-test",
    groups:[{id:"g1",number:1,pairs:[a,b,c]}],
    group_matches:results,
    knockout:{
      direct_semifinal_pair_id:"a",
      quarterfinals:[["a","b"],["b","c"],["a","c"]],
      matches:[
        {stage:"quarterfinal",slot:1,match_status:"played",sets:[[6,4],[6,4]],resolved_pair1_id:"a",resolved_pair2_id:"b",winner_pair_id:"a"},
        {stage:"semifinal",slot:1,match_status:"played",sets:[[6,2],[6,3]],resolved_pair1_id:"a",resolved_pair2_id:"c",winner_pair_id:"a"},
        {stage:"final",slot:1,match_status:"played",sets:[[7,5],[6,4]],resolved_pair1_id:"a",resolved_pair2_id:"b",winner_pair_id:"a"}
      ]
    }
  };
}
test("La interfaz dibuja tabla real, resultados, campeón y subcampeón sin escribir",async()=>{
  const elements=new Map();
  const get=(id)=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const currentTab=new Element("button");
  currentTab.id="public-tournaments-current-tab";
  currentTab.dataset.tournamentTab="current";
  const finishedTab=new Element("button");
  finishedTab.id="public-tournaments-finished-tab";
  finishedTab.dataset.tournamentTab="finished";
  const doc={
    getElementById:get,
    createElement(tag){return new Element(tag);},
    createElementNS(namespace,tag){return new Element(tag);},
    createTextNode(text){const n=new Element("#text");n.textContent=String(text);return n;},
    querySelectorAll(selector){return selector==="[data-tournament-tab]"?[currentTab,finishedTab]:[];}
  };
  const report=buildReport();
  const tournament={
    id:"torneo-test",name:"Copa de prueba",format:"groups_knockout",status:"completed",
    starts_on:"2027-03-05",ends_on:"2027-03-09",
    bp_tournament_categories:{name:"Suma 14"}
  };
  const groups=[{tournament_id:"torneo-test",group_number:1,player1_name:"Jugador a",player2_name:"Compañero a"}];
  const fixtures=[{tournament_id:"torneo-test",group_number:1,round_number:1,match_number:1,
    pair1_player1_name:"Jugador a",pair1_player2_name:"Compañero a",
    pair2_player1_name:"Jugador b",pair2_player2_name:"Compañero b",
    schedule_status:"scheduled",scheduled_at:"2027-03-05T21:00:00Z"}];
  const calls=[];
  const db={
    from(table){
      calls.push("from:"+table);
      return {select(){return this;},eq(){return this;},order(){return this;},
        in(){return this;},limit(){return Promise.resolve({data:[tournament],error:null});},
        range(){return Promise.resolve({data:table==="bp_public_tournament_groups"?groups:fixtures,error:null});}};
    },
    rpc(name,args){
      calls.push("rpc:"+name);
      assert.equal(name,"bp_public_tournament_followup");
      assert.equal(args.p_tournament_id,tournament.id);
      return Promise.resolve({data:report,error:null});
    }
  };
  const context={document:doc,window:{},supabaseClient:db,Intl,Date,Map,Number,
    console:{error(){},log(){}}, setTimeout,clearTimeout};
  vm.runInNewContext(js,context,{filename:"torneos-public.js"});
  await new Promise((resolve)=>setTimeout(resolve,20));
  assert.ok(calls.includes("rpc:bp_public_tournament_followup"));
  assert.match(collect(get("public-tournaments-list")),/Por ahora no hay competencias vigentes ni próximas/);
  assert.equal(get("public-finished-count").textContent,"1");
  finishedTab.handlers.click();
  const screen=collect(get("public-tournaments-list"));
  assert.match(screen,/Copa de prueba/);
  assert.match(screen,/Resultados de la fase de grupos/);
  assert.match(screen,/Tablas de posiciones por grupo/);
  assert.match(screen,/Grupo A/);
  assert.match(screen,/7-5 · 6-4/);
  assert.match(screen,/Cuartos de final/);
  assert.match(screen,/Semifinales/);
  assert.match(screen,/Campeones/);
  assert.match(screen,/Subcampeones/);
  assert.match(screen,/Jugador a/);
  assert.match(screen,/Jugador b/);
  assert.ok(screen.indexOf("Cuartos de final") < screen.indexOf("Semifinales"));
  assert.ok(screen.indexOf("Semifinales") < screen.indexOf("Final · Partido 1"));
  assert.ok(screen.indexOf("Final · Partido 1") < screen.indexOf("Campeones"));
  assert.equal((screen.match(/Campeones/g)||[]).length,1);
  assert.equal((screen.match(/Subcampeones/g)||[]).length,1);
  // Cada selector despliega solamente los datos de su propia sección.
  const card=get("public-tournaments-list").children[0];
  const openers=card.children.filter((el)=>el.tag==="details");
  const group= openers.find((el)=>el.className==="public-tournament-more");
  const knockout= openers.find((el)=>el.className.includes("public-tournament-knockout"));
  assert.ok(group && knockout);
  assert.equal(group.children[0].textContent,"Seguimiento · Resultados, posiciones");
  assert.equal(knockout.children[0].textContent,"Eliminatorias");
  assert.match(collect(group),/Resultados de la fase de grupos/);
  assert.match(collect(group),/Tablas de posiciones/);
  // Nueva presentación: grupos dentro de una grilla, no tablas sueltas.
  const seek=(el, cls)=>[
    ...(el.className?.split(" ").includes(cls)?[el]:[]),
    ...(el.children||[]).flatMap((child)=>seek(child,cls))
  ];
  const dayColumns=seek(group,"public-tournament-day");
  assert.equal(dayColumns.length,3);
  assert.deepEqual(dayColumns.map((col)=>col.children[0].textContent),
    ["05/03/2027","06/03/2027","07/03/2027"]);
  assert.ok(dayColumns.every((col)=>col.children[1].className==="public-tournament-results"));
  assert.ok(dayColumns.every((col)=>col.children[1].children.length===1));
  assert.ok(dayColumns.every((col)=>collect(col).includes("18:00")));
  const tableGrids=seek(group,"public-tournament-standings-grid");
  assert.equal(tableGrids.length,1);
  assert.equal(tableGrids[0].children.length,1); // Un grupo en el ejemplo
  assert.match(tableGrids[0].children[0].className,/public-tournament-standings-group/);
  const tables=seek(tableGrids[0],"public-tournament-table");
  assert.equal(tables.length,1);
  assert.equal(tables[0].children[0].tag,"caption");
  assert.equal(tables[0].children[2].children.length,3); // Tres parejas
  assert.doesNotMatch(collect(group),/Cuartos de final/);
  assert.match(collect(knockout),/Cuartos de final/);
  assert.match(collect(knockout),/Semifinales/);
  assert.match(collect(knockout),/Campeones/);
  assert.doesNotMatch(collect(knockout),/Resultados de la fase de grupos/);
  const search=(el, predicate)=>[
    ...(predicate(el)?[el]:[]),
    ...(el.children||[]).flatMap((child)=>search(child,predicate))
  ];
  const podium=search(knockout,(el)=>el.className==="public-tournament-highlight");
  assert.equal(podium.length,1);
  assert.equal(podium[0].children.length,2);
  const [gold,silver]=podium[0].children;
  assert.match(gold.className,/item--gold/);
  assert.match(silver.className,/item--silver/);
  assert.equal(gold.children[0].tag,"svg");
  assert.equal(silver.children[0].tag,"svg");
  assert.match(gold.children[0].attributes.class,/trophy--gold/);
  assert.match(silver.children[0].attributes.class,/trophy--silver/);
  assert.equal(gold.children[0].attributes["aria-hidden"],"true");
  assert.ok(!calls.some((c)=>/(?:insert|update|delete)/i.test(c)));
});

test("Parche 72/75: resultados compactos por fecha, eliminatorias intactas y podio al cierre",()=>{
  assert.match(js,/const matchesSection = make\("section","public-tournament-data public-tournament-group-results"\)/);
  assert.match(css,/\.public-tournament-group-results \{/);
  assert.match(css,/container-type:\s*inline-size/);
  assert.match(css,/public-tournament-days--2/);
  assert.match(css,/public-tournament-day__title/);
  assert.match(css,/grid-template-columns:\\s*repeat\\(3, minmax\\(0, 1fr\\)\\)/);
  assert.match(css,/\.public-tournament-ko-stage \.public-tournament-results\s*\{\s*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/);
  assert.match(js,/knockout\.append\(podium\)/);
  assert.doesNotMatch(js,/knockout\.prepend\(podium\)/);
  assert.doesNotMatch(js,/public-tournament-card__winner/);
});


test("Parche 73: podio a dos columnas con oro y plata, y sin cambios en las tarjetas de eliminatorias",()=>{
  assert.match(js,/function knockoutBlock\(t\)/);
  assert.match(js,/const summary = make\("summary", "public-tournament-more__summary", "Eliminatorias"\)/);
  assert.match(js,/card\.append\(detailBlock\(t\)\)/);
  assert.match(js,/if \(eliminatorias\) card\.append\(eliminatorias\)/);
  assert.match(css,/\.public-tournament-knockout \.public-tournament-highlight\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css,/public-tournament-highlight__item--gold/);
  assert.match(css,/public-tournament-highlight__item--silver/);
  assert.match(css,/\.public-tournament-knockout \.public-tournament-highlight__trophy--gold/);
  assert.match(css,/\.public-tournament-knockout \.public-tournament-highlight__trophy--silver/);
  assert.match(css,/@media \(max-width: 480px\)/);
  assert.match(css,/\.public-tournament-ko-stage \.public-tournament-results\s*\{\s*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/);
});

test("Parche 74: tablas con estilo Admin, alineación consistente y autoajuste en 1/2 columnas",()=>{
  assert.match(js,/const standings = make\("section","public-tournament-data public-tournament-standings"\)/);
  assert.match(js,/const standingsGrid = make\("div","public-tournament-standings-grid"\)/);
  assert.match(js,/standingsGrid\.append\(wrap\)/);
  assert.match(js,/standings\.append\(standingsGrid\)/);
  assert.match(css,/\.public-tournament-standings-grid\s*\{[^}]*display:\s*grid/);
  assert.match(css,/grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 550px\), 1fr\)\)/);
  assert.match(css,/\.public-tournament-standings-grid \.public-tournament-table\s*\{[^}]*min-width:\s*525px;[^}]*table-layout:\s*fixed/s);
  assert.match(css,/\.public-tournament-standings-grid \.public-tournament-table th:nth-child\(2\)/);
  assert.match(css,/\.public-tournament-standings-grid \.public-tournament-table td:nth-child\(2\)/);
  assert.match(css,/\.public-tournament-standings-grid \.public-tournament-table th,[\s\S]*?text-align:\s*center/);
  assert.match(css,/@container \(min-width: 1120px\)/);
  assert.match(css,/last-child:nth-child\(odd\)/);
  assert.match(css,/overflow-x:\s*auto/);
  // No hay alteraciones de las tarjetas ya aprobadas ni del podio.
  assert.match(css,/\.public-tournament-ko-stage \.public-tournament-results\s*\{\s*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/);
  assert.match(js,/knockout\.append\(podium\)/);
});

test("Parche 75: agrupar por fecha local de Argentina incluso al cruzar medianoche UTC",()=>{
  const start=js.indexOf("  function tournamentMatchDay(iso) {");
  const end=js.indexOf("  function publicScore(sets)", start);
  assert.ok(start>0 && end>start);
  const helper=js.slice(start,end);
  const parseDay=new Function("Intl","Date",
    'const tournamentTZ="America/Argentina/Cordoba"; '+helper+
    'return tournamentMatchDay;')(Intl,Date);
  assert.deepEqual(parseDay("2027-03-06T01:00:00Z"),{
    key:"2027-03-05",label:"05/03/2027",time:"22:00"
  });
  assert.equal(parseDay(null),null);
  assert.equal(parseDay("fecha-no-valida"),null);
  assert.match(js,/byDay\.get\(key\)\.matches\.push/);
  assert.match(js,/dates = \[\.\.\.byDay\.values\(\)\]\.sort/);
  assert.match(js,/day\.matches\.sort/);
  assert.match(js,/appendResults\(column/);
  assert.match(css,/\.public-tournament-group-results \.public-tournament-days\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css,/@container \(max-width: 810px\)/);
  assert.match(css,/@container \(max-width: 530px\)/);
  assert.match(css,/public-tournament-days--1/);
  assert.match(css,/public-tournament-days--2/);
  // Las tablas de posiciones y las eliminatorias siguen presentes sin cambios.
  assert.match(js,/const standingsGrid = make\("div","public-tournament-standings-grid"\)/);
  assert.match(js,/function knockoutBlock\(t\)/);
});
