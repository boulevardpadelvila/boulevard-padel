/* Boulevard Pádel — gestión inicial de torneos. Independiente de reservas y disponibilidad. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const feedback = (message) => {
    $("torneo-feedback").textContent = message;
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
  let busy = false,
    editing = null,
    records = [],
    modalAction = null;
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
    action,
  }) {
    $("torneo-dialog-title").textContent = title;
    $("torneo-dialog-description").textContent = description;
    const field = $("torneo-dialog-field");
    field.hidden = !label;
    $("torneo-dialog-label").textContent = label;
    $("torneo-dialog-input").value = value;
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
  });
  $("torneo-dialog-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || !modalAction) return;
    busy = true;
    $("torneo-dialog-accept").disabled = true;
    try {
      await modalAction($("torneo-dialog-input").value.trim());
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
    if (selected) select.value = selected;
  }
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
        "id,name,category_id,format,status,is_published,starts_on,ends_on,max_pairs,bp_tournament_categories(name)",
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
    const heading = document.createElement("h3");
    heading.textContent = "Torneos registrados";
    box.append(heading);
    for (const t of records) {
      const card = document.createElement("div");
      card.className = "torneos-entry";
      const title = document.createElement("strong");
      title.textContent = t.name;
      const meta = document.createElement("p");
      meta.textContent = `${t.bp_tournament_categories?.name || "Sin categoría"} · ${names[t.format] || t.format} · ${date(t.starts_on)} a ${date(t.ends_on)} · ${states[t.status] || t.status} · ${t.is_published ? "Publicado" : "Oculto"}`;
      const actions = document.createElement("div");
      actions.className = "torneos-entry__actions";
      actions.append(
        action("Editar", () => edit(t)),
        action(t.is_published ? "Ocultar" : "Publicar", () =>
          togglePublication(t),
        ),
      );
      if (
        ["draft", "registration_open", "registration_closed"].includes(t.status)
      ) {
        actions.append(
          action(
            t.status === "registration_open"
              ? "Cerrar inscripciones"
              : "Abrir inscripciones",
            () => toggleRegistration(t),
          ),
        );
      }
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
    $("torneo-format").value = "groups_knockout";
    $("torneo-start").value = "";
    $("torneo-end").value = "";
    $("torneo-state").value = "draft";
    setPairs(12);
  }
  function edit(t) {
    editing = t.id;
    $("torneo-create-title").textContent = "Editar torneo";
    $("torneo-create-button").textContent = "Guardar cambios";
    $("torneo-edit-cancel").hidden = false;
    $("torneo-name").value = t.name;
    $("torneo-category").value = t.category_id;
    $("torneo-format").value = t.format;
    $("torneo-start").value = t.starts_on;
    $("torneo-end").value = t.ends_on;
    $("torneo-state").value = t.status;
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
        feedback("Categoría creada correctamente.");
      },
    }),
  );
  async function togglePublication(t) {
    if (t.is_published && t.status === "registration_open") {
      feedback("Primero cerrá las inscripciones y después ocultá el torneo.");
      return;
    }
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
  function toggleRegistration(t) {
    const opening = t.status !== "registration_open";
    if (opening && !t.is_published) {
      feedback(
        "Primero publicá el torneo. No se abren inscripciones de torneos ocultos.",
      );
      return;
    }
    openModal({
      title: opening ? "Abrir inscripciones" : "Cerrar inscripciones",
      description: opening
        ? `¿Habilitar las inscripciones de «${t.name}»? Podrás cerrarlas cuando quieras. El formulario público todavía no está disponible.`
        : `¿Cerrar las inscripciones de «${t.name}»? Las parejas ya registradas se conservarán.`,
      confirm: opening ? "Abrir inscripciones" : "Cerrar inscripciones",
      action: async () => {
        await adminSession();
        // El filtro por estado evita sobrescribir una actualización concurrente.
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .update({
            status: opening ? "registration_open" : "registration_closed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", t.id)
          .eq("status", t.status)
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo cambiar el estado. Actualizá la vista e intentá nuevamente.",
          );
        await loadTournaments();
        feedback(
          opening
            ? "Inscripciones abiertas en el Admin. El formulario público se habilitará en el siguiente paso."
            : "Inscripciones cerradas correctamente.",
        );
      },
    });
  }
  async function remove(t) {
    openModal({
      title: "Eliminar torneo",
      description: `¿Eliminar definitivamente «${t.name}»? Esta acción no se puede deshacer.`,
      confirm: "Eliminar definitivamente",
      danger: true,
      action: async () => {
        await adminSession();
        const { data, error } = await supabaseClient
          .from("bp_tournaments")
          .delete()
          .eq("id", t.id)
          .select("id");
        if (error || data?.length !== 1)
          throw new Error(
            "No se pudo eliminar. Si tiene inscripciones o partidos asociados, debe gestionarse su eliminación segura antes.",
          );
        if (editing === t.id) resetForm();
        await loadTournaments();
        feedback("Torneo eliminado correctamente.");
      },
    });
  }
  $("torneo-create-button").addEventListener("click", async () => {
    if (busy) return;
    const name = $("torneo-name").value.trim(),
      category_id = $("torneo-category").value;
    const format = $("torneo-format").value,
      starts_on = $("torneo-start").value,
      ends_on = $("torneo-end").value;
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
      !ends_on ||
      ends_on < starts_on ||
      !Number.isInteger(max_pairs) ||
      max_pairs < 2 ||
      max_pairs > 256
    ) {
      feedback(
        "Completá nombre, categoría, fechas válidas y cupo de 2 a 256 parejas.",
      );
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
      const result = editing
        ? await supabaseClient
            .from("bp_tournaments")
            .update(payload)
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
      feedback("No se pudo guardar el torneo. Revisá los datos o la sesión.");
    } finally {
      busy = false;
      $("torneo-create-button").disabled = false;
    }
  });
})();
