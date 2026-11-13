/* Boulevard Pádel · Admin: grupos y eliminatorias 2026 · 6 a 40 parejas.
 * Reutiliza resultados de fase de grupos y RPC protegidas de SQL90.
 * Programa eliminatorias mediante RPC SQL92 que valida disponibilidad y protege reservas.
 */
(() => {
  'use strict';
  const select = document.getElementById('torneos-pairs-tournament');
  const target = document.getElementById('bp-results-panel') || document.getElementById('torneos-groups-panel');
  const motor = window.BPReglamento2026;
  if (!select || !target || !motor) return;
  const section = document.createElement('section');
  section.id = 'bp26-admin';
  section.className = 'torneos-panel bp26-admin';
  section.hidden = true;
  section.innerHTML = '<div class="bp26-admin__head"><div><small>REGLAMENTO 2026</small><h2>Clasificación y eliminatorias</h2><p>Llave generada al publicar el fixture. Cargá los resultados para conocer las parejas.</p></div><button type="button" class="torneos-outline" id="bp26-reload">Actualizar</button></div><p id="bp26-status" class="bp26-admin__status" role="status"></p><div id="bp26-body"></div>';
  target.after(section);
  const body = section.querySelector('#bp26-body');
  const status = section.querySelector('#bp26-status');
  const dialog = document.createElement('dialog');
  dialog.id = 'bp26-result-dialog';
  dialog.className = 'admin-save-dialog bp26-result-dialog';
  dialog.innerHTML = '<form method="dialog" class="admin-save-dialog__body" id="bp26-score-form"><h2 id="bp26-result-title">Resultado eliminatorio</h2><p id="bp26-result-teams"></p><p class="bp26-admin__hint">Sets normales. El tercero se carga solo si cada pareja ganó un set.</p><div id="bp26-score-fields" class="bp26-score-fields"></div><p id="bp26-score-error" role="alert"></p><div class="admin-save-dialog__actions"><button type="button" id="bp26-score-cancel" class="secondary">Volver</button><button type="submit" id="bp26-score-confirm" class="primary">Guardar resultado</button></div></form>';
  document.body.append(dialog);
  const form=dialog.querySelector('#bp26-score-form');
  const scoreError=dialog.querySelector('#bp26-score-error');
  let seq=0,busy=false,data=null,manual={},pendingMatch=null;

  // Confirmación de posiciones oficial con modal propio, sin confirm() del navegador.
  const placementsDialog=document.createElement('dialog');
  placementsDialog.id='bp26-placements-dialog';
  placementsDialog.className='admin-save-dialog bp26-placements-dialog';
  placementsDialog.setAttribute('aria-labelledby','bp26-placements-title');
  placementsDialog.setAttribute('aria-describedby','bp26-placements-description');
  placementsDialog.innerHTML=`<div class="admin-save-dialog__body">
      <span class="admin-save-dialog__icon" aria-hidden="true">✓</span>
      <h2 id="bp26-placements-title">Confirmar posiciones oficiales</h2>
      <p id="bp26-placements-description">Vas a fijar el orden de clasificación de cada zona. Con estas posiciones se determinarán los cruces de eliminatorias.</p>
      <div id="bp26-placements-review" class="bp26-placements-dialog__review"></div>
      <p class="admin-save-dialog__hint">Revisá el orden antes de continuar. Después de comenzar las eliminatorias, estas posiciones no podrán modificarse.</p>
      <p id="bp26-placements-error" class="bp26-placements-dialog__error" role="alert"></p>
      <div class="admin-save-dialog__actions">
        <button type="button" class="secondary" id="bp26-placements-cancel">Cancelar</button>
        <button type="button" class="primary" id="bp26-placements-accept">Sí, confirmar posiciones</button>
      </div>
    </div>`;
  document.body.append(placementsDialog);
  const placementsReview=placementsDialog.querySelector('#bp26-placements-review');
  const placementsError=placementsDialog.querySelector('#bp26-placements-error');
  const placementsCancel=placementsDialog.querySelector('#bp26-placements-cancel');
  const placementsAccept=placementsDialog.querySelector('#bp26-placements-accept');
  let pendingPlacements=null;

  const scheduleDialog=document.createElement('dialog');
  scheduleDialog.id='bp26-schedule-dialog';
  scheduleDialog.className='admin-save-dialog bp26-schedule-dialog';
  scheduleDialog.innerHTML=`<form id="bp26-schedule-form" class="admin-save-dialog__body">
      <h2 id="bp26-schedule-title">Programar eliminatoria</h2>
      <p id="bp26-schedule-rivals"></p>
      <label for="bp26-schedule-day">Fecha</label>
      <input type="date" id="bp26-schedule-day" required />
      <label for="bp26-schedule-time">Hora de inicio</label>
      <select id="bp26-schedule-time" required></select>
      <label for="bp26-schedule-duration">Duración</label>
      <select id="bp26-schedule-duration">
        <option value="90">90 minutos</option>
        <option value="120">120 minutos</option>
      </select>
      <p class="bp26-admin__hint">El sistema comprueba que la cancha esté libre de reservas, turnos fijos y otros partidos.</p>
      <p id="bp26-schedule-error" role="alert"></p>
      <div class="admin-save-dialog__actions">
        <button type="button" id="bp26-schedule-cancel" class="secondary">Volver</button>
        <button type="submit" id="bp26-schedule-save" class="primary">Guardar horario</button>
      </div>
    </form>`;
  document.body.append(scheduleDialog);
  const scheduleForm=scheduleDialog.querySelector('#bp26-schedule-form');
  const scheduleError=scheduleDialog.querySelector('#bp26-schedule-error');
  const scheduleTime=scheduleDialog.querySelector('#bp26-schedule-time');
  for(let hour=9;hour<=23;hour++)for(const minute of ['00','30']){
    const t=String(hour).padStart(2,'0')+':'+minute;
    scheduleTime.add(new Option(t,t));
  }
  let pendingScheduleMatch=null;
  function matchTimeParts(value){
    if(!value)return null;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
      timeZone:'America/Argentina/Cordoba',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(new Date(value)).map(({type,value})=>[type,value]));
    return {day:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute};
  }
  function openSchedule(match){
    if(busy||match.status==='played')return;
    pendingScheduleMatch=match;
    scheduleError.textContent='';
    scheduleDialog.querySelector('#bp26-schedule-title').textContent=
      match.schedule_status==='scheduled'?'Reprogramar eliminatoria':'Programar eliminatoria';
    scheduleDialog.querySelector('#bp26-schedule-rivals').textContent=
      (match.pair1_name||sourceLabel(match.source1))+' vs. '+(match.pair2_name||sourceLabel(match.source2));
    const local=matchTimeParts(match.scheduled_at);
    scheduleDialog.querySelector('#bp26-schedule-day').value=local?.day||'';
    scheduleTime.value=local?.time||'19:00';
    scheduleDialog.querySelector('#bp26-schedule-duration').value=match.scheduled_at&&match.scheduled_ends_at?
      String(Math.round((Date.parse(match.scheduled_ends_at)-Date.parse(match.scheduled_at))/60000)):'90';
    scheduleDialog.showModal();
  }
  scheduleDialog.querySelector('#bp26-schedule-cancel').addEventListener('click',()=>{if(!busy)scheduleDialog.close();});
  scheduleForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!pendingScheduleMatch)return;
    const day=scheduleDialog.querySelector('#bp26-schedule-day').value;
    const time=scheduleTime.value;
    if(!day||!time){scheduleError.textContent='Elegí fecha y hora.';return;}
    const stamp=new Date(day+'T'+time+':00-03:00');
    if(!Number.isFinite(stamp.getTime())){scheduleError.textContent='Fecha inválida.';return;}
    busy=true;scheduleError.textContent='Comprobando disponibilidad…';
    try{
      const {error}=await supabaseClient.rpc('bp_tournament_schedule_bracket_match2026',{
        p_match_id:pendingScheduleMatch.id,
        p_start:stamp.toISOString(),
        p_duration_minutes:Number(scheduleDialog.querySelector('#bp26-schedule-duration').value),
        p_court_label:null
      });
      if(error)throw error;
      pendingScheduleMatch=null;scheduleDialog.close();busy=false;
      await load();
    }catch(err){console.error(err);scheduleError.textContent=err.message||'No se pudo programar ese horario.';}
    finally{busy=false;}
  });
  async function postponeSchedule(match){
    if(busy||match.schedule_status!=='scheduled'||match.status==='played')return;
    if(!window.confirm('¿Postergar este partido y liberar su horario de cancha?'))return;
    busy=true;note('Liberando únicamente el horario de este partido…');
    try{
      const {error}=await supabaseClient.rpc('bp_tournament_schedule_bracket_match2026',{
        p_match_id:match.id,p_start:null,p_duration_minutes:null,p_court_label:null
      });
      if(error)throw error;
      busy=false;await load();
    }catch(err){console.error(err);note(err.message||'No se pudo postergar el partido.',true);}
    finally{busy=false;}
  }

  const el=(tag,cls,content)=>{
    const e=document.createElement(tag);if(cls)e.className=cls;
    if(content!=null)e.textContent=String(content);
    return e;
  };
  const note=(txt,err=false)=>{status.textContent=txt||'';status.classList.toggle('bp26-admin__status--error',err);};
  placementsCancel.addEventListener('click',()=>{if(!busy)placementsDialog.close();});
  placementsDialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  placementsDialog.addEventListener('close',()=>{if(!busy)pendingPlacements=null;});
  placementsAccept.addEventListener('click',async()=>{
    if(busy||!pendingPlacements)return;
    const {tournamentId,placements}=pendingPlacements;
    if(select.value!==tournamentId||data?.bracket?.placements){
      placementsError.textContent='El torneo cambió. Cerrá este mensaje y actualizá los datos.';
      return;
    }
    busy=true;
    placementsCancel.disabled=true;
    placementsAccept.disabled=true;
    placementsError.textContent='';
    note('Confirmando posiciones…');
    try{
      const {error}=await supabaseClient.rpc('bp_tournament_confirm_placements2026',{
        p_tournament_id:tournamentId,p_placements:placements
      });
      if(error)throw error;
      pendingPlacements=null;
      placementsDialog.close();
      note('Posiciones oficiales confirmadas. Ya podés cargar eliminatorias.');
      busy=false;
      await load();
    }catch(err){
      console.error(err);
      const message='No se pudieron confirmar las posiciones: '+(err.message||'revisá la conexión.');
      placementsError.textContent=message;
      note(message,true);
    }finally{
      busy=false;
      placementsCancel.disabled=false;
      placementsAccept.disabled=false;
    }
  });
  const nameOf=id=>data?.pairNames.get(id)||'Pareja sin identificar';
  const letter=i=>String.fromCharCode(64+Number(i));
  const metricSame=(a,b)=>a&&b&&a.points===b.points&&a.setDifference===b.setDifference&&a.gameDifference===b.gameDifference;
  function groupStandings(g){
    const ids=data.assignments.filter(p=>p.group_id===g.id).map(p=>p.pair_id);
    const groupMatches=data.matches.filter(m=>m.group_id===g.id);
    const byResult=new Map(data.results.map(r=>[r.match_id,r]));
    const played=groupMatches.map(m=>{
      const result=byResult.get(m.id);
      return result?{pair1:result.resolved_pair1_id,pair2:result.resolved_pair2_id,sets:result.sets}:null;
    }).filter(Boolean);
    const official=data.bracket?.placements?.[letter(g.group_number)]||null;
    const computed=motor.standings(ids,played,official||[]);
    const origin=computed.rows.map(r=>r.pairId);
    const edited=manual[g.id];
    if(!edited||edited.length!==ids.length||edited.some(x=>!ids.includes(x)))manual[g.id]=origin;
    const order=official||manual[g.id];
    const rowsById=new Map(computed.rows.map(r=>[r.pairId,r]));
    return {ids,played,total:groupMatches.length,computed,official,order,rowsById,
      ready:computed.complete};
  }
  function renderGroups(){
    const wrapper=el('div','bp26-admin__groups');
    wrapper.append(el('h3','bp26-admin__heading','Posiciones de la fase de grupos'));
    let allComplete=data.groups.length>0;
    let pendingDecisions=0;
    let changed=false;
    const payload={};
    for(const g of data.groups){
      const summary=groupStandings(g);
      const section=el('section','bp26-admin__group');
      const head=el('h4','',`Zona ${letter(g.group_number)} · ${summary.ids.length} parejas`);
      section.append(head);
      const table=el('table','bp26-admin__table');
      const thead=el('thead'); const tr=el('tr');
      for(const name of ['Pos.','Pareja','Pts','Dif. sets','Dif. games','Acción'])tr.append(el('th','',name));
      thead.append(tr);table.append(thead);
      const tbody=el('tbody');
      const unresolved=new Set(summary.computed.unresolved.flat());
      const originalUnresolved=summary.computed.unresolved;
      const pairs=summary.order;
      payload[letter(g.group_number)]=pairs;
      for(let i=0;i<pairs.length;i++){
        const id=pairs[i],row=summary.rowsById.get(id);if(!row)continue;
        const tr=el('tr');
        tr.append(el('td','',i+1),el('td','',nameOf(id)),el('td','',row.points),
          el('td','',row.setDifference),el('td','',row.gameDifference));
        const act=el('td','');
        if(!summary.official && unresolved.has(id) && summary.ready){
          const btn=el('button','torneos-outline bp26-admin__reorder','↑ Subir');
          btn.type='button';btn.disabled=busy||i===0||!unresolved.has(pairs[i-1])||
             !metricSame(row,summary.rowsById.get(pairs[i-1]))||
             !originalUnresolved.some(arr=>arr.includes(id)&&arr.includes(pairs[i-1]));
          btn.addEventListener('click',()=>{
            const current=manual[g.id];[current[i],current[i-1]]=[current[i-1],current[i]];
            render();
          });act.append(btn);
        }
        tr.append(act);tbody.append(tr);
      }
      table.append(tbody);const scroll=el('div','bp26-admin__table-scroll');scroll.append(table);section.append(scroll);
      const message=!summary.ready?`Tabla provisoria: ${summary.played.length} de ${summary.total} partidos.`:
        summary.official?'Posiciones oficiales confirmadas.':
          unresolved.size?'Empate: Martín debe revisar el orden antes de confirmar.':'Partidos completos. Orden calculado por el reglamento.';
      section.append(el('p','bp26-admin__hint',message));
      if(!summary.ready)allComplete=false;
      if(summary.ready && !summary.official && unresolved.size)pendingDecisions++;
      if(summary.official)changed=true;
      wrapper.append(section);
    }
    if(allComplete && !data.bracket?.placements){
      const button=el('button','primary bp26-admin__confirm','Confirmar posiciones oficiales');
      button.type='button';button.disabled=busy;
      button.addEventListener('click',()=>{
        if(busy||!data||data.bracket?.placements)return;
        pendingPlacements={
          tournamentId:data.tournament.id,
          placements:Object.fromEntries(Object.entries(payload).map(([zone,ids])=>[zone,[...ids]]))
        };
        placementsReview.replaceChildren();
        for(const [zone,ids] of Object.entries(pendingPlacements.placements)){
          const box=el('div','bp26-placements-dialog__zone');
          box.append(el('strong','',`Zona ${zone}`));
          const ordered=el('ol');
          ids.forEach((id,i)=>{
            const item=el('li','',nameOf(id));
            if(i<2)item.append(el('span','', ' · Clasifica'));
            ordered.append(item);
          });
          box.append(ordered);
          placementsReview.append(box);
        }
        placementsError.textContent='';
        placementsDialog.showModal();
        placementsCancel.focus();
      });
      wrapper.append(button);
      if(pendingDecisions)wrapper.append(el('p','bp26-admin__hint','Revisá cuidadosamente los empates antes de confirmar; las flechas solo permiten cambiar parejas empatadas tras los criterios automáticos.'));
    }
    body.append(wrapper);
  }
  const sourceLabel=src=>/^P\d+$/.test(src)?'Ganador de previa '+src.slice(1):
    /^W:\d+:\d+$/.test(src)?'Ganador del partido '+src.replace(/^W:/,'').replace(':','-'):src;
  function renderBracket(){
    const wrapper=el('div','bp26-admin__knockout');
    wrapper.append(el('h3','bp26-admin__heading','Llave completa de eliminatorias'));
    const matches=data.bracket?.matches||[];
    if(!matches.length){
      wrapper.append(el('p','bp26-admin__hint',data.tournament.fixture_published_at?
        'No se pudo consultar la llave publicada. Revisá que SQL90 esté instalada.':
        'La llave se genera y publica automáticamente junto con el fixture de grupos.'));
      body.append(wrapper);return;
    }
    let stage=-1;
    for(const match of matches){
      if(match.stage!==stage){
        stage=match.stage;
        const len=matches.filter(m=>m.stage===stage).length;
        const title=stage===0?'Ronda previa':len===1?'Final':len===2?'Semifinales':len===4?'Cuartos de final':len===8?'Octavos de final':'Ronda eliminatoria';
        wrapper.append(el('h4','bp26-admin__stage',title));
      }
      const card=el('article','bp26-admin__match');
      const first=match.pair1_name||sourceLabel(match.source1);
      const second=match.pair2_name||sourceLabel(match.source2);
      card.append(el('strong','',`Partido ${stage===0?'P'+match.slot:'R'+stage+'-'+match.slot}`),
        el('div','',first+'  vs.  '+second));
      if(match.status==='played')card.append(el('p','bp26-admin__score','Resultado: '+match.sets.map(x=>x.join('-')).join(' · ')));
      const scheduling=el('div','bp26-admin__schedule');
      if(match.schedule_status==='scheduled' && match.scheduled_at){
        scheduling.append(el('p','bp26-admin__when',
          'Programado: '+new Intl.DateTimeFormat('es-AR',{
            timeZone:'America/Argentina/Cordoba',day:'2-digit',month:'2-digit',year:'numeric',
            hour:'2-digit',minute:'2-digit',hourCycle:'h23'
          }).format(new Date(match.scheduled_at))));
      }else if(match.schedule_status==='postponed'){
        scheduling.append(el('p','bp26-admin__when','Partido postergado'));
      }else scheduling.append(el('p','bp26-admin__when','Horario a definir'));
      if(match.status!=='played'){
        const plan=el('button','torneos-outline',
          match.schedule_status==='scheduled'?'Reprogramar':'Programar');
        plan.type='button';plan.disabled=busy;plan.addEventListener('click',()=>openSchedule(match));
        scheduling.append(plan);
        if(match.schedule_status==='scheduled'){
          const postpone=el('button','torneos-outline','Postergar');
          postpone.type='button';postpone.disabled=busy;
          postpone.addEventListener('click',()=>postponeSchedule(match));
          scheduling.append(postpone);
        }
      }
      card.append(scheduling);
      const score=el('button','torneos-outline',match.status==='played'?'Corregir resultado':'Cargar resultado');
      score.type='button';score.disabled=busy||!match.pair1_id||!match.pair2_id;
      score.addEventListener('click',()=>openScore(match));
      card.append(score);wrapper.append(card);
    }
    const final=matches.find(m=>m.stage===Math.max(...matches.map(x=>x.stage)));
    if(final?.status==='played' && final.winner_pair_id){
      const champ=el('div','bp26-admin__champion');
      champ.append(el('strong','','🏆 Campeones'),el('h3','',nameOf(final.winner_pair_id)));
      const runner=final.pair1_id===final.winner_pair_id?final.pair2_id:final.pair1_id;
      if(runner)champ.append(el('p','','Subcampeones: '+nameOf(runner)));
      wrapper.append(champ);
    }
    body.append(wrapper);
  }
  function render(){
    if(!data)return;
    body.replaceChildren();
    if(data.groups.length&&data.tournament.fixture_published_at)renderGroups();
    renderBracket();
  }
  function openScore(match){
    if(busy||!match.pair1_id||!match.pair2_id)return;
    pendingMatch=match;scoreError.textContent='';
    dialog.querySelector('#bp26-result-teams').textContent=match.pair1_name+'  vs.  '+match.pair2_name;
    const fields=dialog.querySelector('#bp26-score-fields');fields.replaceChildren();
    for(let i=0;i<3;i++){
      const row=el('div','bp26-score-fields__row');
      row.append(el('label','',`Set ${i+1}${i===2?' (si corresponde)':''}`));
      for(let side=0;side<2;side++){
        const input=el('input');input.type='number';input.min='0';input.max='99';input.step='1';
        input.id=`bp26-set-${i}-${side}`;input.setAttribute('aria-label',`Set ${i+1}, pareja ${side+1}`);
        input.value=match.sets?.[i]?.[side]??'';row.append(input);
      }
      fields.append(row);
    }
    dialog.showModal();dialog.querySelector('#bp26-set-0-0').focus();
  }
  async function submitScore(event){
    event.preventDefault();if(!pendingMatch||busy)return;
    const sets=[];for(let i=0;i<3;i++){
      const a=dialog.querySelector(`#bp26-set-${i}-0`).value.trim();
      const b=dialog.querySelector(`#bp26-set-${i}-1`).value.trim();
      if(!a&&!b){if(i<2){scoreError.textContent='Completá los primeros dos sets.';return;}continue;}
      if(!a||!b){scoreError.textContent='Completá ambos marcadores del set.';return;}
      sets.push([Number(a),Number(b)]);
    }
    try{motor.checkScore(sets,'knockout');}catch(e){scoreError.textContent=e.message;return;}
    busy=true;scoreError.textContent='Guardando resultado…';
    try{
      const {error}=await supabaseClient.rpc('bp_tournament_save_bracket_result2026',{
        p_match_id:pendingMatch.id,p_sets:sets
      });
      if(error)throw error;
      pendingMatch=null;dialog.close();note('Resultado registrado correctamente.');busy=false;await load();
    }catch(err){console.error(err);scoreError.textContent=err.message||'No se pudo guardar el resultado.';}
    finally{busy=false;}
  }
  form.addEventListener('submit',submitScore);
  dialog.querySelector('#bp26-score-cancel').addEventListener('click',()=>{if(!busy)dialog.close();});
  async function load(){
    if(busy)return;
    const id=select.value, request=++seq;
    data=null;body.replaceChildren();section.hidden=true;
    if(!id)return;
    try{
      const tr=await supabaseClient.from('bp_tournaments').select(
        'id,format,rules_version,status,fixture_published_at,groups_published_at'
      ).eq('id',id).maybeSingle();
      if(request!==seq||id!==select.value)return;
      if(tr.error)throw tr.error;
      if(tr.data?.format!=='groups_knockout'||Number(tr.data.rules_version)!==2026)return;
      section.hidden=false;note('Cargando clasificación y eliminatorias…');
      const [gr,ar,pa,ma,re,br]=await Promise.all([
        supabaseClient.from('bp_tournament_groups').select('id,group_number').eq('tournament_id',id).order('group_number'),
        supabaseClient.from('bp_tournament_group_pairs').select('group_id,pair_id,created_at').eq('tournament_id',id).order('created_at'),
        supabaseClient.from('bp_tournament_pairs').select('id,player1_name,player2_name').eq('tournament_id',id),
        supabaseClient.from('bp_tournament_group_matches').select('id,group_id').eq('tournament_id',id),
        supabaseClient.from('bp_tournament_match_results').select('match_id,resolved_pair1_id,resolved_pair2_id,sets').eq('tournament_id',id),
        supabaseClient.rpc('bp_tournament_bracket_report2026',{p_tournament_id:id})
      ]);
      if(request!==seq||select.value!==id)return;
      const bad=[gr,ar,pa,ma,re,br].find(x=>x.error);
      if(bad)throw bad.error;
      data={tournament:tr.data,groups:gr.data||[],assignments:ar.data||[],
        matches:ma.data||[],results:re.data||[],bracket:br.data||null,
        pairNames:new Map((pa.data||[]).map(x=>[x.id,x.player1_name+' y '+x.player2_name]))};
      render();note(data.bracket?.published?'Cuadro publicado junto al fixture.':'La llave se publicará junto al fixture de grupos.');
    }catch(err){if(request!==seq)return;console.error(err);section.hidden=false;note('No se pudo cargar el reglamento 2026: '+(err.message||'revisá la conexión.'),true);}
  }
  section.querySelector('#bp26-reload').addEventListener('click',load);
  select.addEventListener('change',load);
  window.addEventListener('bp:fixture-published2026',load);
  window.addEventListener('bp:groups-results-updated',load);
  // El selector se completa de manera asíncrona.
  new MutationObserver(()=>load()).observe(select,{childList:true,subtree:true});
  load();
})();