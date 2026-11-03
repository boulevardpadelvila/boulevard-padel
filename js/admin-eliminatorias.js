/* Boulevard Pádel · Parche 66: pase directo y cuadro eliminatorio de siete parejas.
   Admin solamente. No programa horarios, ni modifica reservas o bloqueos. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const select=$('torneos-pairs-tournament');
const motor=window.BPTournamentEngine;
const groupsPanel=$('torneos-groups-panel');
if(!select||!motor||!groupsPanel)return;
const panel=document.createElement('section');
panel.id='bp-ko-panel';panel.className='torneos-panel bp-ko-panel';panel.hidden=true;
panel.innerHTML='<div class="bp-ko-heading"><div><small>FASE FINAL</small><h2>Eliminatorias</h2><p>Confirmá el pase directo a semifinales y los cruces de cuartos.</p></div><button type="button" id="bp-ko-refresh" class="torneos-outline">Actualizar</button></div><p id="bp-ko-message" role="status" aria-live="polite"></p><div id="bp-ko-content"></div>';
($('bp-results-panel')||groupsPanel).after(panel);
const content=$('bp-ko-content'),message=$('bp-ko-message');
let loadId=0,debounce=null,model=null,direct='',quarters=[],busy=false;
const letter=n=>String.fromCharCode(64+Number(n));
const name=id=>{const p=model?.pairMap.get(id);return p?p.player1_name+' y '+p.player2_name:'Pareja no disponible';};
function el(tag,value,cls){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==null&&value!==undefined)n.textContent=String(value);return n;}
function notify(s,kind){message.textContent=s;message.className='bp-ko-message'+(kind?' bp-ko-message--'+kind:'');}
/* Parche 67: confirmación personalizada sin avisos nativos del navegador. */
const koConfirmDialog=document.createElement('dialog');
koConfirmDialog.id='bp-ko-confirm-dialog';
koConfirmDialog.className='admin-save-dialog bp-ko-confirm-dialog';
koConfirmDialog.setAttribute('aria-labelledby','bp-ko-confirm-title');
koConfirmDialog.setAttribute('aria-describedby','bp-ko-confirm-description');
koConfirmDialog.innerHTML='<div class="admin-save-dialog__body">'
 +'<span class="admin-save-dialog__icon" aria-hidden="true">🏆</span>'
 +'<h2 id="bp-ko-confirm-title">Confirmar eliminatorias</h2>'
 +'<p id="bp-ko-confirm-description">Revisá el pase directo y los tres cruces antes de guardar el cuadro.</p>'
 +'<div class="bp-ko-confirm-summary"><strong>Pase directo a semifinales</strong><p id="bp-ko-confirm-bye"></p>'
 +'<strong>Cuartos de final</strong><ol id="bp-ko-confirm-matches"></ol></div>'
 +'<p class="admin-save-dialog__hint">Se guardará el cuadro deportivo. No se programarán partidos ni se bloquearán horarios de cancha.</p>'
 +'<div class="admin-save-dialog__actions">'
 +'<button type="button" class="secondary" id="bp-ko-confirm-back">Volver</button>'
 +'<button type="button" class="primary" id="bp-ko-confirm-accept">Sí, confirmar</button>'
 +'</div></div>';
document.body.append(koConfirmDialog);
const koConfirmBack=$('bp-ko-confirm-back'),koConfirmAccept=$('bp-ko-confirm-accept');
koConfirmBack.addEventListener('click',()=>koConfirmDialog.close('cancelled'));
koConfirmAccept.addEventListener('click',()=>koConfirmDialog.close('confirmed'));
function askKnockoutConfirmation(bye,matchups) {
  if(koConfirmDialog.open)return Promise.resolve(false);
  $('bp-ko-confirm-bye').textContent=name(bye);
  const list=$('bp-ko-confirm-matches');
  list.replaceChildren();
  matchups.forEach(([a,b],i)=>{
    list.append(el('li','Cuartos '+(i+1)+': '+name(a)+' vs. '+name(b)));
  });
  koConfirmDialog.returnValue='';
  return new Promise(resolve=>{
    koConfirmDialog.addEventListener('close',()=>{
      resolve(koConfirmDialog.returnValue==='confirmed');
    },{once:true});
    koConfirmDialog.showModal();
    // Foco inicial en la opción segura.
    koConfirmBack.focus();
  });
}

