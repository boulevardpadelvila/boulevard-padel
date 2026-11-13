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
