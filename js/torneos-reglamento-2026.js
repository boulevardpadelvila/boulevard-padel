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


  /* Cuadros oficiales, páginas 10..35 del PDF «Drops 6 a 40 parejas».
     Las entradas están en orden vertical: cada Pn es el ganador de la
     previa n. NO generar estos cruces mediante ordenación por ranking. */
  const DROPS_PDF = Object.freeze({
    15: ["2B 2C|2D 2A", "1A P1|1E 1D|1C 2E|P2 1B"],
    16: ["2B 2C|3A 2E|2D 2A", "1A P1|1E 1D|1C P2|P3 1B"],
    17: ["2B 2C|1E 3B|3A 2E|2D 2A", "1A P1|P2 1D|1C P3|P4 1B"],
    18: ["2C 2F|1E 2B|2A 1F|2E 2D", "1A P1|P2 1D|1C P3|P4 1B"],
    19: ["2C 2F|1E 2B|3A 1D|2A 1F|2E 2D", "1A P1|P2 P3|1C P4|P5 1B"],
    20: ["2C 2F|1E 2B|3A 1D|1C 3B|2A 1F|2E 2D", "1A P1|P2 P3|P4 P5|P6 1B"],
    21: ["2F 2G|1E 2C|2B 1D|1C 2A|2D 1F|1G 2E", "1A P1|P2 P3|P4 P5|P6 1B"],
    22: ["2F 2G|1E 2C|2B 1D|1C 2A|2D 1F|1G 2E|3A 1B", "1A P1|P2 P3|P4 P5|P6 P7"],
    23: ["", "1A 3B|2F 2G|1E 2C|2B 1D|1C 2A|2D 1F|1G 2E|3A 1B"],
    24: ["", "1A 2B|2G 1H|1E 2F|2C 1D|1C 2D|2E 1F|1G 2H|2A 1B"],
    25: ["3A 2B", "1A P1|2G 1H|1E 2F|2C 1D|1C 2D|2E 1F|1G 2H|2A 1B"],
    26: ["3A 2B|2A 3B", "1A P1|2G 1H|1E 2F|2C 1D|1C 2D|2E 1F|1G 2H|P2 1B"],
    27: ["2B 2C|2D 2A", "1A P1|1I 1H|1E 2G|2F 1D|1C 2E|2H 1F|1G 2I|P2 1B"],
    28: ["2B 2C|3A 2E|2D 2A", "1A P1|1I 1H|1E 2G|2F 1D|1C P2|2H 1F|1G 2I|P3 1B"],
    29: ["2B 2C|2F 3B|3A 2E|2D 2A", "1A P1|1I 1H|1E 2G|P2 1D|1C P3|2H 1F|1G 2I|P4 1B"],
    30: ["2C 2F|2G 2B|2A 2H|2E 2D", "1A P1|1I 1H|1E 2J|P2 1D|1C P3|2I 1F|1G 1J|P4 1B"],
    31: ["2C 2F|2G 2B|2A 2H|2I 3A|2E 2D", "1A P1|1I 1H|1E 2J|P2 1D|1C P3|P4 1F|1G 1J|P5 1B"],
    32: ["2C 2F|3B 2J|2G 2B|2A 2H|2I 3A|2E 2D", "1A P1|1I 1H|1E P2|P3 1D|1C P4|P5 1F|1G 1J|P6 1B"],
    33: ["2F 2G|2B 2K|2J 2C|2D 2I|1K 2A|2H 2E", "1A P1|1I 1H|1E P2|P3 1D|1C P4|P5 1F|1G 1J|P6 1B"],
    34: ["2F 2G|2B 2K|2J 2C|2D 2I|1K 2A|3A 1J|2H 2E", "1A P1|1I 1H|1E P2|P3 1D|1C P4|P5 1F|1G P6|P7 1B"],
    35: ["2F 2G|1I 3B|2B 2K|2J 2C|2D 2I|1K 2A|3A 1J|2H 2E", "1A P1|P2 1H|1E P3|P4 1D|1C P5|P6 1F|1G P7|P8 1B"],
    36: ["2G 2J|1I 2B|2C 1L|2K 2F|2E 2L|1K 2D|2A 1J|2I 2H", "1A P1|P2 1H|1E P3|P4 1D|1C P5|P6 1F|1G P7|P8 1B"],
    37: ["2G 2J|1I 2B|3A 1H|2C 1L|2K 2F|2E 2L|1K 2D|2A 1J|2I 2H", "1A P1|P2 P3|1E P4|P5 1D|1C P6|P7 1F|1G P8|P9 1B"],
    38: ["2G 2J|1I 2B|3A 1H|2C 1L|2K 2F|2E 2L|1K 2D|1G 3B|2A 1J|2I 2H", "1A P1|P2 P3|1E P4|P5 1D|1C P6|P7 1F|P8 P9|P10 1B"],
    39: ["2J 2K|1I 2C|2B 1H|2F 1L|1M 2G|2H 2M|1K 2E|1G 2A|2D 1J|2L 2I", "1A P1|P2 P3|1E P4|P5 1D|1C P6|P7 1F|P8 P9|P10 1B"],
    40: ["2J 2K|1I 2C|2B 1H|2F 1L|1M 2G|2H 2M|1K 2E|3A 1F|1G 2A|2D 1J|2L 2I", "1A P1|P2 P3|1E P4|P5 1D|1C P6|P7 P8|P9 P10|P11 1B"],
  });
  const expandDrops=(rows)=>rows ? rows.split("|").map(row=>row.split(" ").map(x=>
    /^P[1-9][0-9]*$/.test(x) ? x : `${x[0]}° ${x.slice(1)}`)) : [];

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

  // Identificadores visibles. Las claves de Supabase (stage/slot) no cambian.
  // P: previa, D: 16avos, O: octavos, C: cuartos, S: semifinal, F: final.
  function matchCode(base,stage,slot){
    if(!Number.isInteger(base)||base<2||base>32||(base&(base-1))!==0||
      !Number.isInteger(stage)||stage<0||!Number.isInteger(slot)||slot<1)
      throw Error("Referencia de partido inválida.");
    const count=stage===0?null:base/(2**stage);
    const letter=stage===0?"P":({16:"D",8:"O",4:"C",2:"S",1:"F"})[count];
    if(!letter||(count!==null&&(!Number.isInteger(count)||slot>count)))
      throw Error("Ronda eliminatoria inválida.");
    return letter+slot;
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
    }else if(DROPS_PDF[n]){
      pre=expandDrops(DROPS_PDF[n][0]);
      opening=expandDrops(DROPS_PDF[n][1]);
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
    if(pre.some(([a,b])=>a.startsWith("1° ")&&b.startsWith("1° ")))
      throw Error("El reglamento prohíbe enfrentar dos primeros en la ronda previa.");
    const refs=opening.flat().filter(x=>/^P[1-9][0-9]*$/.test(x));
    if(refs.length!==pre.length||new Set(refs).size!==pre.length||
      refs.some(x=>Number(x.slice(1))>pre.length))
      throw Error("Los pases de la ronda previa están incompletos o duplicados.");
    return {...plan,preliminariesMatches:pre,firstRoundMatches:opening,
      directEntrants:direct,illustrative:false};
  }

  // Tabla nueva de Liga: preserva los cinco criterios actuales de desempate.
  // Solo cambia el tercer set de la fase regular: debe ser NORMAL.
  function leagueStandings(ids,matches){
    if(!Array.isArray(ids)||ids.length<4||new Set(ids).size!==ids.length||!Array.isArray(matches))
      throw Error("Liga inválida.");
    const map=new Map(ids.map(id=>[id,{pairId:id,played:0,won:0,lost:0,points:0,
      setsFor:0,setsAgainst:0,setDifference:0,gamesFor:0,gamesAgainst:0,gameDifference:0}]));
    let played=0;
    for(const match of matches){
      if(!match.sets)continue;
      const a=map.get(match.pair1),b=map.get(match.pair2);
      if(!a||!b||a===b)throw Error("Partido de Liga inválido.");
      const score=checkScore(match.sets,"league");
      const winner=score.winner===1?a:b,loser=score.winner===1?b:a;
      winner.won++;winner.points+=2;
      loser.lost++;
      if(score.sets.includes(1))loser.points++;
      for(const r of [a,b])r.played++;
      a.setsFor+=score.sets[0];a.setsAgainst+=score.sets[1];
      b.setsFor+=score.sets[1];b.setsAgainst+=score.sets[0];
      a.gamesFor+=score.games[0];a.gamesAgainst+=score.games[1];
      b.gamesFor+=score.games[1];b.gamesAgainst+=score.games[0];
      played++;
    }
    const rows=[...map.values()];
    for(const r of rows){r.setDifference=r.setsFor-r.setsAgainst;r.gameDifference=r.gamesFor-r.gamesAgainst;}
    const metrics=r=>[r.points,r.setDifference,r.setsFor,r.gameDifference,r.gamesFor];
    rows.sort((a,b)=>{
      const x=metrics(a),y=metrics(b);
      for(let i=0;i<x.length;i++)if(x[i]!==y[i])return y[i]-x[i];
      return ids.indexOf(a.pairId)-ids.indexOf(b.pairId);
    });
    const ties=[];
    for(let i=0;i<rows.length;i++){
      const peer=rows.filter(r=>metrics(r).every((n,j)=>n===metrics(rows[i])[j])).map(r=>r.pairId);
      if(peer.length>1&&!ties.some(g=>g.includes(rows[i].pairId)))ties.push(peer);
    }
    return {rows,complete:matches.length>0&&played===matches.length,played,total:matches.length,
      tiedGroups:ties,topFourReady:played===matches.length&&ties.every(g=>!g.some(id=>rows.slice(0,4).some(r=>r.pairId===id)))};
  }

  return Object.freeze({groupPlan,groupFixture,checkScore,standings,bracket,leagueStandings,matchCode});
});
