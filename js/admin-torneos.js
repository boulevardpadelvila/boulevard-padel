/* Boulevard Pádel — gestión inicial de torneos. Independiente de reservas y disponibilidad. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const feedback = (message) => {
    const notice = $("torneo-feedback");
    notice.textContent = message;
    // Los estilos son exclusivos: error rojo, exito verde o aviso informativo azul.
    const duplicate =
      message ===
      "Ya existe un torneo con ese nombre. Elegí otro para identificar correctamente esta competencia.";
    const successMessages = new Set([
      "Cambios guardados correctamente.",
      "Torneo creado correctamente. Sigue oculto al público.",
      "Torneo eliminado correctamente.",
      "Torneo eliminado definitivamente.",
      "Torneo finalizado correctamente.",
      "Torneo publicado.",
      "Torneo ocultado.",
      "Inscripciones cerradas correctamente.",
      "Inscripciones abiertas. La visibilidad pública se conserva.",
      "Categoría creada correctamente.",
      "Categoría actualizada correctamente.",
      "Categoría eliminada correctamente.",
      "Categoría restaurada correctamente.",
      "Categoría eliminada de las opciones. Los torneos existentes se conservan.",
    ]);
    const success = !duplicate && successMessages.has(message);
    const informative =
      !duplicate &&
      !success &&
      ((message.startsWith("Editando «") && message.endsWith("».")) ||
        message === "Edición cancelada." ||
        message === "Guardando torneo…" ||
        message.startsWith("Cupo completo:") ||
        message ===
          "No se pudo verificar el cupo. Actualizá la vista e intentá nuevamente.");
    notice.classList.toggle("torneo-feedback--duplicate", duplicate);
    notice.classList.toggle("torneo-feedback--success", success);
    notice.classList.toggle("torneo-feedback--info", informative);
  };
  const names = {
    league: "Liga · Todos contra todos",
    groups_knockout: "Grupos + eliminatorias",
    knockout: "Eliminación directa",
  };
  const states = {
    draft: "Borrador",
    registration_open: "Inscripciones abiertas",
    registration_closed: "Inscripciones cerradas",
    in_progress: "En juego",
    completed: "Finalizado",
  };
  // Reglas de fechas en el huso argentino, independientemente del navegador.
  function localToday() {
    const values = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
  // BVPadel parche 42: fin estimado no finaliza automaticamente.
  function isFinished(t) {
    return t.status === "completed";
  }
  function registrationOpen(t) {
    return (
      t.status === "registration_open" &&
      !isFinished(t) &&
      (!t.registration_closes_at ||
        Date.now() < Date.parse(t.registration_closes_at))
    );
  }
  function closingDateInArgentina(iso) {
    if (!iso) return "";
    const values = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date(iso))
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
  // La Liga tiene inicio estimado y duración abierta, sin fin obligatorio.
  const formatField = $("torneo-format");
  const startField = $("torneo-start");
  const endField = $("torneo-end");
  const endWrap = endField.closest(".torneos-field");
  const startLabel = startField.closest(".torneos-field").querySelector("label");
  function syncTournamentDates() {
    const league = formatField.value === "league";
    endWrap.hidden = league;
    startLabel.textContent = league ? "Fecha estimada de inicio" : "Fecha de inicio";
    if (league) endField.value = "";
  }
  formatField.addEventListener("change", syncTournamentDates);
  syncTournamentDates();

  let busy = false,
    editing = null,
    records = [],
    modalAction = null;
  let pendingNextModal = null;
  const modal = $("torneo-dialog");
  async function adminSession() {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();
    if (error || !user) throw new Error("Ingresá como administrador.");
    const result = await supabaseClient
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .maybeSingle();
    if (
      result.error ||
      result.data?.role !== "admin" ||
      result.data?.active !== true
    )
      throw new Error("Sin permisos de administrador.");
  }
  function openModal({
    title,
    description,
    label = "",
    value = "",
    confirm = "Aceptar",
    danger = false,
    inputType = "text",
    inputMin = "",
    inputMax = "",
    action,
  }) {
    $("torneo-dialog-title").textContent = title;
    $("torneo-dialog-description").textContent = description;
    const field = $("torneo-dialog-field");
    field.hidden = !label;
    $("torneo-dialog-label").textContent = label;
    const modalInput = $("torneo-dialog-input");
    modalInput.type = inputType;
    modalInput.min = inputMin;
    modalInput.max = inputMax;
    modalInput.value = value;
    $("torneo-dialog-message").textContent = "";
    $("torneo-dialog-accept").textContent = confirm;
    $("torneo-dialog-accept").classList.toggle("torneo-danger", danger);
    modalAction = action;
    modal.showModal();
    if (label) $("torneo-dialog-input").focus();
    else $("torneo-dialog-accept").focus();
  }
  function closeModal() {
    modal.close();
    modalAction = null;
  }
  $("torneo-dialog-cancel").addEventListener("click", closeModal);
  modal.addEventListener("close", () => {
    modalAction = null;
    if (pendingNextModal) {
      const next = pendingNextModal;
      pendingNextModal = null;
      openModal(next);
    }
  });
  $("torneo-dialog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !modalAction) return;
    busy = true;
    $("torneo-dialog-accept").disabled = true;
    try {
      const outcome = await modalAction($("torneo-dialog-input").value.trim());
      if (outcome?.nextModal) pendingNextModal = outcome.nextModal;
      closeModal();
    } catch (err) {
      console.error(err);
      $("torneo-dialog-message").textContent =
        err.message || "No se pudo completar la operación.";
    } finally {
      busy = false;
      $("torneo-dialog-accept").disabled = false;
    }
  });
  function ensureEditingRetiredCategory(t) {
    if (!t?.category_id) return;
    const select = $("torneo-category");
    if ([...select.options].some((option) => option.value === t.category_id))
      return;
    // Se muestra solo al editar el torneo que ya la utiliza, nunca en el alta.
    const name = t.bp_tournament_categories?.name || "Categoría histórica";
    const option = new Option(`${name} (histórica)`, t.category_id);
    option.dataset.retiredCategory = "true";
    select.add(option);
  }

  async function loadCategories(selected = "") {
    const { data, error } = await supabaseClient
      .from("bp_tournament_categories")
      .select("id,name")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    const select = $("torneo-category");
    select.replaceChildren(new Option("Seleccionar categoría", ""));
    for (const c of data || []) select.add(new Option(c.name, c.id));
    if (editing)
      ensureEditingRetiredCategory(records.find((t) => t.id === editing));
    if (selected) select.value = selected;
  }
  /* BVPadel: administrar categorias - parche 02 */
  const categoryPanel = $("torneo-categories-panel");
  const categoryManageButton = $("torneo-manage-categories");
  let showEliminatedCategories = false;

  function categoryInfo(message, className = "") {
    const element = document.createElement("p");
    element.className = className;
    element.textContent = message;
    return element;
  }

  async function refreshCategoryViews(selectedCategory = null) {
    const selected =
      selectedCategory === null ? $("torneo-category").value : selectedCategory;
    await loadCategories(selected);
    await loadTournaments();
    if (!categoryPanel.hidden) await loadCategoryManagement();
  }

  function editCategory(category) {
    openModal({
      title: "Editar categoría",
      description: `Corregí el nombre de «${category.name}». Los torneos relacionados conservarán su categoría.`,
      label: "Nombre de la categoría",
      value: category.name,
      confirm: "Guardar cambios",
      action: async (input) => {
        const name = input.trim().replace(/\s+/g, " ");
        if (name.length < 2 || name.length > 80)
          throw new Error("Ingresá entre 2 y 80 caracteres.");
        if (name === category.name) return;
        await adminSession();
        const { data, error } = await supabaseClient
          .from("bp_tournament_categories")
          .update({ name })
          .eq("id", category.id)
          .select("id");
        if (error?.code === "23505")
          throw new Error("Ya existe una categoría con ese nombre.");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo editar la categoría. Actualizá e intentá nuevamente.",
          );
        await refreshCategoryViews();
        feedback("Categoría actualizada correctamente.");
      },
    });
  }

  function deleteCategory(category) {
    const hasTournaments = category.tournamentsCount > 0;
    openModal({
      title: "Eliminar categoría",
      description: hasTournaments
        ? `¿Eliminar «${category.name}» de las opciones disponibles? Los torneos existentes conservarán sus datos y resultados.`
        : `¿Eliminar definitivamente «${category.name}»? No tiene torneos asociados. Esta acción no se puede deshacer.`,
      confirm: "Eliminar categoría",
      danger: true,
      action: async () => {
        await adminSession();
        let preservedHistory = hasTournaments;
        if (!hasTournaments) {
          // ON DELETE RESTRICT evita perder datos si aparecio un torneo en paralelo.
          const { data, error } = await supabaseClient
            .from("bp_tournament_categories")
            .delete()
            .eq("id", category.id)
            .select("id");
          if (error?.code === "23503") {
            // El uso cambio desde que se mostro la lista: conservar el historial.
            preservedHistory = true;
          } else if (error || data?.length !== 1) {
            throw new Error(
              "No se pudo eliminar la categoría. Actualizá e intentá nuevamente.",
            );
          }
        }
        if (preservedHistory) {
          const { data, error } = await supabaseClient
            .from("bp_tournament_categories")
            .update({ active: false })
            .eq("id", category.id)
            .eq("active", true)
            .select("id");
          if (error || data?.length !== 1)
            throw new Error(
              "No se pudo eliminar la categoría de las opciones. Actualizá e intentá nuevamente.",
            );
        }
        const selected =
          $("torneo-category").value === category.id
            ? ""
            : $("torneo-category").value;
        await refreshCategoryViews(selected);
        feedback(
          preservedHistory
            ? "Categoría eliminada de las opciones. Los torneos existentes se conservan."
            : "Categoría eliminada correctamente.",
        );
      },
    });
  }

  function restoreCategory(category) {
    openModal({
      title: "Restaurar categoría",
      description: `«${category.name}» volverá a estar disponible para nuevos torneos.`,
      confirm: "Restaurar categoría",
      action: async () => {
        await adminSession();
        const { data, error } = await supabaseClient
          .from("bp_tournament_categories")
          .update({ active: true })
          .eq("id", category.id)
          .eq("active", false)
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo restaurar la categoría. Actualizá e intentá nuevamente.",
          );
        await refreshCategoryViews();
        feedback("Categoría restaurada correctamente.");
      },
    });
  }

  async function loadCategoryManagement() {
    const list = $("torneo-categories-list");
    list.replaceChildren(categoryInfo("Cargando categorías…"));
    try {
      await adminSession();
      const { data, error } = await supabaseClient
        .from("bp_tournament_categories")
        .select("id,name,active")
        .order("name");
      if (error) throw error;
      const categories = await Promise.all(
        (data || []).map(async (category) => {
          const result = await supabaseClient
            .from("bp_tournaments")
            .select("id", { count: "exact", head: true })
            .eq("category_id", category.id);
          if (result.error || !Number.isInteger(result.count))
            throw (
              result.error ||
              new Error("No se pudo verificar el uso de una categoría.")
            );
          return { ...category, tournamentsCount: result.count };
        }),
      );
      const active = categories.filter((category) => category.active);
      const inactive = categories.filter((category) => !category.active);
      list.replaceChildren();

      function appendCategory(category) {
        const row = document.createElement("div");
        row.className = "torneo-category-item";
        const detail = document.createElement("div");
        detail.className = "torneo-category-item__detail";
        const title = document.createElement("strong");
        title.textContent = category.name;
        const meta = categoryInfo(
          `${category.active ? "Disponible" : "Eliminada de las opciones"} · ${
            category.tournamentsCount === 0
              ? "Sin torneos asociados"
              : `${category.tournamentsCount} torneo(s) asociado(s)`
          }`,
          "torneo-category-item__meta",
        );
        detail.append(title, meta);
        const controls = document.createElement("div");
        controls.className = "torneo-category-item__actions";
        if (category.active) {
          controls.append(action("Editar", () => editCategory(category)));
          controls.append(
            action(
              "Eliminar",
              () => deleteCategory(category),
              "torneos-entry__button--danger",
            ),
          );
        } else {
          controls.append(action("Restaurar", () => restoreCategory(category)));
        }
        row.append(detail, controls);
        list.append(row);
      }

      if (!active.length) {
        list.append(
          categoryInfo(
            "Aún no hay categorías disponibles.",
            "torneo-categories-empty",
          ),
        );
      }
      for (const category of active) appendCategory(category);

      if (inactive.length) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "torneo-category-toggle";
        toggle.textContent = showEliminatedCategories
          ? "Ocultar eliminadas"
          : `Ver eliminadas (${inactive.length})`;
        toggle.setAttribute("aria-expanded", String(showEliminatedCategories));
        toggle.addEventListener("click", () => {
          showEliminatedCategories = !showEliminatedCategories;
          loadCategoryManagement();
        });
        list.append(toggle);
        if (showEliminatedCategories) {
          for (const category of inactive) appendCategory(category);
        }
      }
    } catch (error) {
      console.error(error);
      list.replaceChildren(
        categoryInfo(
          "No se pudieron consultar las categorías. Verificá la sesión y volvé a abrir este panel.",
          "torneo-category-item__error",
        ),
      );
    }
  }

  categoryManageButton.addEventListener("click", async () => {
    const open = categoryPanel.hidden;
    categoryPanel.hidden = !open;
    categoryManageButton.setAttribute("aria-expanded", String(open));
    if (open) await loadCategoryManagement();
  });

  const date = (iso) =>
    iso ? iso.split("-").reverse().join("/") : "Sin fecha";
  function action(label, fn, style = "") {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.className = "torneos-entry__button " + style;
    b.addEventListener("click", fn);
    return b;
  }
  async function loadTournaments() {
    const { data, error } = await supabaseClient
      .from("bp_tournaments")
      .select(
        "id,name,category_id,format,status,is_published,starts_on,ends_on,max_pairs,registration_closes_at,bp_tournament_categories(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    records = data || [];
    $("torneos-count").textContent = String(records.length);
    const box = $("torneos-list");
    box.replaceChildren();
    if (!records.length) {
      const p = document.createElement("p");
      p.textContent = "Todavía no hay torneos creados.";
      box.append(p);
      return;
    }
    // El título está en el encabezado del panel; la grilla contiene solo tarjetas.
    for (const t of records) {
      const card = document.createElement("div");
      card.className = "torneos-entry";
      const title = document.createElement("strong");
      title.textContent = t.name;
      const meta = document.createElement("p");
      meta.textContent = `${t.bp_tournament_categories?.name || "Sin categoría"} · ${names[t.format] || t.format} · ${t.format === "league"
        ? "Inicio estimado: " + date(t.starts_on) + " · Sin fecha de finalización"
        : date(t.starts_on) + " a " + date(t.ends_on) + " (fin estimado)"} · ${isFinished(t) ? "Finalizado" : t.status === "registration_open" && !registrationOpen(t) ? "Inscripciones cerradas por fecha" : states[t.status] || t.status} · ${t.is_published ? "Publicado" : "Oculto"}`;
      const actions = document.createElement("div");
      actions.className = "torneos-entry__actions";
      actions.append(
        action("Editar", () => edit(t)),
        action(t.is_published ? "Ocultar" : "Publicar", () =>
          togglePublication(t),
        ),
      );
      if (
        !isFinished(t) &&
        ["draft", "registration_open", "registration_closed"].includes(t.status)
      ) {
        actions.append(
          action(
            registrationOpen(t)
              ? "Cerrar inscripciones"
              : "Abrir inscripciones",
            () => toggleRegistration(t),
          ),
        );
      }
      // Parche 50: torneo cargado manualmente. Permitir cerrar desde borrador
      // sin abrir las inscripciones ni publicar automáticamente el torneo.
      if (t.status === "draft") {
        actions.append(
          action("Cerrar inscripciones", () => closeDraftRegistrations(t)),
        );
      }
      if (!isFinished(t)) {
        actions.append(action("Finalizar", () => finalizeTournament(t)));
      }
      // Respaldo informativo: genera una vista A4 imprimible para guardar
      // como PDF y subir al Drive de Boulevard Pádel. Nunca modifica el torneo.
      actions.append(
        action("PDF del torneo", () => {
          if (!window.BPAdminBackup?.exportTournament) {
            feedback("No se cargó el generador de PDF. Actualizá la página.");
            return;
          }
          window.BPAdminBackup.exportTournament(t);
        }),
      );
      actions.append(
        action("Eliminar", () => remove(t), "torneos-entry__button--danger"),
      );
      card.append(title, meta, actions);
      box.append(card);
    }
  }
  function setPairs(n) {
    const select = $("torneo-pairs");
    if (["8", "12", "16"].includes(String(n))) {
      select.value = String(n);
      $("torneo-pairs-custom").hidden = true;
    } else {
      select.value = "custom";
      $("torneo-pairs-custom").hidden = false;
      $("torneo-pairs-custom").value = String(n || 8);
    }
  }
  function resetForm() {
    editing = null;
    $("torneo-create-title").textContent = "Nuevo torneo";
    $("torneo-create-button").textContent = "Crear torneo";
    $("torneo-edit-cancel").hidden = true;
    $("torneo-name").value = "";
    $("torneo-category").value = "";
    [...$("torneo-category").options]
      .filter((option) => option.dataset.retiredCategory === "true")
      .forEach((option) => option.remove());
    $("torneo-format").value = "groups_knockout";
    $("torneo-start").value = "";
    $("torneo-end").value = "";
    syncTournamentDates();
    const stateSelect = $("torneo-state");
    stateSelect
      .querySelectorAll('option[data-temporary-torneo-state="true"]')
      .forEach((option) => option.remove());
    stateSelect.value = "draft";
    setPairs(12);
  }
  function edit(t) {
    editing = t.id;
    $("torneo-create-title").textContent = "Editar torneo";
    $("torneo-create-button").textContent = "Guardar cambios";
    $("torneo-edit-cancel").hidden = false;
    $("torneo-name").value = t.name;
    ensureEditingRetiredCategory(t);
    $("torneo-category").value = t.category_id;
    $("torneo-format").value = t.format;
    $("torneo-start").value = t.starts_on;
    $("torneo-end").value = t.ends_on || "";
    syncTournamentDates();
    const stateSelect = $("torneo-state");
    stateSelect
      .querySelectorAll('option[data-temporary-torneo-state="true"]')
      .forEach((option) => option.remove());
    if (![...stateSelect.options].some((option) => option.value === t.status)) {
      const option = new Option(states[t.status] || t.status, t.status);
      option.dataset.temporaryTorneoState = "true";
      stateSelect.add(option);
    }
    stateSelect.value = t.status;
    setPairs(t.max_pairs);
    feedback(`Editando «${t.name}».`);
    $("torneo-name").focus();
    $("torneo-create-title").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  $("torneo-edit-cancel").addEventListener("click", () => {
    resetForm();
    feedback("Edición cancelada.");
  });
  $("torneo-pairs").addEventListener("change", () => {
    $("torneo-pairs-custom").hidden = $("torneo-pairs").value !== "custom";
  });
  async function refresh() {
    await adminSession();
    await Promise.all([loadCategories(), loadTournaments()]);
    feedback("");
  }
  $("admin-tab-torneos").addEventListener("click", () =>
    refresh().catch((e) => {
      console.error(e);
      feedback(
        "No se pudieron cargar torneos y categorías. Revisá la sesión y los permisos.",
      );
    }),
  );
  $("torneo-add-category").addEventListener("click", () =>
    openModal({
      title: "Nueva categoría",
      description: "La categoría estará disponible para futuros torneos.",
      label: "Nombre de la categoría",
      confirm: "Guardar categoría",
      action: async (name) => {
        if (name.length < 2 || name.length > 80)
          throw new Error("Ingresá entre 2 y 80 caracteres.");
        await adminSession();
        const { data, error } = await supabaseClient
          .from("bp_tournament_categories")
          .insert({ name })
          .select("id")
          .single();
        if (error)
          throw new Error(
            "No se pudo guardar. Verificá que no exista otra con el mismo nombre.",
          );
        await loadCategories(data.id);
        if (!categoryPanel.hidden) await loadCategoryManagement();
        feedback("Categoría creada correctamente.");
      },
    }),
  );
  async function togglePublication(t) {
    // Modo de pruebas: visibilidad pública e inscripciones son independientes.
    openModal({
      title: t.is_published ? "Ocultar torneo" : "Publicar torneo",
      description: t.is_published
        ? `«${t.name}» dejará de estar visible para visitantes. Se conservan todos sus datos.`
        : `¿Publicar «${t.name}»? Será visible cuando esté disponible la sección pública de torneos. El formulario de inscripción pública todavía no está conectado.`,
      confirm: t.is_published ? "Ocultar" : "Publicar",
      action: async () => {
        await adminSession();
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .update({
            is_published: !t.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id)
          .select("id");
        if (error || data?.length !== 1)
          throw new Error("No se pudo cambiar la visibilidad.");
        await loadTournaments();
        feedback(t.is_published ? "Torneo ocultado." : "Torneo publicado.");
      },
    });
  }
  // Parche 50: cerrar un borrador con parejas cargadas por el Admin.
  // No abre inscripciones ni cambia la visibilidad pública del torneo.
  function closeDraftRegistrations(t) {
    if (t.status !== "draft") {
      feedback("El torneo cambió de estado. Actualizá la lista.");
      return;
    }
    openModal({
      title: "Cerrar inscripciones",
      description:
        `¿Cerrar las inscripciones de «${t.name}» para comenzar a organizar los grupos? ` +
        "Se utilizarán las parejas aprobadas. No se abrirá la inscripción pública " +
        `y el torneo seguirá ${t.is_published ? "publicado" : "oculto"}.`,
      confirm: "Cerrar inscripciones",
      action: async () => {
        await adminSession();
        const [approvedResult, pendingResult] = await Promise.all([
          supabaseClient
            .from("bp_tournament_pairs")
            .select("id", { count: "exact", head: true })
            .eq("tournament_id", t.id)
            .eq("status", "approved"),
          supabaseClient
            .from("bp_tournament_pairs")
            .select("id", { count: "exact", head: true })
            .eq("tournament_id", t.id)
            .eq("status", "pending"),
        ]);
        if (
          approvedResult.error ||
          pendingResult.error ||
          approvedResult.count == null ||
          pendingResult.count == null
        )
          throw new Error(
            "No se pudieron comprobar las parejas. Actualizá la vista.",
          );
        if (pendingResult.count > 0)
          throw new Error(
            "Primero aprobá o rechazá las inscripciones pendientes.",
          );
        if (approvedResult.count < 3)
          throw new Error(
            "Se necesitan al menos tres parejas aprobadas para formar grupos.",
          );
        const now = new Date().toISOString();
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .update({
            status: "registration_closed",
            registration_closes_at: now,
            updated_at: now,
          })
          .eq("id", t.id)
          .eq("status", "draft")
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudieron cerrar las inscripciones. Actualizá la vista e intentá nuevamente.",
          );
        await loadTournaments();
        feedback(
          "Inscripciones cerradas. Ahora podés organizar los grupos sin publicar el torneo.",
        );
      },
    });
  }

  /* BVPadel parche 18 - aviso de cupo antes de abrir */
  async function toggleRegistration(t) {
    if (isFinished(t)) {
      feedback(
        "No se pueden modificar las inscripciones de un torneo finalizado.",
      );
      return;
    }
    const opening = !registrationOpen(t);
    // Antes de mostrar el formulario, comprobar cuántas plazas están ocupadas.
    // La protección definitiva sigue siendo el trigger de Supabase.
    if (opening && t.max_pairs != null) {
      try {
        await adminSession();
        const { count, error } = await supabaseClient
          .from("bp_tournament_pairs")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", t.id)
          .in("status", ["pending", "approved"]);
        if (error || count == null) throw error || new Error("Sin contador");
        if (count >= t.max_pairs) {
          feedback(
            `Cupo completo: ${count} de ${t.max_pairs} parejas. Liberá un lugar o ampliá el cupo para abrir inscripciones.`,
          );
          return;
        }
      } catch (err) {
        console.error("No se pudo comprobar el cupo", err);
        feedback(
          "No se pudo verificar el cupo. Actualizá la vista e intentá nuevamente.",
        );
        return;
      }
    }
    openModal({
      title: opening ? "Abrir inscripciones" : "Cerrar inscripciones",
      description: opening
        ? `«${t.name}» abrirá inscripciones y seguirá ${t.is_published ? "publicado" : "oculto"}. Podés elegir una fecha límite de cierre (inclusive) o dejarla vacía para cerrar manualmente. Hora argentina.`
        : `¿Cerrar ahora las inscripciones de «${t.name}»? El torneo seguirá ${t.is_published ? "publicado" : "oculto"} y no estará finalizado.`,
      label: opening ? "Fecha de cierre (opcional)" : "",
      inputType: opening ? "date" : "text",
      inputMin: opening ? localToday() : "",
      inputMax: opening ? (t.format === "league" ? "" : t.ends_on) : "",
      value:
        opening && t.registration_closes_at && registrationOpen(t)
          ? closingDateInArgentina(t.registration_closes_at)
          : "",
      confirm: opening ? "Abrir inscripciones" : "Cerrar inscripciones",
      action: async (dateString) => {
        await adminSession();
        const now = new Date();
        if (
          opening &&
          dateString &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
            dateString < localToday() ||
            (t.format !== "league" && dateString > t.ends_on))
        ) {
          throw new Error(
            "Elegí una fecha entre hoy y el fin del torneo, o dejala vacía.",
          );
        }
        const closing = opening
          ? dateString
            ? new Date(`${dateString}T23:59:59.999-03:00`).toISOString()
            : null
          : now.toISOString();
        if (opening && closing && Date.parse(closing) <= Date.now()) {
          throw new Error("La fecha de cierre ya venció. Elegí otra.");
        }
        // Se controla la versión previa para no pisar cambios de otro administrador.
        const payload = opening
          ? {
              status: "registration_open",
              // No modificar is_published: puede estar oculto para pruebas privadas.
              registration_opens_at: now.toISOString(),
              registration_closes_at: closing,
              updated_at: now.toISOString(),
            }
          : {
              status: "registration_closed",
              registration_closes_at: closing,
              updated_at: now.toISOString(),
            };
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .update(payload)
          .eq("id", t.id)
          .eq("status", t.status)
          .eq("is_published", t.is_published)
          .select("id");
        if (
          error?.code === "23514" &&
          /cupo|capacity/i.test(`${error.message || ""} ${error.details || ""}`)
        ) {
          throw new Error(
            "El cupo está completo. Liberá un lugar o ampliá el cupo para abrir inscripciones.",
          );
        }
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo actualizar la inscripción. Actualizá la vista e intentá nuevamente.",
          );
        await loadTournaments();
        feedback(
          opening
            ? `Inscripciones abiertas. El torneo sigue ${t.is_published ? "publicado" : "oculto"}.`
            : "Inscripciones cerradas correctamente.",
        );
      },
    });
  }
  // Finalización anticipada explícita. No cambia la visibilidad pública.
  function finalizeTournament(t) {
    if (isFinished(t)) {
      feedback("El torneo ya está finalizado.");
      return;
    }
    openModal({
      title: "Finalizar torneo",
      description: `¿Marcar «${t.name}» como finalizado? Se cerrarán sus inscripciones. El torneo conservará sus datos y su visibilidad actual.`,
      confirm: "Finalizar torneo",
      action: async () => {
        await adminSession();
        if (t.format === "league") {
          // P89: el primero de la tabla no es el campeón: deben disputarse
          // dos semifinales y la final (1º vs 3º; 2º vs 4º).
          // Contar en servidor evita perder partidos por límite de 1000 filas.
          const [total, played, finals] = await Promise.all([
            supabaseClient.from("bp_league_matches")
              .select("id", { count: "exact", head: true })
              .eq("tournament_id", t.id),
            supabaseClient.from("bp_league_matches")
              .select("id", { count: "exact", head: true })
              .eq("tournament_id", t.id).eq("match_status", "played"),
            supabaseClient.from("bp_league_final_matches")
              .select("stage,slot,match_status,pair1_id,pair2_id,winner_pair_id")
              .eq("tournament_id", t.id),
          ]);
          if (total.error || played.error || finals.error ||
              total.count == null || played.count == null)
            throw new Error("No se pudo verificar la fase final de Liga.");
          if (total.count < 1 || total.count !== played.count)
            throw new Error("Completá la fase regular antes de finalizar la Liga.");
          const matches = finals.data || [];
          const sf1 = matches.find((m) => m.stage === "semifinal" && m.slot === 1);
          const sf2 = matches.find((m) => m.stage === "semifinal" && m.slot === 2);
          const final = matches.find((m) => m.stage === "final" && m.slot === 1);
          if (matches.length !== 3 || sf1?.match_status !== "played" ||
              sf2?.match_status !== "played")
            throw new Error("Completá las dos semifinales de Liga.");
          if (final?.match_status !== "played" ||
              final.pair1_id !== sf1.winner_pair_id ||
              final.pair2_id !== sf2.winner_pair_id ||
              ![final.pair1_id,final.pair2_id].includes(final.winner_pair_id))
            throw new Error("Cargá el resultado de la final para definir Campeón y Subcampeón.");
        }
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id)
          .eq("status", t.status)
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo finalizar el torneo. Actualizá la vista e intentá nuevamente.",
          );
        if (editing === t.id) resetForm();
        await loadTournaments();
        feedback("Torneo finalizado correctamente.");
      },
    });
  }
  // SQL 70: eliminación DEFINITIVA y completa, con verificación doble.
  // La vista previa no modifica nada; la RPC verifica admin, nombre y alcance.
  async function remove(t) {
    let preview;
    try {
      await adminSession();
      const { data, error } = await supabaseClient.rpc(
        "bp_admin_tournament_delete_preview",
        { p_tournament_id: t.id },
      );
      if (error) throw error;
      if (!data || data.tournament_id !== t.id || data.tournament_name !== t.name)
        throw new Error("El torneo cambió. Actualizá la lista antes de eliminarlo.");
      preview = data;
    } catch (error) {
      console.error("No se pudo preparar la eliminación:", error);
      feedback("No se pudo verificar el torneo para eliminarlo. Actualizá la lista e intentá de nuevo.");
      return;
    }

    const totalMatches = Number(preview.group_matches) + Number(preview.knockout_matches) + Number(preview.league_matches || 0) + Number(preview.league_final_matches || 0);
    const totalResults = Number(preview.group_results) + Number(preview.knockout_results) + Number(preview.league_results || 0) + Number(preview.league_final_results || 0);
    const publicNotice = preview.is_published
      ? " También dejará de aparecer inmediatamente en la página pública."
      : "";
    openModal({
      title: "Eliminar torneo completo",
      description:
        `Vas a eliminar definitivamente «${preview.tournament_name}» y TODAS sus dependencias: ` +
        `${preview.pairs} inscripciones, ${preview.groups} grupos, ${totalMatches} partidos, ` +
        `${totalResults} resultados y ${preview.linked_blockouts} bloqueos de cancha de sus encuentros, ` +
        "incluyendo eliminatorias, cruces, historial de programación y revisiones. " +
        "No se borrarán reservas de jugadores, bloqueos independientes ni categorías compartidas." +
        publicNotice +
        " Esta operación NO SE PUEDE DESHACER.",
      confirm: "Entiendo, continuar",
      action: () => ({
        nextModal: {
          title: "Confirmación definitiva",
          description:
            `Última confirmación: «${preview.tournament_name}» desaparecerá por completo ` +
            "del sistema de torneos, junto con sus inscripciones, partidos y resultados. " +
            "No existe una opción para recuperarlo.",
          label: `Escribí exactamente: ${preview.tournament_name}`,
          value: "",
          confirm: "Sí, eliminar definitivamente",
          danger: true,
          action: async (typedName) => {
            if (typedName !== preview.tournament_name)
              throw new Error("El nombre no coincide. No se eliminó nada.");
            await adminSession();
            const { data, error } = await supabaseClient.rpc(
              "bp_admin_delete_tournament_safely",
              { p_tournament_id: t.id, p_expected_name: typedName },
            );
            if (error) {
              console.error("Supabase rechazó la eliminación:", error);
              if (error.code === "42501")
                throw new Error("No tenés permisos de administrador para eliminar torneos.");
              if (/cambió|no existe|nombre/i.test(String(error.message || "")))
                throw new Error("El torneo cambió o ya no existe. Actualizá la lista antes de reintentar.");
              throw new Error("No se pudo confirmar la eliminación. Actualizá la lista antes de reintentar. El proceso nunca borra datos parcialmente.");
            }
            if (data?.deleted !== true || data?.tournament_id !== t.id)
              throw new Error("Supabase no confirmó la eliminación completa. Actualizá y verificá el estado.");
            if (editing === t.id) resetForm();
            try {
              await loadTournaments();
              feedback("Torneo eliminado definitivamente.");
            } catch (refreshError) {
              console.error("El torneo se eliminó, pero no se pudo refrescar:", refreshError);
              feedback("Torneo eliminado definitivamente. Actualizá la lista para ver el cambio.");
            }
          },
        },
      }),
    });
  }
  // Aviso inmediato con los torneos cargados; Supabase aplica la regla definitiva.
  const DUPLICATE_TOURNAMENT_MESSAGE =
    "Ya existe un torneo con ese nombre. Elegí otro para identificar correctamente esta competencia.";
  function tournamentNameExists(name) {
    const normalizedName = name.trim().toLocaleLowerCase("es-AR");
    return records.some(
      (t) =>
        t.id !== editing &&
        t.name.trim().toLocaleLowerCase("es-AR") === normalizedName,
    );
  }
  $("torneo-create-button").addEventListener("click", async () => {
    if (busy) return;
    const name = $("torneo-name").value.trim(),
      category_id = $("torneo-category").value;
    const format = $("torneo-format").value,
      starts_on = $("torneo-start").value,
      ends_on = format === "league" ? null : $("torneo-end").value;
    const status = $("torneo-state").value;
    const max_pairs = Number(
      $("torneo-pairs").value === "custom"
        ? $("torneo-pairs-custom").value
        : $("torneo-pairs").value,
    );
    if (
      name.length < 3 ||
      name.length > 100 ||
      !category_id ||
      !starts_on ||
      (format !== "league" && (!ends_on || ends_on < starts_on)) ||
      !Number.isInteger(max_pairs) ||
      max_pairs < 2 ||
      (format === "league" && max_pairs > 64) ||
      max_pairs > 256
    ) {
      feedback(
        "Completá nombre, categoría, fechas válidas y cupo de 2 a 256 parejas.",
      );
      return;
    }
    if (tournamentNameExists(name)) {
      feedback(DUPLICATE_TOURNAMENT_MESSAGE);
      $("torneo-name").focus();
      return;
    }
    busy = true;
    $("torneo-create-button").disabled = true;
    feedback("Guardando torneo…");
    try {
      await adminSession();
      const payload = {
        name,
        category_id,
        format,
        status,
        starts_on,
        ends_on,
        max_pairs,
        updated_at: new Date().toISOString(),
      };
      // Los datos generales nunca deben cambiar el estado del torneo.
      // Abrir/cerrar inscripciones y finalizar son acciones independientes.
      const editPayload = { ...payload };
      delete editPayload.status;
      const result = editing
        ? await supabaseClient
            .from("bp_tournaments")
            .update(editPayload)
            .eq("id", editing)
            .select("id")
        : await supabaseClient
            .from("bp_tournaments")
            .insert({
              ...payload,
              is_published: false,
              match_format: "Mejor de 3 sets",
            })
            .select("id");
      // El indice unico en Supabase protege incluso ante escrituras simultaneas.
      if (result.error?.code === "23505")
        throw new Error(DUPLICATE_TOURNAMENT_MESSAGE);
      if (result.error || result.data?.length !== 1)
        throw result.error || new Error("No se confirmó la escritura.");
      const wasEditing = Boolean(editing);
      resetForm();
      await loadTournaments();
      feedback(
        wasEditing
          ? "Cambios guardados correctamente."
          : "Torneo creado correctamente. Sigue oculto al público.",
      );
    } catch (e) {
      console.error(e);
      feedback(
        e.message === DUPLICATE_TOURNAMENT_MESSAGE
          ? e.message
          : "No se pudo guardar el torneo. Revisá los datos o la sesión.",
      );
    } finally {
      busy = false;
      $("torneo-create-button").disabled = false;
    }
  });
})();
