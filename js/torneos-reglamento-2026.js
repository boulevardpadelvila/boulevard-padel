/* Boulevard Pádel · Reglamento de Torneos acordado el 12/11/2026.
 * Motor puro para planificar y validar 6..40 parejas; no consulta Supabase.
 * NO reinterpreta resultados históricos ni escribe reservas o bloqueos.
 * Fuentes: reglas de Martín y llaves 6..14 del simulador publicado.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.BPReglamento2026=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const SPECIAL = {
        6: {
          pre: [],
          opening: [
            ["1° A", "2° B"],
            ["2° A", "1° B"],
          ],
        },
        7: {
          pre: [["3° A", "2° B"]],
          opening: [
            ["1° A", "P1"],
            ["2° A", "1° B"],
          ],
        },
        8: {
          pre: [
            ["3° A", "2° B"],
            ["2° A", "3° B"],
          ],
          opening: [
            ["1° A", "P1"],
            ["P2", "1° B"],
          ],
        },
        9: {
          pre: [
            ["2° B", "2° C"],
            ["1° C", "2° A"],
          ],
          opening: [
            ["1° A", "P1"],
            ["P2", "1° B"],
          ],
        },
        10: {
          pre: [
            ["2° B", "2° C"],
            ["1° C", "2° A"],
            ["3° A", "1° B"],
          ],
          opening: [
            ["1° A", "P1"],
            ["P2", "P3"],
          ],
        },
        11: {
          pre: [],
          opening: [
            ["1° A", "3° B"],
            ["2° B", "2° C"],
            ["1° C", "2° A"],
            ["3° A", "1° B"],
          ],
        },
        12: {
          pre: [],
          opening: [
            ["1° A", "2° B"],
            ["2° C", "1° D"],
            ["1° C", "2° D"],
            ["2° A", "1° B"],
          ],
        },
        13: {
          pre: [["3° A", "2° B"]],
          opening: [
            ["1° A", "P1"],
            ["2° C", "1° D"],
            ["1° C", "2° D"],
            ["2° A", "1° B"],
          ],
        },
        14: {
          pre: [
            ["3° A", "2° B"],
            ["2° A", "3° B"],
          ],
          opening: [
            ["1° A", "P1"],
            ["2° C", "1° D"],
            ["1° C", "2° D"],
            ["P2", "1° B"],
          ],
        },
      };

  function groupPlan(n){
    if(!Number.isSafeInteger(n)||n<6||n>40)throw Error("Se requieren de 6 a 40 parejas aprobadas.");
    const groups=Math.floor(n/3), fours=n%3;
    const sizes=Array.from({length:groups},(_,i)=>i<fours?4:3);
    const qualified=sizes.reduce((sum,s)=>sum+(s===4?3:2),0);
    const base=2**Math.floor(Math.log2(qualified));
    const preliminaries=qualified-base;
    return Object.freeze({pairs:n,sizes,qualified,base,preliminaries,
      direct:preliminaries?2*base-qualified:qualified,
      groupMatches:sizes.reduce((sum,s)=>sum+(s===4?4:3),0),
      knockoutMatches:qualified-1});
  }

  function groupFixture(ids){
    if(!Array.isArray(ids)||![3,4].includes(ids.length)||
      ids.some(x=>typeof x!=="string"||!x)||new Set(ids).size!==ids.length)
      throw Error("Cada zona requiere 3 o 4 parejas distintas.");
    const [a,b,c,d]=ids;
    if(!d)return [
      {code:"A1",round:1,pair1:a,pair2:b},
      {code:"A2",round:2,pair1:a,pair2:c},
      {code:"A3",round:3,pair1:b,pair2:c}
    ];
    return [
      {code:"A1",round:1,pair1:a,pair2:b},
      {code:"A2",round:1,pair1:c,pair2:d},
      {code:"A3",round:2,pair1:{from:"A1",outcome:"winner"},pair2:{from:"A2",outcome:"winner"}},
      {code:"A4",round:2,pair1:{from:"A1",outcome:"loser"},pair2:{from:"A2",outcome:"loser"}}
    ];
  }

  function checkScore(sets,stage){
    const mode=stage==="groups"?"super_tb":"three_sets";
    if(!Array.isArray(sets)||![2,3].includes(sets.length))throw Error("Se necesitan dos o tres sets.");
    let won=[0,0];
    for(let i=0;i<sets.length;i++){
      const s=sets[i];
      if(!Array.isArray(s)||s.length!==2||s.some(v=>!Number.isInteger(v)||v<0||v>99)||s[0]===s[1])
        throw Error("Marcador de set inválido.");
      if(won.includes(2))throw Error("Un partido no continúa después de definirse.");
      const hi=Math.max(...s),lo=Math.min(...s);
      const isSTB=mode==="super_tb"&&i===2;
      const valid=isSTB?((hi===10&&lo<=8)||(hi>10&&hi-lo===2)):
        ((hi===6&&lo<=4)||(hi===7&&(lo===5||lo===6)));
      if(!valid)throw Error(isSTB?"Súper tie-break inválido.":"Set normal inválido.");
      won[s[0]>s[1]?0:1]++;
    }
    if(!won.includes(2))throw Error("Falta definir el partido.");
    if(sets.length===3&&won[0]+won[1]!==3)throw Error("Tercer set innecesario.");
    const regular=mode==="super_tb"?sets.slice(0,2):sets;
    const games=regular.reduce((v,s)=>[v[0]+s[0],v[1]+s[1]],[0,0]);
    return {winner:won[0]===2?1:2,sets:won,games,mode};
  }

  function standings(ids,playedMatches,manualOrder=[]){
    if(!Array.isArray(ids)||![3,4].includes(ids.length)||new Set(ids).size!==ids.length)
      throw Error("Zona inválida.");
    if(!Array.isArray(playedMatches))throw Error("Partidos inválidos.");
    const rows=new Map(ids.map(id=>[id,{pairId:id,played:0,won:0,lost:0,points:0,
      setsFor:0,setsAgainst:0,setDifference:0,gamesFor:0,gamesAgainst:0,gameDifference:0}]));
    const headToHead=new Map(), encountered=new Set();
    for(const match of playedMatches){
      const {pair1,pair2,sets}=match;
      if(!rows.has(pair1)||!rows.has(pair2)||pair1===pair2)throw Error("Rivales inválidos.");
      if(!sets)continue;
      const key=[pair1,pair2].sort().join("|");
      if(encountered.has(key))throw Error("Partido duplicado.");
      encountered.add(key);
      const s=checkScore(sets,"groups"),a=rows.get(pair1),b=rows.get(pair2);
      const winner=s.winner===1?a:b,loser=s.winner===1?b:a;
      winner.won++;winner.points+=2;loser.lost++;
      for(const r of [a,b])r.played++;
      a.setsFor+=s.sets[0];a.setsAgainst+=s.sets[1];
      b.setsFor+=s.sets[1];b.setsAgainst+=s.sets[0];
      a.gamesFor+=s.games[0];a.gamesAgainst+=s.games[1];
      b.gamesFor+=s.games[1];b.gamesAgainst+=s.games[0];
      headToHead.set(key,winner.pairId);
    }
    const result=[...rows.values()];
    for(const r of result){
      r.setDifference=r.setsFor-r.setsAgainst;
      r.gameDifference=r.gamesFor-r.gamesAgainst;
    }
    const metric=(a,b)=>b.points-a.points||b.setDifference-a.setDifference||b.gameDifference-a.gameDifference;
    result.sort((a,b)=>metric(a,b)||ids.indexOf(a.pairId)-ids.indexOf(b.pairId));
    const unresolved=[];
    for(let i=0;i<result.length;){
      let j=i+1;while(j<result.length&&metric(result[i],result[j])===0)j++;
      if(j-i===2){
        const a=result[i],b=result[i+1],winner=headToHead.get([a.pairId,b.pairId].sort().join("|"));
        if(winner===b.pairId){result[i]=b;result[i+1]=a;}
        else if(!winner)unresolved.push([a.pairId,b.pairId]);
      }else if(j-i>2)unresolved.push(result.slice(i,j).map(r=>r.pairId));
      i=j;
    }
    const manual=new Map(manualOrder.map((id,i)=>[id,i]));
    if(new Set(manualOrder).size!==manualOrder.length||manualOrder.some(id=>!rows.has(id)))
      throw Error("Resolución manual inválida.");
    for(const group of unresolved){
      if(group.every(id=>manual.has(id))){
        const positions=result.map((r,i)=>group.includes(r.pairId)?i:-1).filter(i=>i>=0);
        const ordered=group.slice().sort((a,b)=>manual.get(a)-manual.get(b));
        positions.forEach((index,j)=>result[index]=rows.get(ordered[j]));
      }
    }
    const remaining=unresolved.filter(g=>!g.every(id=>manual.has(id)));
    return {rows:result,complete:encountered.size===(ids.length===4?4:3),
      unresolved:remaining,qualificationReady:remaining.length===0&&encountered.size===(ids.length===4?4:3),
      qualified:remaining.length===0&&encountered.size===(ids.length===4?4:3)?
        result.slice(0,ids.length===4?3:2).map(r=>r.pairId):[]};
  }

  function participants(plan){
    return plan.sizes.flatMap((size,g)=>Array.from({length:size===4?3:2},(_,k)=>({
      group:g,rank:k+1,label:`${k+1}° ${String.fromCharCode(65+g)}`,groupSize:size
    })));
  }
  function seeds(count){
    let out=[1,2];
    while(out.length<count){
      const limit=out.length*2+1;
      out=out.flatMap(a=>[a,limit-a]);
    }
    return out;
  }
  function bracket(n){
    const plan=groupPlan(n), entrants=participants(plan),special=SPECIAL[n];
    let pre,opening;
    if(special){
      pre=special.pre.map(m=>m.slice());
      opening=special.opening.map(m=>m.slice());
    }else{
      // Primero por posición deportiva; zonas de cuatro son A, B... y
      // desempatan prioridad frente a zonas de tres.
      const ordered=entrants.slice().sort((a,b)=>
        a.rank-b.rank||b.groupSize-a.groupSize||a.group-b.group);
      const direct=ordered.slice(0,plan.preliminaries?plan.direct:plan.base);
      const pool=ordered.slice(direct.length);
      pre=[];
      while(pool.length){
        const first=pool.shift();
        const other=pool.findIndex(x=>x.group!==first.group);
        pre.push([first.label,pool.splice(other<0?0:other,1)[0].label]);
      }
      const cells=direct.map(x=>x.label).concat(pre.map((_,i)=>`P${i+1}`));
      const arranged=seeds(plan.base).map(i=>cells[i-1]);
      opening=[];
      for(let i=0;i<arranged.length;i+=2)opening.push([arranged[i],arranged[i+1]]);
    }
    const direct=opening.flat().filter(x=>/^[1-3]° [A-Z]$/.test(x));
    const expected=new Set(entrants.map(x=>x.label));
    const actual=pre.flat().concat(direct);
    if(actual.length!==entrants.length||new Set(actual).size!==entrants.length||
      actual.some(x=>!expected.has(x))||pre.length!==plan.preliminaries||
      opening.length!==plan.base/2)throw Error("El simulador contiene una llave incompleta.");
    return {...plan,preliminariesMatches:pre,firstRoundMatches:opening,
      directEntrants:direct,illustrative:!special};
  }

  return Object.freeze({groupPlan,groupFixture,checkScore,standings,bracket});
});
