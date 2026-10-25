/* Boulevard Pádel — Paso 72: sorteo privado y visualización de grupos. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const tournamentSelect = $("torneos-pairs-tournament");
  const countView = $("torneos-pairs-count");
  const context = $("torneos-groups-context");
  const setup = $("torneos-groups-setup");
  const groupCount = $("torneos-groups-count");
  const summary = $("torneos-groups-summary");
  const draw = $("torneos-groups-draw");
  const feedback = $("torneos-groups-feedback");
  const groupList = $("torneos-groups-list");
  /* BVPadel parche 21 - confirmaciones y resorteo de grupos privados. */
  const redraw = document.createElement("button");
  redraw.type = "button";
  redraw.id = "torneos-groups-redraw";
  redraw.className = "torneos-outline";
  redraw.textContent = "🔀 Volver a sortear";
  redraw.hidden = true;
  redraw.disabled = true;
  /* BVPadel parche 24: acciones de grupos lado a lado. */
  const groupActions = document.createElement("div");
  groupActions.className = "torneos-groups-actions";
  groupActions.hidden = true;
  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.className = "torneos-outline torneos-groups-publish";
  publishButton.textContent = "Publicar grupos";
  publishButton.disabled = true;
  /* BVPadel parche 27: publicacion confirmada de grupos. */
  publishButton.title = "Publicar la distribución definitiva de los grupos.";
  groupList.before(groupActions);
  groupActions.append(redraw, publishButton);
  /* BVPadel parche 33: revisiones de grupos y fixture con motivo registrado. */
  const reviseGroupsButton = document.createElement("button");
  reviseGroupsButton.type = "button";
  reviseGroupsButton.className = "torneos-outline torneos-groups-revise";
  reviseGroupsButton.textContent = "Corregir grupos";
  reviseGroupsButton.hidden = true;
  reviseGroupsButton.disabled = true;
  groupActions.append(reviseGroupsButton);

  /* BVPadel parche 29: fixture de grupos, privado y sin programar canchas. */
  const fixturePanel = document.createElement("section");
  fixturePanel.className = "torneos-fixture-panel";
  fixturePanel.hidden = true;
  const fixtureHeader = document.createElement("div");
  fixtureHeader.className = "torneos-fixture-header";
  const fixtureHeading = document.createElement("h3");
  fixtureHeading.textContent = "Fixture de grupos";
  const fixtureButton = document.createElement("button");
  fixtureButton.type = "button";
  fixtureButton.className = "torneos-outline";
  fixtureButton.textContent = "Generar fixture";
  fixtureButton.disabled = true;
  /* BVPadel parche 32: publicacion independiente del fixture. */
  const fixturePublishButton = document.createElement("button");
  fixturePublishButton.type = "button";
  fixturePublishButton.className = "torneos-outline";
  fixturePublishButton.textContent = "Publicar fixture";
  fixturePublishButton.disabled = true;
  fixturePublishButton.hidden = true;
  const reviseFixtureButton = document.createElement("button");
  reviseFixtureButton.type = "button";
  reviseFixtureButton.className = "torneos-outline";
  reviseFixtureButton.textContent = "Corregir fixture";
  reviseFixtureButton.hidden = true;
  reviseFixtureButton.disabled = true;
  fixtureHeader.append(fixtureHeading, fixtureButton, fixturePublishButton, reviseFixtureButton);
  const fixtureSummary = document.createElement("p");
  fixtureSummary.className = "torneos-fixture-summary";
  const fixtureFeedback = document.createElement("p");
  fixtureFeedback.className = "torneos-fixture-feedback";
  fixtureFeedback.setAttribute("role", "status");
  fixtureFeedback.setAttribute("aria-live", "polite");
  const fixtureList = document.createElement("div");
  fixtureList.className = "torneos-fixture-list";
  fixturePanel.append(fixtureHeader, fixtureSummary, fixtureFeedback, fixtureList);
  groupList.after(fixturePanel);
  let fixtureGroupCount = 0;

  // Diálogo propio, aislado de las confirmaciones de Torneos y Parejas.
  const confirmDialog = document.createElement("dialog");
  confirmDialog.id = "torneos-groups-confirm";
  confirmDialog.className = "admin-save-dialog";
  confirmDialog.setAttribute("aria-labelledby", "torneos-groups-confirm-title");
  confirmDialog.setAttribute("aria-describedby", "torneos-groups-confirm-description");
  const confirmBody = document.createElement("div");
  confirmBody.className = "admin-save-dialog__body";
  const confirmTitle = document.createElement("h2");
  confirmTitle.id = "torneos-groups-confirm-title";
  const confirmDescription = document.createElement("p");
  confirmDescription.id = "torneos-groups-confirm-description";
  const confirmActions = document.createElement("div");
  confirmActions.className = "admin-save-dialog__actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "secondary";
  cancelButton.textContent = "Volver";
  const acceptButton = document.createElement("button");
  acceptButton.type = "button";
  acceptButton.className = "primary";
  confirmActions.append(cancelButton, acceptButton);
  confirmBody.append(confirmTitle, confirmDescription, confirmActions);
  confirmDialog.append(confirmBody);
  document.body.append(confirmDialog);
  cancelButton.addEventListener("click", () => confirmDialog.close());

  /* BVPadel parche 25 - cambio manual de grupo con movimiento o intercambio. */
  const changeDialog = document.createElement("dialog");
  changeDialog.id = "torneos-groups-change-dialog";
  changeDialog.className = "admin-save-dialog";
  changeDialog.setAttribute("aria-labelledby", "torneos-groups-change-title");
  changeDialog.innerHTML = `
    <form id="torneos-groups-change-form" class="admin-save-dialog__body torneos-group-change-form">
      <h2 id="torneos-groups-change-title">Cambiar de grupo</h2>
      <p id="torneos-groups-change-description"></p>
      <label class="torneos-group-change-field">Grupo de destino
        <select id="torneos-groups-change-destination" required></select>
      </label>
      <label class="torneos-group-change-field" id="torneos-groups-change-mode-wrap">Operación
        <select id="torneos-groups-change-mode">
          <option value="move">Mover pareja</option>
          <option value="swap">Intercambiar parejas</option>
        </select>
      </label>
      <p id="torneos-groups-change-hint" class="torneos-group-change-hint"></p>
      <label class="torneos-group-change-field" id="torneos-groups-change-swap-wrap">Intercambiar con
        <select id="torneos-groups-change-swap"></select>
      </label>
      <p id="torneos-groups-change-error" class="torneos-group-change-error" role="alert"></p>
      <div class="admin-save-dialog__actions">
        <button id="torneos-groups-change-cancel" type="button" class="secondary">Volver</button>
        <button id="torneos-groups-change-confirm" type="submit" class="primary">Confirmar</button>
      </div>
    </form>`;
  document.body.append(changeDialog);
  const changeForm = $("torneos-groups-change-form");
  const destinationSelect = $("torneos-groups-change-destination");
  const modeSelect = $("torneos-groups-change-mode");
  const modeWrap = $("torneos-groups-change-mode-wrap");
  const swapSelect = $("torneos-groups-change-swap");
  const swapWrap = $("torneos-groups-change-swap-wrap");
  const changeConfirm = $("torneos-groups-change-confirm");
  let changeSelection = null;
  $("torneos-groups-change-cancel").addEventListener("click", () => {
    if (!busy) changeDialog.close();
  });
  changeDialog.addEventListener("close", () => { changeSelection = null; });

  let generation = 0;
  let busy = false;
  let scheduled = false;

  /* BVPadel parche 33: dialogo de revision separado de los sorteos. */
  const revisionDialog = document.createElement("dialog");
  revisionDialog.id = "torneos-revision-dialog";
  revisionDialog.className = "admin-save-dialog";
  revisionDialog.setAttribute("aria-labelledby", "torneos-revision-title");
  revisionDialog.setAttribute("aria-describedby", "torneos-revision-description");
  revisionDialog.innerHTML = `
    <form id="torneos-revision-form" class="admin-save-dialog__body torneos-revision-form">
      <h2 id="torneos-revision-title"></h2>
      <p id="torneos-revision-description"></p>
      <label for="torneos-revision-reason" class="torneos-revision-label">Motivo de la corrección</label>
      <textarea id="torneos-revision-reason" rows="3" minlength="5" maxlength="1000"
        required placeholder="Describí brevemente qué necesitás corregir"></textarea>
      <p class="torneos-revision-help">Obligatorio · entre 5 y 1000 caracteres. Quedará registrado en el historial.</p>
      <p id="torneos-revision-error" role="alert" class="torneos-revision-error"></p>
      <div class="admin-save-dialog__actions">
        <button id="torneos-revision-cancel" type="button" class="secondary">Volver</button>
        <button id="torneos-revision-confirm" type="submit" class="primary" disabled>Iniciar corrección</button>
      </div>
    </form>`;
  document.body.append(revisionDialog);
  const revisionForm = $("torneos-revision-form");
  const revisionReason = $("torneos-revision-reason");
  const revisionConfirm = $("torneos-revision-confirm");
  const revisionError = $("torneos-revision-error");
  let revisionSelection = null;
  revisionReason.addEventListener("input", () => {
    const length = revisionReason.value.trim().length;
    revisionConfirm.disabled = busy || length < 5 || length > 1000;
    revisionError.textContent = "";
  });
  $("torneos-revision-cancel").addEventListener("click", () => {
    if (!busy) revisionDialog.close();
  });
  revisionDialog.addEventListener("close", () => { revisionSelection = null; });

  function openRevision(mode) {
    if (busy || revisionDialog.open || !tournamentSelect.value) return;
    const groupMode = mode === "groups";
    const button = groupMode ? reviseGroupsButton : reviseFixtureButton;
    if (button.hidden || button.disabled) return;
    revisionSelection = { mode, tournamentId: tournamentSelect.value };
    const name = tournamentSelect.selectedOptions[0]?.textContent || "el torneo";
    $("torneos-revision-title").textContent = groupMode ? "Corregir grupos" : "Corregir fixture";
    $("torneos-revision-description").textContent = groupMode
      ? `¿Querés revisar los grupos de «${name}»? Se retirará temporalmente su publicación y la del fixture. Los partidos pendientes serán retirados, pero quedarán registrados para auditoría. Después deberás revisar los grupos, publicar nuevamente y generar otro fixture. Esta operación solo se permite antes del primer partido disputado.`
      : `¿Querés revisar el fixture de «${name}»? Se retirará temporalmente su publicación, pero se conservarán los partidos y los grupos publicados. Antes de volver a publicarlo podrás corregir sus cruces. Esta operación solo se permite antes del primer partido disputado.`;
    revisionReason.value = "";
    revisionError.textContent = "";
    revisionConfirm.disabled = true;
    revisionDialog.showModal();
    revisionReason.focus();
  }

  revisionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !revisionSelection) return;
    const { mode, tournamentId } = revisionSelection;
    const reason = revisionReason.value.trim();
    if (reason.length < 5 || reason.length > 1000) return;
    if (tournamentSelect.value !== tournamentId) {
      revisionError.textContent = "Cambió la competencia seleccionada. Cerrá y abrí nuevamente esta ventana.";
      return;
    }
    busy = true;
    revisionConfirm.disabled = true;
    reviseGroupsButton.disabled = true;
    reviseFixtureButton.disabled = true;
    revisionError.textContent = "";
    try {
      const rpc = mode === "groups"
        ? "bp_tournament_begin_groups_revision"
        : "bp_tournament_begin_fixture_revision";
      const { error } = await supabaseClient.rpc(rpc, {
        p_tournament_id: tournamentId,
        p_reason: reason,
      });
      if (error) throw error;
      revisionDialog.close();
      busy = false;
      if (tournamentSelect.value !== tournamentId) return;
      await refresh();
      if (mode === "groups") {
        notice("Revisión iniciada. Grupos privados; se retiraron los partidos pendientes. Podés reorganizar las parejas y generar un nuevo fixture.", "success");
        setFixtureFeedback("El fixture anterior quedó registrado en el historial. Primero revisá y publicá nuevamente los grupos.");
      } else {
        setFixtureFeedback("Revisión iniciada. Los partidos se conservan, pero el fixture está privado. Revisá los cruces antes de volver a publicarlo.", "success");
      }
    } catch (error) {
      console.error("No se pudo iniciar la corrección", error);
      revisionError.textContent = error.code === "23514"
        ? "La competencia ya comenzó o su estado impide esta corrección. No se modificó nada."
        : (error.message || "No se pudo iniciar la revisión. Verificá el estado del torneo.");
    } finally {
      busy = false;
      revisionConfirm.disabled = false;
    }
  });


  function notice(message = "", kind = "") {
    feedback.textContent = message;
    feedback.classList.toggle("torneos-groups-feedback--error", kind === "error");
    feedback.classList.toggle("torneos-groups-feedback--success", kind === "success");
  }
  function labelForGroup(num) {
    let n = num;
    let label = "";
    while (n > 0) {
      n -= 1;
      label = String.fromCharCode(65 + n % 26) + label;
      n = Math.floor(n / 26);
    }
    return label;
  }
  function reset() {
    setup.hidden = true;
    draw.disabled = true;
    redraw.disabled = true;
    redraw.hidden = true;
    groupActions.hidden = true;
    publishButton.disabled = true;
    reviseGroupsButton.hidden = true;
    reviseGroupsButton.disabled = true;
    fixturePanel.hidden = true;
    fixtureButton.disabled = true;
    fixturePublishButton.disabled = true;
    fixturePublishButton.hidden = true;
    reviseFixtureButton.hidden = true;
    reviseFixtureButton.disabled = true;
    fixtureList.replaceChildren();
    fixtureSummary.textContent = "";
    fixtureFeedback.textContent = "";
    fixtureGroupCount = 0;
    groupCount.replaceChildren();
    groupList.replaceChildren();
    summary.textContent = "";
    context.textContent = "Seleccioná arriba una competencia para administrar sus grupos.";
    notice();
  }
  function validDirectMove(groups, byGroup, sourceId, destinationId) {
    const sizes = groups.map((g) =>
      (byGroup.get(g.id) || []).length
      - Number(g.id === sourceId)
      + Number(g.id === destinationId));
    return Math.min(...sizes) >= 3 && Math.max(...sizes) - Math.min(...sizes) <= 1;
  }
  function refreshChangeOptions() {
    if (!changeSelection) return;
    const { groups, byGroup, pairNames, sourceId } = changeSelection;
    const destId = destinationSelect.value;
    const direct = validDirectMove(groups, byGroup, sourceId, destId);
    modeWrap.hidden = !direct;
    if (!direct) modeSelect.value = "swap";
    const swap = modeSelect.value === "swap";
    swapWrap.hidden = !swap;
    const candidates = (byGroup.get(destId) || [])
      .map((id) => pairNames.get(id))
      .filter((p) => p?.status === "approved");
    swapSelect.replaceChildren(...candidates.map((p) =>
      new Option(`${p.player1_name} / ${p.player2_name}`, p.id)));
    $("torneos-groups-change-hint").textContent = direct
      ? "Este cambio puede hacerse como movimiento o intercambio."
      : "Para conservar el equilibrio y el mínimo de 3 parejas, elegí una pareja del otro grupo para intercambiar.";
    changeConfirm.textContent = swap ? "Intercambiar parejas" : "Mover pareja";
    changeConfirm.disabled = swap && candidates.length === 0;
    $("torneos-groups-change-error").textContent = "";
  }
  function openChange(pair, sourceId, groups, byGroup, pairNames) {
    if (busy || changeDialog.open || groups.length < 2) return;
    changeSelection = {
      tournamentId: tournamentSelect.value,
      pairId: pair.id, sourceId, groups, byGroup, pairNames,
    };
    const from = groups.find((g) => g.id === sourceId);
    $("torneos-groups-change-description").textContent =
      `${pair.player1_name} / ${pair.player2_name} — Grupo ${labelForGroup(from.group_number)}`;
    destinationSelect.replaceChildren(...groups.filter((g) => g.id !== sourceId)
      .map((g) => new Option(`Grupo ${labelForGroup(g.group_number)}`, g.id)));
    modeSelect.value = "move";
    refreshChangeOptions();
    changeDialog.showModal();
    destinationSelect.focus();
  }
  destinationSelect.addEventListener("change", () => {
    modeSelect.value = "move";
    refreshChangeOptions();
  });
  modeSelect.addEventListener("change", refreshChangeOptions);
  changeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !changeSelection) return;
    const id = changeSelection.tournamentId;
    if (tournamentSelect.value !== id) {
      $("torneos-groups-change-error").textContent = "Cambió el torneo seleccionado. Volvé a abrir esta ventana.";
      return;
    }
    const mode = modeSelect.value;
    const args = {
      p_tournament_id: id,
      p_pair_id: changeSelection.pairId,
      p_destination_group_id: destinationSelect.value,
      p_swap_pair_id: mode === "swap" ? swapSelect.value : null,
    };
    if (mode === "swap" && !args.p_swap_pair_id) return;
    busy = true;
    changeConfirm.disabled = true;
    redraw.disabled = true;
    $("torneos-groups-change-error").textContent = "";
    try {
      const { error } = await supabaseClient.rpc("bp_tournament_change_group", args);
      if (error) throw error;
      changeDialog.close();
      busy = false;
      if (tournamentSelect.value === id) {
        await refresh();
        notice(mode === "swap" ? "Parejas intercambiadas correctamente." : "Pareja movida correctamente.", "success");
      }
    } catch (error) {
      console.error("No se pudo cambiar la pareja de grupo", error);
      $("torneos-groups-change-error").textContent = error.code === "23514"
        ? "El movimiento no respeta el mínimo de 3 parejas o el equilibrio de grupos."
        : "No se pudo guardar el cambio. Revisá que las inscripciones sigan cerradas y los grupos continúen privados.";
    } finally {
      busy = false;
      changeConfirm.disabled = false;
    }
  });

  function renderGroups(groups, assignments, pairs, published, canEdit) {
    const pairNames = new Map(pairs.map((p) => [p.id, p]));
    const byGroup = new Map(groups.map((g) => [g.id, []]));
    for (const item of assignments) {
      if (byGroup.has(item.group_id)) byGroup.get(item.group_id).push(item.pair_id);
    }
    for (const group of groups) {
      const card = document.createElement("section");
      card.className = "torneos-group-card";
      const heading = document.createElement("h3");
      heading.textContent = `Grupo ${labelForGroup(group.group_number)}`;
      const sub = document.createElement("span");
      const ids = byGroup.get(group.id);
      sub.textContent = `${ids.length} ${ids.length === 1 ? "pareja" : "parejas"}`;
      heading.append(sub);
      const ul = document.createElement("ul");
      for (const pairId of ids) {
        const pair = pairNames.get(pairId);
        const li = document.createElement("li");
        const pairRow = document.createElement("div");
        pairRow.className = "torneos-group-pair-row";
/* BVPadel parche 26: nombres de parejas en dos lineas. */
        const pairLabel = document.createElement("span");
        pairLabel.className = "torneos-group-pair-label";
        if (pair) {
          const player1 = document.createElement("span");
          player1.className = "torneos-group-pair-player";
          player1.textContent = pair.player1_name;
          const player2 = document.createElement("span");
          player2.className = "torneos-group-pair-player";
          player2.textContent = pair.player2_name;
          pairLabel.append(player1, player2);
          if (pair.status !== "approved") {
            const note = document.createElement("small");
            note.className = "torneos-group-pair-note";
            note.textContent = "Ya no aprobada";
            pairLabel.append(note);
          }
        } else {
          pairLabel.textContent = "Pareja no disponible";
        }
        pairRow.append(pairLabel);
        if (canEdit && pair?.status === "approved") {
          const change = document.createElement("button");
          change.type = "button";
          change.className = "torneos-group-change-button";
          change.textContent = "Cambiar de grupo";
          change.setAttribute("aria-label", `Cambiar de grupo a ${pair.player1_name} y ${pair.player2_name}`);
          change.addEventListener("click", () =>
            openChange(pair, group.id, groups, byGroup, pairNames));
          pairRow.append(change);
        }
        li.append(pairRow);
        ul.append(li);
      }
      card.append(heading, ul);
      groupList.append(card);
    }
    context.textContent = published
      ? "Grupos publicados."
      : "Sorteo guardado de forma privada. Todavía no se publicó.";
    if (!published) notice("Podés reorganizar las parejas antes de publicar los grupos.");
  }
  function setFixtureFeedback(message = "", kind = "") {
    fixtureFeedback.textContent = message;
    fixtureFeedback.classList.toggle("torneos-fixture-feedback--error", kind === "error");
    fixtureFeedback.classList.toggle("torneos-fixture-feedback--success", kind === "success");
  }

  function fixturePairNode(pair) {
    const el = document.createElement("span");
    el.className = "torneos-fixture-pair";
    if (!pair) {
      el.textContent = "Pareja no disponible";
      return el;
    }
    for (const playerName of [pair.player1_name, pair.player2_name]) {
      const line = document.createElement("span");
      line.textContent = playerName;
      el.append(line);
    }
    return el;
  }

  function showFixtureMatches(matches, groups, pairs) {
    fixtureList.replaceChildren();
    const pairById = new Map(pairs.map((pair) => [pair.id, pair]));
    const roundNumbers = [...new Set(matches.map((m) => m.round_number))]
      .sort((a, b) => a - b);
    fixtureSummary.textContent = `${roundNumbers.length} ${roundNumbers.length === 1 ? "jornada" : "jornadas"} · ${matches.length} ${matches.length === 1 ? "partido" : "partidos"}. Sin fechas ni canchas asignadas.`;
    for (const roundNumber of roundNumbers) {
      const round = document.createElement("section");
      round.className = "torneos-fixture-round";
      const heading = document.createElement("h4");
      heading.textContent = `Jornada ${roundNumber}`;
      const grid = document.createElement("div");
      grid.className = "torneos-fixture-round-groups";
      for (const group of groups) {
        const groupMatches = matches.filter((m) =>
          m.round_number === roundNumber && m.group_id === group.id)
          .sort((a, b) => a.match_number - b.match_number);
        if (!groupMatches.length) continue;
        const column = document.createElement("div");
        column.className = "torneos-fixture-group";
        const label = document.createElement("h5");
        label.textContent = `Grupo ${labelForGroup(group.group_number)}`;
        column.append(label);
        for (const match of groupMatches) {
          const row = document.createElement("div");
          row.className = "torneos-fixture-match";
          const versus = document.createElement("span");
          versus.className = "torneos-fixture-versus";
          versus.textContent = "VS";
          row.append(
            fixturePairNode(pairById.get(match.pair1_id)),
            versus,
            fixturePairNode(pairById.get(match.pair2_id))
          );
          column.append(row);
        }
        grid.append(column);
      }
      round.append(heading, grid);
      fixtureList.append(round);
    }
  }

  async function loadFixture(tournamentId, groups, pairs, groupsPublished, fixturePublished, ready, seq) {
    fixturePanel.hidden = !groupsPublished;
    if (!groupsPublished) return;
    fixtureGroupCount = groups.length;
    fixtureSummary.textContent = "Consultando los partidos…";
    const matches = [];
    // Consultar por páginas para no truncar torneos grandes.
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseClient
        .from("bp_tournament_group_matches")
        .select("id,group_id,round_number,match_number,pair1_id,pair2_id,match_status")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true })
        .order("group_id", { ascending: true })
        .order("match_number", { ascending: true })
        .range(from, from + pageSize - 1);
      if (seq !== generation) return;
      if (error) {
        console.error("No se pudo consultar el fixture de grupos", error);
        fixtureSummary.textContent = "No se pudo consultar el fixture.";
        fixtureButton.disabled = true;
        fixturePublishButton.disabled = true;
        fixturePublishButton.hidden = true;
        reviseFixtureButton.hidden = true;
        setFixtureFeedback("Revisá la conexión o los permisos del administrador.", "error");
        return null;
      }
      matches.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    if (seq !== generation) return;
    fixtureButton.disabled = busy || !ready || matches.length > 0;
    fixtureButton.hidden = matches.length > 0;
    fixturePublishButton.hidden = matches.length === 0 && !fixturePublished;
    fixturePublishButton.disabled = busy || !ready || matches.length === 0 || fixturePublished;
    fixturePublishButton.textContent = fixturePublished ? "Fixture publicado" : "Publicar fixture";
    fixturePublishButton.title = fixturePublished
      ? "Los cruces y las jornadas están publicados. Para revisarlos, elegí Corregir fixture."
      : "Publicar los enfrentamientos oficiales, previa confirmación.";
    const hasStarted = matches.some((m) => ["played", "walkover"].includes(m.match_status));
    reviseFixtureButton.hidden = !fixturePublished;
    reviseFixtureButton.disabled = busy || hasStarted || !ready;
    reviseFixtureButton.title = hasStarted
      ? "Bloqueado: el torneo ya tiene un partido disputado."
      : "Retirar temporalmente la publicación para corregir cruces y jornadas.";
    if (matches.length) {
      showFixtureMatches(matches, groups, pairs);
      if (fixturePublished) {
        setFixtureFeedback("Fixture publicado. Los cruces oficiales están protegidos; la visualización pública se incorporará próximamente.", "success");
      } else {
        setFixtureFeedback("Fixture generado y privado. Revisá todos los cruces antes de publicarlo.");
      }
    } else {
      fixtureSummary.textContent = ready
        ? "Los grupos están publicados. Podés generar los cruces de todos contra todos."
        : "El fixture se habilitará cuando los grupos publicados estén completos y las inscripciones permitan generarlo.";
      setFixtureFeedback("Se crearán los enfrentamientos sin fechas, horarios ni reservas de canchas.");
    }
    return { hasStarted };
  }

  async function refresh() {
    const seq = ++generation;
    reset();
    const tournamentId = tournamentSelect.value;
    if (!tournamentId) return;
    context.textContent = "Cargando los datos del torneo…";
    const [tournamentResponse, pairsResponse, groupsResponse] = await Promise.all([
      supabaseClient.from("bp_tournaments")
        .select("id,name,format,status,is_published,groups_published_at,fixture_published_at")
        .eq("id", tournamentId).maybeSingle(),
      supabaseClient.from("bp_tournament_pairs")
        .select("id,player1_name,player2_name,status")
        .eq("tournament_id", tournamentId),
      supabaseClient.from("bp_tournament_groups")
        .select("id,group_number")
        .eq("tournament_id", tournamentId).order("group_number", { ascending: true }),
    ]);
    if (seq !== generation) return;
    const error = tournamentResponse.error || pairsResponse.error || groupsResponse.error;
    if (error) throw error;
    const tournament = tournamentResponse.data;
    const pairs = pairsResponse.data || [];
    const groups = groupsResponse.data || [];
    if (!tournament) {
      context.textContent = "No se encontró el torneo seleccionado.";
      return;
    }
    if (tournament.format === "league") {
      context.textContent = "Modalidad Liga: fixture general y tabla única, sin grupos.";
      return;
    }
    if (tournament.format === "knockout") {
      context.textContent = "Eliminación directa: los cruces se organizarán sin grupos.";
      return;
    }
    if (groups.length) {
      context.textContent = "Cargando grupos…";
      const res = await supabaseClient.from("bp_tournament_group_pairs")
        .select("group_id,pair_id").eq("tournament_id", tournamentId);
      if (seq !== generation) return;
      if (res.error) throw res.error;
      const assignments = res.data || [];
      const published = Boolean(tournament.groups_published_at);
      const approved = pairs.filter((p) => p.status === "approved");
      const assignedIds = new Set(assignments.map((item) => item.pair_id));
      const approvedIds = new Set(approved.map((p) => p.id));
      const groupIds = new Set(groups.map((g) => g.id));
      const complete = assignments.length === approved.length &&
        assignedIds.size === approved.length &&
        assignments.every((item) =>
          approvedIds.has(item.pair_id) && groupIds.has(item.group_id));
      const groupSizes = groups.map((g) =>
        assignments.filter((a) => a.group_id === g.id).length);
      const balanced = Math.min(...groupSizes) >= 3 &&
        Math.max(...groupSizes) - Math.min(...groupSizes) <= 1;
      const eligible = tournament.status === "registration_closed" &&
        !pairs.some((p) => p.status === "pending") &&
        approved.length >= groups.length * 3 && complete && balanced;
      renderGroups(groups, assignments, pairs, published, !published && eligible && groups.length > 1);
      redraw.hidden = false;
      groupActions.hidden = false;
      publishButton.textContent = published ? "Grupos publicados" : "Publicar grupos";
      publishButton.title = published
        ? "Los grupos ya están publicados y no pueden modificarse."
        : eligible
          ? "Publicar los grupos definitivos, previa confirmación."
          : "Para publicar, resolvé las solicitudes pendientes y verificá asignaciones y equilibrio.";
      redraw.disabled = busy || published || !eligible;
      publishButton.disabled = busy || published || !eligible;
      const readyForFixture = published && complete && balanced &&
        !pairs.some((p) => p.status === "pending") &&
        ["registration_closed", "in_progress"].includes(tournament.status);
      const fixtureResult = await loadFixture(tournamentId, groups, pairs, published, Boolean(tournament.fixture_published_at), readyForFixture, seq);
      if (seq !== generation) return;
      reviseGroupsButton.hidden = !published;
      reviseGroupsButton.disabled = busy || fixtureResult === null ||
        tournament.status !== "registration_closed" || Boolean(fixtureResult?.hasStarted);
      reviseGroupsButton.title = fixtureResult?.hasStarted
        ? "Bloqueado: la competencia ya tiene un partido disputado."
        : tournament.status !== "registration_closed"
          ? "Solo disponible con inscripciones cerradas, antes de comenzar el torneo."
          : "Retirar los grupos de la publicación y rehacer el fixture pendiente.";
      if (published) {
        context.textContent = tournament.is_published
          ? "Grupos publicados. Este torneo está visible en el sitio público."
          : "Grupos publicados. El torneo sigue oculto en el sitio público.";
        notice("Grupos publicados. Ya no se pueden mover parejas ni volver a sortear.");
      } else if (!eligible) {
        notice("Revisá las inscripciones, las asignaciones y el equilibrio de los grupos antes de publicarlos o volver a sortear.", "error");
      } else {
        notice("Podés cambiar parejas de grupo o volver a sortear. Los grupos siguen privados.");
      }
      return;
    }
    const approved = pairs.filter((p) => p.status === "approved").length;
    const pending = pairs.filter((p) => p.status === "pending").length;
    context.textContent = `${approved} ${approved === 1 ? "pareja aprobada" : "parejas aprobadas"}.`;
    if (tournament.groups_published_at) {
      notice("Este torneo ya tiene grupos publicados. No se puede volver a sortear.", "error");
      return;
    }
    if (tournament.status !== "registration_closed") {
      notice("Primero cerrá las inscripciones del torneo.");
      return;
    }
    if (pending) {
      notice(`Hay ${pending} ${pending === 1 ? "solicitud pendiente" : "solicitudes pendientes"}. Primero aprobá o rechazá esas parejas.`);
      return;
    }
    if (approved < 3) {
      notice("Necesitás al menos tres parejas aprobadas para formar un grupo.");
      return;
    }
    const maxGroups = Math.floor(approved / 3);
    const recommended = Math.min(maxGroups, Math.max(1, Math.ceil(approved / 4)));
    setup.hidden = false;
    for (let n = 1; n <= maxGroups; n++) {
      groupCount.add(new Option(`${n} ${n === 1 ? "grupo" : "grupos"}`, String(n)));
    }
    groupCount.value = String(recommended);
    updateSummary(approved);
    groupCount.onchange = () => updateSummary(approved);
    draw.disabled = busy;
  }
  function updateSummary(approved) {
    const count = Number(groupCount.value);
    const base = Math.floor(approved / count);
    const extra = approved % count;
    const sizes = Array.from({ length: count }, (_, i) => base + Number(i < extra));
    summary.textContent = `${approved} parejas aprobadas: ${sizes.map((n, i) => `Grupo ${labelForGroup(i + 1)}: ${n}`).join(" · ")}.`;
  }
  function scheduleRefresh() {
    if (scheduled || busy) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      refresh().catch((error) => {
        console.error("Error al consultar grupos", error);
        context.textContent = "No se pudieron cargar los grupos.";
        notice("Revisá tu conexión o permisos e intentá nuevamente.", "error");
      });
    });
  }
  async function runConfirmedSort(mode, id, groups) {
    if (busy || tournamentSelect.value !== id) return;
    busy = true;
    draw.disabled = true;
    redraw.disabled = true;
    notice(mode === "redraw" ? "Volviendo a sortear los grupos…" : "Guardando sorteo privado…");
    try {
      const rpcName = mode === "redraw"
        ? "bp_tournament_redraw_groups"
        : "bp_tournament_draw_groups";
      const args = { p_tournament_id: id };
      if (mode === "draw") args.p_group_count = groups;
      const { error } = await supabaseClient.rpc(rpcName, args);
      if (error) throw error;
      busy = false;
      if (tournamentSelect.value !== id) return;
      await refresh();
      notice(mode === "redraw"
        ? "Nuevo sorteo guardado. Los grupos continúan privados."
        : "Sorteo privado guardado correctamente.", "success");
    } catch (error) {
      console.error("No se pudo ejecutar el sorteo", error);
      busy = false;
      if (tournamentSelect.value === id) {
        try { await refresh(); } catch (reloadError) { console.error(reloadError); }
        notice(error.message || "No se pudo completar el sorteo.", "error");
      }
    } finally {
      busy = false;
    }
  }
  async function runConfirmedPublication(id) {
    if (busy || tournamentSelect.value !== id) return;
    busy = true;
    publishButton.disabled = true;
    redraw.disabled = true;
    notice("Publicando grupos…");
    try {
      const { error } = await supabaseClient.rpc("bp_tournament_publish_groups", {
        p_tournament_id: id,
      });
      if (error) throw error;
      busy = false;
      if (tournamentSelect.value !== id) return;
      await refresh();
      notice("Grupos publicados correctamente. La visibilidad del torneo no cambió.", "success");
    } catch (error) {
      console.error("No se pudieron publicar los grupos", error);
      busy = false;
      if (tournamentSelect.value === id) {
        try { await refresh(); } catch (reloadError) { console.error(reloadError); }
        notice("No pudimos publicar los grupos. Comprobá que las inscripciones sigan cerradas y la distribución esté completa y equilibrada.", "error");
      }
    } finally {
      busy = false;
    }
  }

  async function runConfirmedFixture(id) {
    if (busy || tournamentSelect.value !== id) return;
    busy = true;
    fixtureButton.disabled = true;
    setFixtureFeedback("Generando los partidos de cada grupo…");
    try {
      const { error } = await supabaseClient.rpc("bp_tournament_generate_group_fixture", {
        p_tournament_id: id,
      });
      if (error) throw error;
      busy = false;
      if (tournamentSelect.value !== id) return;
      await refresh();
      setFixtureFeedback("Fixture generado correctamente. Los partidos siguen privados y sin horarios asignados.", "success");
    } catch (error) {
      console.error("No se pudo generar el fixture de grupos", error);
      busy = false;
      if (tournamentSelect.value === id) {
        try { await refresh(); } catch (reloadError) { console.error(reloadError); }
        setFixtureFeedback("No se pudo generar el fixture. Revisá que los grupos sigan completos y no existan partidos previos.", "error");
      }
    } finally {
      busy = false;
    }
  }

  async function runConfirmedFixturePublication(id) {
    if (busy || tournamentSelect.value !== id) return;
    busy = true;
    fixturePublishButton.disabled = true;
    setFixtureFeedback("Publicando fixture…");
    try {
      const { error } = await supabaseClient.rpc("bp_tournament_publish_group_fixture", {
        p_tournament_id: id,
      });
      if (error) throw error;
      busy = false;
      if (tournamentSelect.value !== id) return;
      await refresh();
      setFixtureFeedback("Fixture publicado correctamente. El torneo mantiene su visibilidad actual; todavía no se muestra el fixture en el sitio público.", "success");
    } catch (error) {
      console.error("No se pudo publicar el fixture", error);
      busy = false;
      if (tournamentSelect.value === id) {
        try { await refresh(); } catch (reloadError) { console.error(reloadError); }
        setFixtureFeedback("No pudimos publicar el fixture. Revisá que todos los partidos estén completos, correctamente organizados y que los grupos sigan publicados.", "error");
      }
    } finally {
      busy = false;
    }
  }

  function askForConfirmation(mode) {
    if (busy || !tournamentSelect.value) return;
    if (mode === "draw" && (draw.disabled || !groupCount.value)) return;
    if (mode === "redraw" && (redraw.disabled || redraw.hidden)) return;
    if (mode === "publish" && (publishButton.disabled || groupActions.hidden)) return;
    if (mode === "fixture" && (fixtureButton.disabled || fixturePanel.hidden)) return;
    if (mode === "fixture-publish" && (fixturePublishButton.disabled || fixturePublishButton.hidden || fixturePanel.hidden)) return;
    const id = tournamentSelect.value;
    const groups = mode === "draw" ? Number(groupCount.value) : null;
    const tournamentName = tournamentSelect.selectedOptions[0]?.textContent || "el torneo";
    if (mode === "fixture-publish") {
      confirmTitle.textContent = "Publicar fixture de grupos";
      confirmDescription.textContent = `¿Publicar el fixture de «${tournamentName}»? Esta decisión fija definitivamente las parejas, los cruces y las jornadas; no podrás reorganizarlos después. No se asignan fechas, horarios ni canchas y NO cambia si el torneo está visible u oculto en el sitio público.`;
      acceptButton.textContent = "Sí, publicar fixture";
    } else if (mode === "fixture") {
      confirmTitle.textContent = "Generar fixture de grupos";
      confirmDescription.textContent = `¿Generar el fixture de «${tournamentName}» para ${fixtureGroupCount} ${fixtureGroupCount === 1 ? "grupo" : "grupos"}? Cada pareja enfrentará una sola vez a las demás de su grupo. No se asignarán fechas, horarios ni canchas, ni se crearán reservas. Los partidos permanecerán privados por ahora.`;
      acceptButton.textContent = "Sí, generar fixture";
    } else if (mode === "publish") {
      confirmTitle.textContent = "Publicar grupos";
      confirmDescription.textContent = `¿Publicar los grupos de «${tournamentName}»? Una vez publicados, no podrás volver a sortear ni mover parejas de grupo. La publicación de grupos NO cambia si el torneo está visible u oculto en el sitio público.`;
      acceptButton.textContent = "Sí, publicar grupos";
    } else if (mode === "redraw") {
      confirmTitle.textContent = "Volver a sortear grupos";
      confirmDescription.textContent = `¿Querés volver a sortear los grupos de «${tournamentName}»? La distribución actual será reemplazada, incluidos los movimientos manuales que hayas realizado. Los grupos seguirán privados.`;
      acceptButton.textContent = "Confirmar nuevo sorteo";
    } else {
      confirmTitle.textContent = "Confirmar sorteo de grupos";
      confirmDescription.textContent = `¿Sortear ${groups} ${groups === 1 ? "grupo" : "grupos"} para «${tournamentName}»? Se utilizarán solamente las parejas aprobadas. Podrás revisar el resultado antes de publicarlo.`;
      acceptButton.textContent = "Confirmar sorteo";
    }
    acceptButton.onclick = () => {
      confirmDialog.close();
      if (mode === "publish") runConfirmedPublication(id);
      else if (mode === "fixture") runConfirmedFixture(id);
      else if (mode === "fixture-publish") runConfirmedFixturePublication(id);
      else runConfirmedSort(mode, id, groups);
    };
    confirmDialog.showModal();
    cancelButton.focus();
  }
  draw.addEventListener("click", () => askForConfirmation("draw"));
  redraw.addEventListener("click", () => askForConfirmation("redraw"));
  publishButton.addEventListener("click", () => askForConfirmation("publish"));
  fixtureButton.addEventListener("click", () => askForConfirmation("fixture"));
  fixturePublishButton.addEventListener("click", () => askForConfirmation("fixture-publish"));
  reviseGroupsButton.addEventListener("click", () => openRevision("groups"));
  reviseFixtureButton.addEventListener("click", () => openRevision("fixture"));
  tournamentSelect.addEventListener("change", scheduleRefresh);
  // El selector y la lista de parejas se actualizan desde admin-parejas.js.
  // Esto mantiene los datos del sorteo al día sin duplicar la selección.
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(tournamentSelect, { childList: true });
  observer.observe(countView, { childList: true });
  scheduleRefresh();
})();
