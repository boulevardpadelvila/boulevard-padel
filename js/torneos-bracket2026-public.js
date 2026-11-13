/* Boulevard Pádel · Publicación de TODAS las posibles eliminatorias 6..40.
 * Los nombres se completan a medida que se confirman las posiciones y resultados.
 * Solo muestra datos. No escribe ni consulta reservas o contactos.
 */
(function(root,factory){
  "use strict";
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.BPBracket2026Public=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
  "use strict";
  function rounds(n){
    const r=root.BPReglamento2026;
    if(!r)throw Error("Falta el motor de llaves.");
    const plan=r.bracket(n);
    const all=[];
    if(plan.preliminariesMatches.length)
      all.push({stage:0,name:"Ronda previa",matches:plan.preliminariesMatches.map((m,i)=>({slot:i+1,source1:m[0],source2:m[1]}))});
    let current=plan.firstRoundMatches.map((m,i)=>({slot:i+1,source1:m[0],source2:m[1]}));
    let stage=1;
    while(current.length){
      const name=current.length===1?"Final":current.length===2?"Semifinales":
        current.length===4?"Cuartos de final":current.length===8?"Octavos de final":"Ronda eliminatoria";
      all.push({stage,name,matches:current});
      if(current.length===1)break;
      current=Array.from({length:current.length/2},(_,i)=>({
        slot:i+1,
        source1:"W:"+stage+":"+(2*i+1),
        source2:"W:"+stage+":"+(2*i+2)
      }));
      stage++;
    }
    return {plan,rounds:all};
  }
  function sourceLabel(src){
    if(/^P[1-9][0-9]*$/.test(src))return "Ganador P"+src.slice(1);
    if(/^W:[0-9]+:[0-9]+$/.test(src)){
      const [,stage,slot]=src.split(":");
      return "Ganador R"+stage+"-"+slot;
    }
    return src;
  }
  function displayScore(sets){
    return Array.isArray(sets)?sets.map(s=>Array.isArray(s)?s.join("-"):"").filter(Boolean).join(" · "):"";
  }
  function render(t,groups,fixture,report){
    if(t?.format!=="groups_knockout" || !Array.isArray(groups)||!Array.isArray(fixture)||!fixture.length)return null;
    const list=groups.slice().sort((a,b)=>a.number-b.number);
    if(list.some((g,i)=>g.number!==i+1 || ![3,4].includes(g.pairs?.length)))return null;
    const count=list.reduce((n,g)=>n+g.pairs.length,0);
    if(count<6||count>40)return null;
    const model=rounds(count);
    if(list.some((g,i)=>model.plan.sizes[i]!==g.pairs.length))return null;
    const byMatch=new Map((report?.matches||[]).map(m=>[m.stage+":"+m.slot,m]));
    const element=(tag,cls,text)=>{
      const e=document.createElement(tag);
      if(cls)e.className=cls;
      if(text!=null)e.textContent=String(text);
      return e;
    };
    const container=element("details","bp26-public");
    container.append(element("summary","bp26-public__summary","Cuadro de eliminatorias · "+model.plan.qualified+" clasificadas"));
    const description=element("p","bp26-public__note",
      "Llave publicada desde el sorteo. Las referencias 1° A, 2° B y «Ganador» se reemplazan a medida que se confirman las posiciones y los partidos.");
    container.append(description);
    const scroll=element("div","bp26-public__scroll");
    const stages=element("div","bp26-public__rounds");
    for(const round of model.rounds){
      const column=element("section","bp26-public__round");
      column.append(element("h4","bp26-public__heading",round.name));
      for(const m of round.matches){
        const live=byMatch.get(round.stage+":"+m.slot);
        const a=live?.pair1_name||sourceLabel(m.source1);
        const b=live?.pair2_name||sourceLabel(m.source2);
        const match=element("article","bp26-public__match");
        match.append(
          element("div","bp26-public__match-top","Partido "+(round.stage===0?"P":"R"+round.stage+"-")+m.slot),
          element("p","bp26-public__team",a),
          element("p","bp26-public__versus","VS"),
          element("p","bp26-public__team",b)
        );
        if(live?.schedule_status==="scheduled"&&live.scheduled_at){
          match.append(element("p","bp26-public__score",
            "Programado: "+new Intl.DateTimeFormat("es-AR",{
              timeZone:"America/Argentina/Cordoba",day:"2-digit",month:"2-digit",
              hour:"2-digit",minute:"2-digit",hourCycle:"h23"
            }).format(new Date(live.scheduled_at))));
        } else if(live?.schedule_status==="postponed") {
          match.append(element("p","bp26-public__score","Partido postergado"));
        }
        if(live?.status==="played")match.append(element("p","bp26-public__score","Resultado: "+displayScore(live.sets)));
        column.append(match);
      }
      stages.append(column);
    }
    scroll.append(stages);
    container.append(scroll);
    return container;
  }
  return Object.freeze({rounds,render,sourceLabel});
});