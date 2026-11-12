/* Boulevard Pádel · Liga — motor deportivo puro (sin Supabase).
   Reglamento confirmado el 12/11/2026:
   - Una única rueda, todos contra todos; las Fechas las organiza Martín.
   - 2 puntos al ganador, 1 al perdedor que ganó un set, 0 al perdedor 2-0.
   - Todos los partidos al mejor de tres sets normales, incluso la fase regular.
   - Tabla: puntos, diferencia de sets, sets a favor; después diferencia
     de games y games a favor. Empate absoluto de 1º no da campeón automático.
   - Solo en registros históricos el súper tie-break cuenta como set, no como games.
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

  // Sorteo de una rueda: el sistema agrupa automáticamente en Fechas
  // competitivas. Martín elige el día y horario real de cada partido.
  function buildSchedule(pairIds,legs=1){
    if(!Array.isArray(pairIds)||pairIds.length<2||pairIds.length>64||
      legs!==1||new Set(pairIds).size!==pairIds.length||
      pairIds.some(x=>typeof x!=="string"||!x.trim()))
      throw Error("Para sortear la Liga elegí de 2 a 64 parejas y una sola rueda.");
    const list=pairIds.slice();
    if(list.length%2)list.push(null);
    const n=list.length;
    let current=list.slice();
    const schedule=[];
    for(let round=1;round<n;round++){
      for(let index=0;index<n/2;index++){
        const a=current[index],z=current[n-1-index];
        if(a&&z){
          schedule.push({
            pair1Id:round%2===0?z:a,
            pair2Id:round%2===0?a:z,
            roundNumber:round,
            leg:1,
            matchNumber:schedule.length+1
          });
        }
      }
      current=[current[0],current[n-1],...current.slice(1,n-1)];
    }
    return schedule;
  }

  // Validación inmediata UX. Supabase repite la misma regla al guardar,
  // con bloqueo concurrente a nivel de torneo para evitar dos admins.
  function validateRoundAssignment(matches,matchId,roundNumber){
    if(!Array.isArray(matches))throw Error("Partidos inválidos.");
    if(!Number.isInteger(roundNumber)||roundNumber<1||roundNumber>999)
      throw Error("La Fecha debe ser un número entre 1 y 999.");
    const target=matches.find(m=>m.id===matchId);
    if(!target)throw Error("No se encontró el partido.");
    const a=target.pair1_id||target.pair1Id,b=target.pair2_id||target.pair2Id;
    if(!a||!b||a===b)throw Error("Parejas inválidas para programar.");
    const others=matches.filter(m=>m.id!==matchId&&m.round_number===roundNumber);
    const count=id=>others.filter(m=>(m.pair1_id||m.pair1Id)===id||
        (m.pair2_id||m.pair2Id)===id).length;
    if(count(a)>=1||count(b)>=1)
      throw Error("Cada pareja juega un solo partido por Fecha en una Liga.");
    return true;
  }

  // Para ingresar resultados NUEVOS exigimos sets normales. Los partidos
  // históricos anteriores al reglamento (con STB) se siguen leyendo sin
  // modificar marcadores ni sumar los puntos del STB como games.
  function analyzeScore(sets,{historical=false}={}){
    const legacySTB=historical&&Array.isArray(sets)&&sets.length===3&&
      Array.isArray(sets[2])&&Math.max(...sets[2])>7;
    const result=classic.evaluateSets({sets},legacySTB?"super_tb":"three_sets");
    const normalSets=legacySTB?sets.slice(0,2):sets;
    return {
      ...result,
      winnerSide:result.winnerSide,
      loserSets:result.winnerSide===1?result.side2Sets:result.side1Sets,
      games1:normalSets.reduce((a,row)=>a+row[0],0),
      games2:normalSets.reduce((a,row)=>a+row[1],0),
      historicalSTB:legacySTB
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
      const r=analyzeScore(match.sets,{historical:true});
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
  return Object.freeze({buildSchedule,validateRoundAssignment,analyzeScore,standings});
});
