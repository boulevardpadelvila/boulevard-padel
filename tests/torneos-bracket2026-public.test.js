const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
globalThis.BPReglamento2026=require("../js/torneos-reglamento-2026.js");
const publicBracket=require("../js/torneos-bracket2026-public.js");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("35 cantidades: todos los cruces aparecen desde el sorteo",()=>{
 for(let n=6;n<=40;n++){
   const {plan,rounds}=publicBracket.rounds(n);
   assert.equal(rounds.reduce((sum,r)=>sum+r.matches.length,0),plan.qualified-1,String(n)+" parejas");
   assert.equal(rounds.at(-1).name,"Final");
   assert.equal(rounds.at(-1).matches.length,1);
   assert.ok(!rounds.some(r=>r.name.includes("Tercer puesto")));
 }
});
test("referencias de preliminares y rondas no exponen datos personales",()=>{
 assert.equal(publicBracket.sourceLabel("1° A"),"1° A");
 assert.equal(publicBracket.sourceLabel("P2"),"Ganador P2");
 assert.equal(publicBracket.sourceLabel("W:2:3"),"Ganador R2-3");
 assert.equal(publicBracket.sourceLabel("W:1:1"),"Ganador R1-1");
 assert.equal(publicBracket.sourceLabel("W:1:2"),"Ganador R1-2");
});
test("sitio público carga scripts en orden y sin afectar reservas",()=>{
 const html=read("index.html");
 assert.ok(html.indexOf('src="js/torneos-reglamento-2026.js"')<html.indexOf('src="js/torneos-bracket2026-public.js"'));
 assert.ok(html.indexOf('src="js/torneos-bracket2026-public.js"')<html.indexOf('src="js/torneos-public.js"'));
 const js=read("js/torneos-public.js");
 assert.match(js,/BPBracket2026Public\?\.render/);
 assert.match(js,/bp_tournament_bracket_report2026/);
 assert.doesNotMatch(read("js/torneos-bracket2026-public.js"),/reservations|blockouts|fixed_turn_requests|contact_phone|service_role/);
});

test("torneos del Reglamento 2026 no duplican el bloque heredado de eliminatorias",()=>{
 const src=read("js/torneos-public.js");
 assert.match(src,/if \(Number\(t\.rules_version\) !== 2026\) \{/);
 assert.match(src,/const publicBracket = window\.BPBracket2026Public\?\.render/);
 const css=read("css/torneos-bracket2026.css");
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.bp26-public__podium/);
});

test("identificadores deportivos por ronda para 6 a 40 parejas",()=>{
 for(let n=6;n<=40;n++){
   const {plan,rounds}=publicBracket.rounds(n);
   const prefix={16:"D",8:"O",4:"C",2:"S",1:"F"};
   for(const round of rounds){
     for(const match of round.matches){
       const code=globalThis.BPReglamento2026.matchCode(plan.base,round.stage,match.slot);
       const count=round.matches.length;
       assert.equal(code,(round.stage===0?"P":prefix[count])+match.slot,`n=${n}, stage=${round.stage}`);
     }
   }
 }
 assert.equal(globalThis.BPReglamento2026.matchCode(16,1,1),"O1");
 assert.equal(globalThis.BPReglamento2026.matchCode(16,2,1),"C1");
 assert.equal(globalThis.BPReglamento2026.matchCode(16,3,1),"S1");
 assert.equal(globalThis.BPReglamento2026.matchCode(16,4,1),"F1");
 assert.equal(globalThis.BPReglamento2026.matchCode(32,1,1),"D1");
 assert.equal(publicBracket.sourceLabel("W:1:1",16),"Ganador O1");
 assert.equal(publicBracket.sourceLabel("W:2:3",16),"Ganador C3");
 assert.equal(publicBracket.sourceLabel("W:1:1",4),"Ganador S1");
});

test("Admin 2026: rivales independientes y ganador validado por ID, sin modificar marcadores",()=>{
 const js=read("js/admin-torneos2026.js");
 const css=read("css/admin-torneos2026.css");
 assert.match(js,/rivals\.append\(el\('span','bp26-admin__pair',first\)/);
 assert.match(js,/el\('span','bp26-admin__vs','vs'\),el\('span','bp26-admin__pair',second\)/);
 assert.match(js,/match\.winner_pair_id===match\.pair1_id\?first:match\.winner_pair_id===match\.pair2_id\?second:null/);
 assert.match(js,/if\(winner\)result\.append\(el\('span','bp26-admin__winner','Ganadores: '\+winner\)\)/);
 assert.match(css,/\.bp26-admin__match>\.bp26-admin__rivals\{[^}]*display:grid;[^}]*justify-items:center/);
 assert.match(css,/\.bp26-admin__winner\{[^}]*text-align:right/);
});

test("Admin: eliminatorias en dos columnas y podio diferenciado oro/plata",()=>{
 const js=read("js/admin-torneos2026.js");
 const css=read("css/admin-torneos2026.css");
 assert.match(css, /\.bp26-admin__matches\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css, /\.bp26-admin__matches>\.bp26-admin__match:only-child\{[^}]*justify-self:center/);
 assert.match(js, /\['gold','Campeones',final\.winner_pair_id\],\['silver','Subcampeones',runner\]/);
 assert.match(js, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
 assert.match(css, /\.bp26-admin__podium\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css, /\.bp26-admin__podium-card--gold \.bp26-admin__podium-name\{font-size:1\.4rem\}/);
});
