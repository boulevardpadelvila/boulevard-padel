/* Boulevard Pádel · Liga pública: solo recibe información sanitizada. */
(function(root){
  "use strict";
  function make(tag,cl,value){
    const node=document.createElement(tag);
    if(cl)node.className=cl;
    if(value!==undefined)node.textContent=String(value);
    return node;
  }
  const dateTime=iso=>new Intl.DateTimeFormat("es-AR",{
    timeZone:"America/Argentina/Cordoba",day:"2-digit",month:"2-digit",year:"numeric",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).format(new Date(iso));
  function leagueBlocks(t,report){
    const engine=root.BPLeagueEngine;
    if(!report||!engine||t.format!=="league")return [];
    const pairs=new Map((report.pairs||[]).map(p=>[p.id,p.name]));
    const matches=report.matches||[];
    const results=engine.standings([...pairs.keys()],matches);
    const calendar=make("details","public-tournament-more bp-public-league");
    calendar.append(make("summary","public-tournament-more__summary",
      "Calendario de Liga · "+matches.length+" partidos"));
    const body=make("div","public-tournament-more__body");
    const dates=new Map();
    for(const match of matches){
      if(!dates.has(match.round_number))dates.set(match.round_number,[]);
      dates.get(match.round_number).push(match);
    }
    for(const [round,items] of [...dates].sort((a,b)=>a[0]-b[0])){
      const section=make("section","bp-public-league__round");
      section.append(make("h4","","Fecha "+round));
      const cards=make("div","bp-public-league__matches");
      for(const m of items.sort((a,b)=>a.match_number-b.match_number)){
        const article=make("article","bp-public-league__match");
        article.append(make("strong","",
          (pairs.get(m.pair1_id)||"Pareja por confirmar")+" vs. "+
          (pairs.get(m.pair2_id)||"Pareja por confirmar")));
        const when=m.schedule_status==="scheduled"&&m.scheduled_at?dateTime(m.scheduled_at):
          m.schedule_status==="postponed"?"Partido postergado":"Fecha y horario a confirmar";
        article.append(make("p","bp-public-league__meta",when));
        if(m.match_status==="played"&&Array.isArray(m.sets))
          article.append(make("p","bp-public-league__score",
            m.sets.map(set=>set.join("–")).join(" · ")));
        cards.append(article);
      }
      section.append(cards);body.append(section);
    }
    if(!matches.length)body.append(make("p","bp-public-league__note",
      "Fixture pendiente. Volvé a consultar cuando cierre la inscripción."));
    calendar.append(body);
    const standings=make("details","public-tournament-more bp-public-league");
    standings.append(make("summary","public-tournament-more__summary",
      "Tabla general · "+results.played+" de "+results.total+" partidos"));
    const rankingBody=make("div","public-tournament-more__body");
    const scroll=make("div","bp-public-league__table-scroll");
    if(results.rows.length){
      const cols=["Pos.","Pareja","PJ","PG","PP","SF","SC","Dif.","GF","GC","Dif.G","Pts"];
      const table=make("table","bp-public-league__table");
      const header=document.createElement("thead");
      const hr=document.createElement("tr");
      cols.forEach(c=>hr.append(make("th","",c)));header.append(hr);table.append(header);
      const tbody=document.createElement("tbody");
      for(const [i,p] of results.rows.entries()){
        const row=document.createElement("tr");
        [i+1,pairs.get(p.pairId)||"Pareja",p.played,p.won,p.lost,p.setsFor,
          p.setsAgainst,p.setDifference,p.gamesFor,p.gamesAgainst,
          p.gameDifference,p.points].forEach(v=>row.append(make("td","",v)));
        tbody.append(row);
      }
      table.append(tbody);scroll.append(table);rankingBody.append(scroll);
    }
    const text=results.complete
      ? results.champion
        ? (t.status==="completed"?"🏆 Campeones: ":"Primera posición: ")+
          (pairs.get(results.champion)||"Pareja")
        : "Empate en el primer puesto: la organización debe resolverlo."
      : "Tabla provisoria. Victoria: 2 pts; derrota 2–1: 1 pt; derrota 2–0: 0 pts.";
    rankingBody.append(make("p","bp-public-league__note",text));
    standings.append(rankingBody);
    return [calendar,standings];
  }
  root.BPLeaguePublic=Object.freeze({leagueBlocks});
})(typeof globalThis!=="undefined"?globalThis:this);
