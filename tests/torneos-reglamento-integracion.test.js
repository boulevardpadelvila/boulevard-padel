const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
test("simulador 6-40 usa motor compartido y no contiene llaves duplicadas",()=>{
 const html=read("admin/simulador-llaves.html");
 assert.match(html,/src="\.\.\/js\/torneos-reglamento-2026\.js"/);
 assert.match(html,/BPReglamento2026\.groupPlan\(n\)/);
 assert.match(html,/BPReglamento2026\.bracket\(plan\.n\)/);
 assert.doesNotMatch(html,/const special =/);
 assert.doesNotMatch(html,/function genericBracket\(/);
 assert.doesNotMatch(html,/supabaseClient|\.rpc\(/);
});
test("motor deportivo aislado de turnero y datos privados",()=>{
 const src=read("js/torneos-reglamento-2026.js");
 assert.doesNotMatch(src,/supabaseClient|fetch\(|reservations|fixed_turn_requests|blockouts|\.rpc\(/);
 assert.match(src,/winner\.points\+=2/);
 assert.match(src,/b\.gameDifference-a\.gameDifference/);
 assert.match(src,/const mode=stage==="groups"\?"super_tb":"three_sets"/);
});