function standings(members,matches,allResults){
 const byId=new Map(allResults.map(r=>[r.match_id,r]));
 const fixture=matches.slice().sort((a,b)=>a.round_number-b.round_number||a.match_number-b.match_number);
 let ids,mapped={};
 if(members.length===3) {
   if(fixture.length!==3)throw Error('El grupo de tres no tiene tres partidos.');
   ids=members;
   const canon=motor.buildGroupFixture(ids);
   for(const x of canon) {
     const found=fixture.filter(m=>[m.pair1_id,m.pair2_id].includes(x.pair1)&&[m.pair1_id,m.pair2_id].includes(x.pair2));
     if(found.length!==1)throw Error('Hay cruces repetidos o incorrectos en el grupo.');
     const r=byId.get(found[0].id);
     if(r)mapped[x.code]={sets:r.resolved_pair1_id===x.pair1?r.sets:r.sets.map(set=>[set[1],set[0]]),format:r.score_format||'legacy'};
   }
 } else if(members.length===4) {
   if(fixture.length!==4)throw Error('El grupo de cuatro necesita cuatro cruces.');
   const find=(round,number)=>fixture.find(m=>m.round_number===round&&m.match_number===number);
   const matches4=[find(1,1),find(1,2),find(2,1),find(2,2)];
   if(matches4.some(m=>!m))throw Error('Faltan cruces del grupo de cuatro.');
   ids=[matches4[0].pair1_id,matches4[0].pair2_id,matches4[1].pair1_id,matches4[1].pair2_id];
   if(ids.some(x=>!x||!members.includes(x))||new Set(ids).size!==4)throw Error('Parejas inconsistentes en el grupo de cuatro.');
   ['A1','A2','A3','A4'].forEach((key,i)=>{
     const r=byId.get(matches4[i].id);
     if(r)mapped[key]={sets:r.sets,format:r.score_format||'legacy'};
   });
   const resolved=motor.resolveGroupFixture(motor.buildGroupFixture(ids),mapped);
   matches4.forEach((m,i)=>{
     const r=byId.get(m.id);
     if(r&&(r.resolved_pair1_id!==resolved[i].pair1||r.resolved_pair2_id!==resolved[i].pair2))
       throw Error('Hay un resultado que no coincide con el orden de los cruces.');
   });
 } else throw Error('Cada grupo debe contener tres o cuatro parejas.');
 return motor.calculateGroupStandings(ids,mapped);
}
function qualifiers(data){
 const sizes=data.groups.map(g=>data.assignments.filter(a=>a.group_id===g.id).length).sort().join(',');
 if(data.groups.length!==3||sizes!=='3,3,4')throw Error('Este cuadro se habilita con grupos de 3, 3 y 4 parejas.');
 if(data.matches.length!==10||data.results.length!==10||data.matches.some(x=>x.match_status!=='played'))
   throw Error('Primero completá los diez resultados de la fase de grupos.');
 const out=[];
 for(const group of data.groups.slice().sort((a,b)=>a.group_number-b.group_number)) {
   const members=data.assignments.filter(a=>a.group_id===group.id).map(a=>a.pair_id);
   const matches=data.matches.filter(m=>m.group_id===group.id);
   const t=standings(members,matches,data.results);
   if(!t.complete||!t.seedingReady)throw Error('El grupo '+letter(group.group_number)+' tiene resultados pendientes o puestos empatados por resolver.');
   t.table.slice(0,t.qualifyingPlaces).forEach((row,i)=>out.push({pairId:row.pairId,groupNumber:group.group_number,rank:i+1,points:row.points,setDifference:row.setDifference,setsFor:row.setsFor}));
 }
 if(out.length!==7||new Set(out.map(x=>x.pairId)).size!==7)throw Error('No se pudieron determinar siete clasificados únicos.');
 return out;
}
function valid(qs,bye,list){
 if(!Array.isArray(qs)||qs.length!==3||qs.some(q=>!Array.isArray(q)||q.length!==2))return false;
 const ids=[bye,...qs.flat()],eligible=new Set(list.map(q=>q.pairId));
 return ids.length===7&&new Set(ids).size===7&&ids.every(id=>eligible.has(id));
}
function version(results){
 const ms=results.map(r=>Date.parse(r.updated_at));
 if(ms.length!==10||ms.some(x=>!Number.isFinite(x)))throw Error('No se pudo verificar la versión de los resultados.');
 return new Date(Math.max(...ms)).toISOString();
}
function render(){
 content.replaceChildren();
 if(!model)return;
 const list=model.qualified,rec=model.rec;
 content.append(el('p','Siete parejas clasificadas. Una pasa directo a semifinales; las otras seis juegan tres cuartos.','bp-ko-description'));
 const control=el('div',null,'bp-ko-choice');
 control.append(el('h3','Pase directo a semifinales'));
 control.append(el('p',rec.unique?
  'Sugerencia automática: '+name(rec.recommendedId)+'. Martín puede elegir cualquier otra pareja clasificada.':
  'Los mejores primeros están empatados: '+rec.tiedFirstIds.map(name).join(' / ')+'. No hay desempate automático; Martín debe elegir.','bp-ko-hint'+(rec.unique?'':' bp-ko-hint--warning')));
 const label=el('label','Pareja con pase directo');label.htmlFor='bp-ko-bye';
 const chooser=document.createElement('select');chooser.id='bp-ko-bye';
 chooser.add(new Option('Elegir pareja clasificada',''));
 list.forEach(q=>chooser.add(new Option(name(q.pairId)+' · Grupo '+letter(q.groupNumber)+' · '+q.rank+'º',q.pairId)));
 chooser.value=direct;
 chooser.addEventListener('change',()=>{
   direct=chooser.value;
   quarters=direct?motor.planSevenKnockout(list,direct).quarterfinals:[];
   render();
 });
 control.append(label,chooser);content.append(control);
 if(!direct){content.append(el('p','Seleccioná una pareja para definir el cuadro.','bp-ko-hint'));return;}
 if(!valid(quarters,direct,list))quarters=motor.planSevenKnockout(list,direct).quarterfinals;
 content.append(el('h3','Cuartos de final · 3 partidos'));
 const grid=el('div',null,'bp-ko-grid'),available=list.filter(q=>q.pairId!==direct);
 quarters.forEach((pair,index)=>{
   const card=el('article',null,'bp-ko-match');
   card.append(el('strong','Cuartos '+(index+1)));
   const rivals=el('div',null,'bp-ko-match-rivals');
   pair.forEach((pairId,side)=>{
     if(side===1)rivals.append(el('span','VS','bp-ko-versus'));
     const dropdown=document.createElement('select');
     dropdown.setAttribute('aria-label','Cuartos '+(index+1)+' pareja '+(side+1));
     available.forEach(q=>dropdown.add(new Option(name(q.pairId)+' · '+letter(q.groupNumber)+q.rank,q.pairId)));
     dropdown.value=pairId;
     dropdown.addEventListener('change',()=>{
       const prev=quarters[index][side],next=dropdown.value;
       if(prev===next)return;
       quarters.forEach((row,i)=>row.forEach((v,j)=>{
         if((i!==index||j!==side)&&v===next)quarters[i][j]=prev;
       }));
       quarters[index][side]=next;
       render();
     });
     rivals.append(dropdown);
   });
   card.append(rivals);grid.append(card);
 });
 content.append(grid);
 const progression=el('div',null,'bp-ko-path');
 progression.append(el('strong','Semifinales y final'));
 progression.append(el('p','Semifinal 1: '+name(direct)+' vs. ganador de Cuartos 1'));
 progression.append(el('p','Semifinal 2: ganador de Cuartos 2 vs. ganador de Cuartos 3'));
 progression.append(el('p','Final: ganadores de ambas semifinales'));
 content.append(progression);
 const saved=model.saved;
 const revisionMatches=saved&&new Date(saved.result_revision).toISOString()===model.revision;
 const unchanged=revisionMatches&&saved.direct_semifinal_pair_id===direct&&
   JSON.stringify(saved.quarterfinals)===JSON.stringify(quarters);
 if(saved&&!revisionMatches)content.append(el('p','Cambió un resultado desde la confirmación anterior. Revisá y guardá nuevamente.','bp-ko-hint bp-ko-hint--warning'));
 const actions=el('div',null,'bp-ko-actions');
 const save=el('button',unchanged?'Cuadro confirmado ✓':saved?'Guardar cambios':'Confirmar cuadro eliminatorio','bp-ko-save');
 save.type='button';save.disabled=busy||unchanged;
 save.addEventListener('click',async()=>{
   if(busy||!model||!valid(quarters,direct,model.qualified))return;
   const snapshot=model,tournament=model.id,bye=direct,pairs=quarters.map(x=>x.slice()),revision=model.revision;
   if(!await askKnockoutConfirmation(bye,pairs))return;
   // Evitar persistir un cuadro obsoleto si la vista se actualizó durante la confirmación.
   if(busy||model!==snapshot||tournament!==select.value||direct!==bye||
      JSON.stringify(quarters)!==JSON.stringify(pairs)||model.revision!==revision)return;
   busy=true;save.disabled=true;notify('Guardando cuadro…');
   try {
     const {error}=await supabaseClient.from('bp_tournament_knockout_brackets').upsert({
       tournament_id:tournament,direct_semifinal_pair_id:bye,quarterfinals:pairs,
       choice_mode:model.rec.recommendedId===bye?'automatic':'manual',result_revision:revision
     },{onConflict:'tournament_id'});
     if(error)throw error;
     if(tournament===select.value){await load();notify('Cuadro confirmado. No se reservaron horarios.','success');}
   }catch(e){console.error('Error al confirmar eliminatorias',e);notify('No se pudo guardar: '+(e.message||'revisá los resultados.'),'error');}
   finally{busy=false;save.disabled=false;}
 });
 actions.append(save);
 actions.append(el('small','Podés intercambiar parejas en los cuartos antes de guardar. La programación de horarios será el siguiente paso.'));
 content.append(actions);
}
async function load(){
 const id=select.value,seq=++loadId;
 panel.hidden=!id;model=null;direct='';quarters=[];content.replaceChildren();
 if(!id){notify('');return;}
 notify('Calculando clasificación…');
 try{
   const [tr,gr,ar,pr,mr,rr,br]=await Promise.all([
     supabaseClient.from('bp_tournaments').select('id,name,format,status,groups_published_at,fixture_published_at').eq('id',id).maybeSingle(),
     supabaseClient.from('bp_tournament_groups').select('id,group_number').eq('tournament_id',id).order('group_number'),
     supabaseClient.from('bp_tournament_group_pairs').select('group_id,pair_id,created_at').eq('tournament_id',id).order('created_at'),
     supabaseClient.from('bp_tournament_pairs').select('id,player1_name,player2_name').eq('tournament_id',id),
     supabaseClient.from('bp_tournament_group_matches').select('id,group_id,round_number,match_number,pair1_id,pair2_id,match_status').eq('tournament_id',id),
     supabaseClient.from('bp_tournament_match_results').select('match_id,group_id,sets,score_format,resolved_pair1_id,resolved_pair2_id,updated_at').eq('tournament_id',id),
     supabaseClient.from('bp_tournament_knockout_brackets').select('tournament_id,direct_semifinal_pair_id,quarterfinals,choice_mode,result_revision').eq('tournament_id',id).maybeSingle()
   ]);
   if(seq!==loadId||id!==select.value)return;
   const bad=[tr,gr,ar,pr,mr,rr,br].find(x=>x.error);
   if(bad)throw bad.error;
   if(!tr.data||tr.data.format!=='groups_knockout'){panel.hidden=true;return;}
   if(!tr.data.groups_published_at||!tr.data.fixture_published_at||tr.data.status!=='registration_closed'){
     notify('La fase final requiere grupos y fixture publicados y la fase de grupos concluida.');
     return;
   }
   const data={groups:gr.data||[],assignments:ar.data||[],pairs:pr.data||[],matches:mr.data||[],results:rr.data||[]};
   const qualified=qualifiers(data),rec=motor.recommendSevenBye(qualified),rev=version(data.results);
   model={id,qualified,rec,revision:rev,pairMap:new Map(data.pairs.map(p=>[p.id,p])),saved:br.data||null};
   const saved=model.saved;
   direct=saved&&qualified.some(q=>q.pairId===saved.direct_semifinal_pair_id)?
     saved.direct_semifinal_pair_id:(rec.recommendedId||'');
   quarters=direct?(saved&&saved.direct_semifinal_pair_id===direct&&valid(saved.quarterfinals,direct,qualified)?
      saved.quarterfinals.map(x=>x.slice()):motor.planSevenKnockout(qualified,direct).quarterfinals):[];
   notify(saved&&new Date(saved.result_revision).toISOString()===rev?
     'Cuadro guardado. Podés revisar o cambiar la decisión de Martín.':
     'Propuesta pendiente. Martín puede elegir el pase directo y modificar los cruces.');
   render();
 }catch(e){
   if(seq!==loadId)return;
   console.error('No se pudieron preparar las eliminatorias',e);
   notify('Eliminatorias pendientes: '+(e.message||'revisá la conexión.'),'error');
 }
}
function scheduleLoad(){
 if(debounce!==null)clearTimeout(debounce);
 debounce=setTimeout(()=>{debounce=null;load();},280);
}
$('bp-ko-refresh').addEventListener('click',load);
select.addEventListener('change',load);
const resultContent=$('bp-results-content');
if(resultContent)new MutationObserver(scheduleLoad).observe(resultContent,{childList:true});
load();
})();
