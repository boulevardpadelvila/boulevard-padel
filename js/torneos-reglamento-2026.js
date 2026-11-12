/* Boulevard Pádel · Reglamento aprobado 12/11/2026 · Motor puro, sin Supabase */
(function (root,factory){'use strict';const engine=factory();if(typeof module==='object'&&module.exports)module.exports=engine;else root.BPReglamento2026=engine;})(typeof globalThis!=='undefined'?globalThis:this,function reglamento2026(){
"use strict";
const special={
6:{pre:[],opening:[["1° A","2° B"],["2° A","1° B"]]},
7:{pre:[["3° A","2° B"]],opening:[["1° A","P1"],["2° A","1° B"]]},
8:{pre:[["3° A","2° B"],["2° A","3° B"]],opening:[["1° A","P1"],["P2","1° B"]]},
9:{pre:[["2° B","2° C"],["1° C","2° A"]],opening:[["1° A","P1"],["P2","1° B"]]},
10:{pre:[["2° B","2° C"],["1° C","2° A"],["3° A","1° B"]],opening:[["1° A","P1"],["P2","P3"]]},
11:{pre:[],opening:[["1° A","3° B"],["2° B","2° C"],["1° C","2° A"],["3° A","1° B"]]},
12:{pre:[],opening:[["1° A","2° B"],["2° C","1° D"],["1° C","2° D"],["2° A","1° B"]]},
13:{pre:[["3° A","2° B"]],opening:[["1° A","P1"],["2° C","1° D"],["1° C","2° D"],["2° A","1° B"]]},
14:{pre:[["3° A","2° B"],["2° A","3° B"]],opening:[["1° A","P1"],["2° C","1° D"],["1° C","2° D"],["P2","1° B"]]}
};
function groupSizes(n){
 if(!Number.isSafeInteger(n)||n<6||n>40) throw Error("El torneo debe tener de 6 a 40 parejas aprobadas.");
 const g=Math.floor(n/3), f=n%3;
 return Array.from({length:g},(_,i)=>i<f?4:3);
}
function seeds(num){let a=[1,2];while(a.length<num){const lim=a.length*2+1;a=a.flatMap(x=>[x,lim-x]);}return a;}
function groupLetter(index){return String.fromCharCode(65+index);}
function label(rank,idx){return rank+"° "+groupLetter(idx);}
function groupPlan(n){
 const sizes=groupSizes(n), qualifiers=sizes.reduce((v,s)=>v+(s===4?3:2),0),
 base=2**Math.floor(Math.log2(qualifiers)),preCount=qualifiers-base;
 return {pairs:n,sizes,groups:sizes.length,qualifiers,preCount,base,byes:preCount?2*base-qualifiers:0};
}
function participants(p){return p.sizes.flatMap((s,i)=>Array.from({length:s===4?3:2},(_,r)=>({label:label(r+1,i),group:i,rank:r+1})))}
function bracket(n){
 const p=groupPlan(n), entrants=participants(p), templates=special[n];
 let pre, opening;
 if(templates){pre=templates.pre.map(x=>x.slice());opening=templates.opening.map(x=>x.slice());}
 else{
  let order=entrants.slice().sort((a,b)=>a.rank-b.rank||a.group-b.group);
  const direct=order.slice(0,p.preCount?p.byes:p.base), remaining=order.slice(direct.length), pairings=[];
  while(remaining.length){
   const a=remaining.shift(), j=remaining.findIndex(b=>b.group!==a.group);
   const b=remaining.splice(j<0?0:j,1)[0];
   if(!b)throw Error("Ronda previa incompleta");
   pairings.push([a.label,b.label]);
  }
  pre=pairings;
  const cells=direct.map(x=>x.label).concat(pre.map((_,i)=>"P"+(i+1)));
  const sorted=seeds(p.base).map(i=>cells[i-1]);
  opening=Array.from({length:p.base/2},(_,i)=>sorted.slice(2*i,2*i+2));
 }
 const used=pre.flat().concat(opening.flat().filter(x=>!/^P[0-9]+$/.test(x)));
 const required=entrants.map(x=>x.label);
 if(used.length!==required.length||new Set(used).size!==used.length||required.some(x=>!used.includes(x)))throw Error("Llave inválida: clasificados duplicados o faltantes");
 if(pre.length!==p.preCount||opening.length!==p.base/2)throw Error("La llave tiene cantidades incorrectas");
 const passes=opening.flat().filter(x=>required.includes(x));
 if(p.preCount&&passes.length!==p.byes)throw Error("Pases directos incorrectos");
 const winnersOfFour=p.sizes.flatMap((s,i)=>s===4?[label(1,i)]:[]);
 if(winnersOfFour.some(x=>pre.some(pair=>pair.includes(x))))throw Error("Primer puesto de grupo de 4 sin prioridad directa");
 const stage=p.base===4?"semifinal":p.base===8?"quarterfinal":"round_of_16";
 const rounds=[{stage:"preliminary",matches:pre.map((pair,i)=>({code:"P"+(i+1),pair}))},
               {stage,matches:opening.map((pair,i)=>({code:"R1-"+(i+1),pair}))}];
 let size=opening.length,prev="R1-",rnd=1;
 while(size>1){
  rnd++;size/=2;
  const kind=size===1?"final":size===2?"semifinal":size===4?"quarterfinal":size===8?"round_of_16":"round_of_32";
  const matches=Array.from({length:size},(_,i)=>({code:"R"+rnd+"-"+(i+1),pair:["Ganador "+prev+(i*2+1),"Ganador "+prev+(i*2+2)]}));
  rounds.push({stage:kind,matches});prev="R"+rnd+"-";
 }
 return {...p,pre,opening,rounds,direct:passes};
}
function validSet(a,b,stb=false){
 if(![a,b].every(x=>Number.isSafeInteger(x)&&x>=0&&x<=99)||a===b)return false;
 const hi=Math.max(a,b),lo=Math.min(a,b);
 return stb?((hi===10&&lo<=8)||(hi>10&&hi-lo===2)):((hi===6&&lo<=4)||(hi===7&&(lo===5||lo===6)));
}
function score(sets,stage){
 if(!Array.isArray(sets)||![2,3].includes(sets.length))throw Error("Se requieren dos o tres sets");
 let won=[0,0],games=[0,0];
 for(let i=0;i<sets.length;i++){
  const set=sets[i];
  if(!Array.isArray(set)||set.length!==2||won.includes(2)||!validSet(set[0],set[1],i===2&&stage==="group"))throw Error("Set inválido");
  const side=set[0]>set[1]?0:1;won[side]++;
  if(i<2||stage!=="group"){games[0]+=set[0];games[1]+=set[1];}
 }
 if(Math.max(...won)!==2|| (sets.length===3&&Math.min(...won)!==1))throw Error("Partido sin ganador válido");
 return {winner:won[0]===2?0:1,sets:won,games};
}
function standings(ids,matches,manualOrder=null){
 if(!Array.isArray(ids)||![3,4].includes(ids.length)||new Set(ids).size!==ids.length)throw Error("Grupo inválido");
 const data=new Map(ids.map(id=>[id,{pairId:id,played:0,won:0,lost:0,points:0,setsFor:0,setsAgainst:0,setDifference:0,gamesFor:0,gamesAgainst:0,gameDifference:0}]));
 const direct=new Map();let played=0;
 for(const m of matches){
  if(!m.sets)continue;
  const a=data.get(m.pair1),b=data.get(m.pair2);
  if(!a||!b||a===b)throw Error("Rivales del grupo inválidos");
  const r=score(m.sets,"group"),win=r.winner===0?a:b,lose=r.winner===0?b:a;
  a.played++;b.played++;win.won++;win.points+=2;lose.lost++;
  for(let i=0;i<2;i++){
   const row=i?b:a,other=i?a:b;
   row.setsFor+=r.sets[i];row.setsAgainst+=r.sets[1-i];
   row.gamesFor+=r.games[i];row.gamesAgainst+=r.games[1-i];
  }
  direct.set([a.pairId,b.pairId].sort().join("|"),win.pairId);played++;
 }
 const rows=[...data.values()];for(const row of rows){row.setDifference=row.setsFor-row.setsAgainst;row.gameDifference=row.gamesFor-row.gamesAgainst;}
 function compare(a,b){return b.points-a.points||b.setDifference-a.setDifference||b.gameDifference-a.gameDifference;}
 rows.sort(compare);
 let unresolved=[],sorted=[],k=0;
 while(k<rows.length){
  let end=k+1;while(end<rows.length&&compare(rows[k],rows[end])===0)end++;
  let section=rows.slice(k,end);
  if(section.length===2){
   const key=[section[0].pairId,section[1].pairId].sort().join("|"),winner=direct.get(key);
   if(winner)section.sort((a,b)=>(a.pairId===winner?-1:1));
  } else if(section.length>2){
   // Una igualdad entre tres o más no se ordena arbitrariamente por una cadena de duelos.
  }
  const unresolvedGroup=section.length>2||section.length===2&&!direct.has([section[0].pairId,section[1].pairId].sort().join("|"));
  if(unresolvedGroup){
   const proposed=manualOrder&&section.map(x=>x.pairId).every(x=>manualOrder.includes(x));
   if(proposed)section.sort((a,b)=>manualOrder.indexOf(a.pairId)-manualOrder.indexOf(b.pairId));
   else unresolved.push({from:k+1,to:end,pairIds:section.map(x=>x.pairId)});
  }
  sorted.push(...section);k=end;
 }
 return {rows:sorted.map((row,i)=>({...row,rank:i+1,tied:unresolved.some(x=>x.pairIds.includes(row.pairId))})),complete:played===matches.length&&matches.length===(ids.length===3?3:4),unresolved,qualified:unresolved.length?[]:sorted.slice(0,ids.length===3?2:3).map(x=>x.pairId)};
}
return Object.freeze({groupSizes,groupPlan,bracket,score,standings});
});
