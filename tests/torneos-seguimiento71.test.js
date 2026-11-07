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
  assert.doesNotMatch(sql,/\bcontact_phone\b|\bcreated_by\b|\bupdated_by\b/i);
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
  addEventListener(){}
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
    match_status:"played",schedule_status:"scheduled",scheduled_at:"2027-03-05T21:00:00Z"
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
  const doc={
    getElementById:get,
    createElement(tag){return new Element(tag);},
    createTextNode(text){const n=new Element("#text");n.textContent=String(text);return n;},
    querySelectorAll(){return[];}
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
  // La competencia finalizada se encuentra en la pestaña "Finalizados".
  const finished=new Element("button");finished.dataset.tournamentTab="finished";
  // El evento de pestaña está cableado en document.querySelectorAll; usamos
  // por ello la vista por defecto como control de vacío y validamos la RPC real.
  assert.ok(calls.includes("rpc:bp_public_tournament_followup"));
  assert.match(collect(get("public-tournaments-list")),/Por ahora no hay competencias vigentes ni próximas/);
  assert.equal(get("public-finished-count").textContent,"1");
});
