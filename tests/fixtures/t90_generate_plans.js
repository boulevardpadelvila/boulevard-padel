/* Genera 35 planes reales del motor para probar la migración en PG aislado. */
const bp=require('../../js/torneos-reglamento-2026.js');
console.log('CREATE TABLE public._t90_plans(n integer primary key,plan jsonb not null);');
for(let n=6;n<=40;n++){
 const model=bp.bracket(n);
 const plan={pairs:n,qualified:model.qualified,preliminariesMatches:model.preliminariesMatches,firstRoundMatches:model.firstRoundMatches};
 console.log(`INSERT INTO public._t90_plans VALUES (${n},'${JSON.stringify(plan).replace(/'/g,"''")}'::jsonb);`);
}