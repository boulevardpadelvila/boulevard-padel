/* Boulevard Pádel · Liga — motor deportivo puro (sin Supabase).
   Reglamento provisional hasta revisión de Martín:
   - Una rueda por defecto, todos contra todos; opción ida/vuelta.
   - 2 puntos al ganador, 1 al perdedor que ganó un set, 0 al perdedor 2-0.
   - Dos sets normales; con 1-1, súper tie-break a 10 (mín. 2 diferencia).
   - Tabla: puntos, diferencia de sets, sets a favor; después diferencia
     de games y games a favor. Empate absoluto de 1º no da campeón automático.
   - Súper tie-break cuenta como set, NO como games.
 */
(function(root,factory){
  "use strict";
  const classic=typeof module==="object"&&module.exports
    ?require("./torneos-motor.js"):root.BPTournamentEngine;
  const api=factory(classic);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.BPLeagueEngine=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(classic){
  "use strict";
  if(!classic||typeof classic.evaluateSets!=="function")
    throw Error("Falta el motor deportivo de Boulevard Pádel.");

  function buildSchedule(pairIds,legs=1){
    if(!Array.isArray(pairIds)||pairIds.length<2||pairIds.length>256||
        ![1,2].includes(legs)||new Set(pairIds).size!==pairIds.length||
        pairIds.some(x=>typeof x!=="string"||!x.trim()))
      throw Error("Para crear una Liga elegí de 2 a 256 parejas distintas y una o dos ruedas.");
    const roster=pairIds.slice();
    if(roster.length%2)roster.push(null);
    const n=roster.length,perLeg=n-1;
    const first=[];
    let current=roster.slice();
    for(let round=1;round<=perLeg;round++){
      const matches=[];
      for(let index=0;index<n/2;index++){
        const a=current[index],z=current[n-1-index];
        if(a&&z)matches.push({pair1Id:round%2===0?z:a,
          pair2Id:round%2===0?a:z,roundNumber:round,
          leg:1,matchNumber:matches.length+1});
      }
      first.push(matches);
      current=[current[0],current[n-1],...current.slice(1,n-1)];
    }
    const second=legs===2?first.map(round=>round.map(m=>({
      ...m,leg:2,roundNumber:m.roundNumber+perLeg,
      pair1Id:m.pair2Id,pair2Id:m.pair1Id
    }))):[];
    return [...first,...second].flat();
  }

  function analyzeScore(sets){
    const result=classic.evaluateSets({sets},"super_tb");
    return {
      ...result,
      winnerSide:result.winnerSide,
      loserSets:result.winnerSide===1?result.side2Sets:result.side1Sets,
      games1:sets.slice(0,2).reduce((a,row)=>a+row[0],0),
      games2:sets.slice(0,2).reduce((a,row)=>a+row[1],0)
    };
  }

  function standings(pairIds,matches){
    if(!Array.isArray(pairIds)||new Set(pairIds).size!==pairIds.length||
        !Array.isArray(matches))throw Error("Parejas o partidos inválidos.");
    const records=new Map(pairIds.map(id=>[id,{
      pairId:id,played:0,won:0,lost:0,points:0,
      setsFor:0,setsAgainst:0,setDifference:0,
      gamesFor:0,gamesAgainst:0,gameDifference:0
    }]));
    let played=0;
    for(const match of matches){
      if(match.match_status!=="played"||!match.sets)continue;
      const p1=records.get(match.pair1_id||match.pair1Id),
        p2=records.get(match.pair2_id||match.pair2Id);
      if(!p1||!p2||p1===p2)throw Error("Partido de Liga con parejas inválidas.");
      const r=analyzeScore(match.sets);
      const winner=r.winnerSide===1?p1:p2,loser=r.winnerSide===1?p2:p1;
      p1.played++;p2.played++;winner.won++;loser.lost++;
      winner.points+=2;
      if(r.loserSets===1)loser.points++;
      p1.setsFor+=r.side1Sets;p1.setsAgainst+=r.side2Sets;
      p2.setsFor+=r.side2Sets;p2.setsAgainst+=r.side1Sets;
      p1.gamesFor+=r.games1;p1.gamesAgainst+=r.games2;
      p2.gamesFor+=r.games2;p2.gamesAgainst+=r.games1;
      played++;
    }
    const result=[...records.values()];
    for(const p of result){
      p.setDifference=p.setsFor-p.setsAgainst;
      p.gameDifference=p.gamesFor-p.gamesAgainst;
    }
    const metrics=p=>[p.points,p.setDifference,p.setsFor,p.gameDifference,p.gamesFor];
    result.sort((a,b)=>{
      const aa=metrics(a),bb=metrics(b);
      for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return bb[i]-aa[i];
      return String(a.pairId).localeCompare(String(b.pairId));
    });
    for(let i=0;i<result.length;i++){
      result[i].tied=i>0&&metrics(result[i]).every((v,k)=>v===metrics(result[i-1])[k]) ||
        i<result.length-1&&metrics(result[i]).every((v,k)=>v===metrics(result[i+1])[k]);
      result[i].rank=i+1;
    }
    const complete=matches.length>0&&played===matches.length;
    const champion=complete&&result.length&&
      !(result[0].tied)&&result[0].won>=0?result[0].pairId:null;
    return {rows:result,played,total:matches.length,complete,champion};
  }
  return Object.freeze({buildSchedule,analyzeScore,standings});
});
