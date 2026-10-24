/* Boulevard Pádel · Torneos · Inscripciones privadas, panel Admin. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const select = $("torneos-pairs-tournament");
  const list = $("torneos-pairs-list");
  const dialog = $("torneos-pair-dialog");
  const submit = $("torneos-pair-save");
  /* BVPadel parche 17 - cupos visibles en Admin */
  const addButton = $("torneos-pairs-add");
  const capacityView = document.createElement("div");
  capacityView.id = "torneos-pairs-capacity";
  capacityView.className = "torneos-pairs-capacity";
  capacityView.setAttribute("role", "status");
  capacityView.setAttribute("aria-live", "polite");
  capacityView.hidden = true;
  addButton.before(capacityView);
  let tournamentLimits = new Map();
  const feedback = (msg) => {
    $("torneos-pairs-feedback").textContent = msg;
  };
  const statusLabels = {
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
  };
  let current = "",
    editing = null,
    busy = false,
    action = null;

  async function verifyAdmin() {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();
    if (error || !user) throw new Error("Iniciá sesión como administrador.");
    const { data, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role,active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || data?.role !== "admin" || data?.active !== true)
      throw new Error("No tenés permisos de administrador.");
  }
  function empty(title, detail) {
    list.replaceChildren();
    const card = document.createElement("div");
    card.className = "torneos-empty";
    const icon = document.createElement("span");
    icon.className = "torneos-empty__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "👥";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const p = document.createElement("p");
    p.textContent = detail;
    card.append(icon, strong, p);
    list.append(card);
  }
  // Las pendientes y aprobadas ocupan cupo; las rechazadas no.
  function renderCapacity(occupied = null, failed = false) {
    capacityView.replaceChildren();
    addButton.textContent = "+ Agregar pareja";
    if (!current) {
      capacityView.hidden = true;
      addButton.disabled = true;
      return;
    }
    if (failed) {
      capacityView.hidden = false;
      capacityView.textContent = "No se pudo verificar el cupo. Actualizá e intentá nuevamente.";
      addButton.disabled = true;
      return;
    }
    if (occupied === null) {
      // Hasta recibir los datos del servidor, no habilitar el botón.
      capacityView.hidden = true;
      addButton.disabled = true;
      return;
    }
    const max = tournamentLimits.get(current);
    if (max === undefined) {
      renderCapacity(null, true);
      return;
    }
    if (max === null) {
      // Compatibilidad con torneos antiguos sin cupo definido.
      capacityView.hidden = true;
      addButton.disabled = false;
      return;
    }
    const full = occupied >= max;
    capacityView.hidden = false;
    const head = document.createElement("div");
    head.className = "torneos-pairs-capacity__head";
    const title = document.createElement("span");
    title.textContent = "Cupos ocupados";
    const total = document.createElement("strong");
    total.textContent = `${occupied} de ${max} parejas`;
    head.append(title, total);
    const bar = document.createElement("progress");
    bar.max = max;
    bar.value = Math.min(occupied, max);
    bar.setAttribute("aria-label", "Cupos ocupados del torneo");
    const notice = document.createElement("p");
    notice.textContent = full
      ? "Cupo completo. No se pueden agregar más parejas."
      : `Quedan ${max - occupied} ${max - occupied === 1 ? "lugar disponible" : "lugares disponibles"}.`;
    capacityView.append(head, bar, notice);
    addButton.disabled = full;
    if (full) addButton.textContent = `Cupo completo — ${occupied}/${max} parejas`;
  }
  function button(text, handler, danger = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.className =
      "torneos-entry__button" +
      (danger ? " torneos-entry__button--danger" : "");
    b.textContent = text;
    b.addEventListener("click", handler);
    return b;
  }
  async function loadTournaments() {
    await verifyAdmin();
    const previous = select.value || current;
    const { data, error } = await supabaseClient
      .from("bp_tournaments")
      .select("id,name,starts_on,max_pairs")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    tournamentLimits = new Map((data || []).map((t) => [t.id, t.max_pairs]));
    select.replaceChildren(new Option("Seleccionar torneo", ""));
    for (const t of data || []) select.add(new Option(t.name, t.id));
    if ((data || []).some((t) => t.id === previous)) select.value = previous;
    current = select.value;
    renderCapacity();
    await loadPairs();
  }
  async function loadPairs() {
    current = select.value;
    renderCapacity();
    $("torneos-pairs-count").textContent = current ? "…" : "—";
    if (!current) {
      empty(
        "Seleccioná un torneo",
        "Elegí una competencia para ver sus parejas.",
      );
      return;
    }
    await verifyAdmin();
    const tournamentId = current;
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabaseClient
        .from("bp_tournament_pairs")
        .select("id,player1_name,player2_name,contact_phone,status,source,created_at")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true })
        .limit(300),
      supabaseClient
        .from("bp_tournament_pairs")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "approved"]),
    ]);
    if (select.value !== tournamentId) return;
    if (error || countError) {
      renderCapacity(null, true);
      throw error || countError;
    }
    renderCapacity(count ?? 0);
    const pairs = data || [];
    $("torneos-pairs-count").textContent = String(pairs.length);
    if (!pairs.length) {
      empty(
        "Sin parejas cargadas",
        "Podés agregarlas manualmente desde este panel.",
      );
      return;
    }
    list.replaceChildren();
    for (const pair of pairs) {
      const row = document.createElement("div");
      row.className = "torneos-pair-entry";
      const name = document.createElement("strong");
      name.textContent = `${pair.player1_name} y ${pair.player2_name}`;
      const st = document.createElement("span");
      st.className = "torneos-pair-entry__status";
      st.textContent = statusLabels[pair.status] || pair.status;
      const tel = document.createElement("p");
      tel.textContent = `Contacto: ${pair.contact_phone}`;
      const actions = document.createElement("div");
      actions.className = "torneos-pair-entry__buttons";
      actions.append(button("Editar", () => openEdit(pair)));
      if (pair.status !== "approved")
        actions.append(button("Aprobar", () => askStatus(pair, "approved")));
      if (pair.status !== "rejected")
        actions.append(
          button("Rechazar", () => askStatus(pair, "rejected"), true),
        );
      row.append(name, st, tel, actions);
      list.append(row);
    }
  }
  function showDialog(title, description, fields, confirm, onSave) {
    $("torneos-pair-dialog-title").textContent = title;
    $("torneos-pair-dialog-description").textContent = description;
    $("torneos-pair-fields").hidden = !fields;
    $("torneos-pair-form").noValidate = !fields; // Confirmar estados sin validar campos ocultos; mantener validación en alta/edición.
    $("torneos-pair-dialog-error").textContent = "";
    submit.textContent = confirm;
    action = onSave;
    dialog.showModal();
    (fields ? $("torneos-pair-player1") : submit).focus();
  }
  function closeDialog() {
    if (!busy) dialog.close();
  }
  $("torneos-pair-back").addEventListener("click", closeDialog);
  dialog.addEventListener("close", () => {
    action = null;
    editing = null;
  });
  function openCreate() {
    if (!current || addButton.disabled) return;
    editing = null;
    $("torneos-pair-player1").value = "";
    $("torneos-pair-player2").value = "";
    $("torneos-pair-phone").value = "";
    showDialog(
      "Agregar pareja",
      "La pareja se guardará como aprobada, porque la agrega el administrador.",
      true,
      "Guardar pareja",
      async () => {
        const payload = values();
        const { error } = await supabaseClient
          .from("bp_tournament_pairs")
          .insert({
            ...payload,
            tournament_id: current,
            status: "approved",
            source: "admin",
          });
        if (error) throw readableError(error);
        feedback("Pareja agregada correctamente.");
      },
    );
  }
  function openEdit(pair) {
    editing = pair.id;
    $("torneos-pair-player1").value = pair.player1_name;
    $("torneos-pair-player2").value = pair.player2_name;
    $("torneos-pair-phone").value = pair.contact_phone;
    showDialog(
      "Editar pareja",
      "Actualizá los datos de esta inscripción.",
      true,
      "Guardar cambios",
      async () => {
        const { error } = await supabaseClient
          .from("bp_tournament_pairs")
          .update({ ...values(), updated_at: new Date().toISOString() })
          .eq("id", pair.id)
          .eq("tournament_id", current);
        if (error) throw readableError(error);
        feedback("Datos de la pareja actualizados.");
      },
    );
  }
  function askStatus(pair, next) {
    const label = next === "approved" ? "Aprobar" : "Rechazar";
    showDialog(
      `${label} inscripción`,
      `¿${label.toLowerCase()} a ${pair.player1_name} y ${pair.player2_name}?`,
      false,
      label,
      async () => {
        const { error } = await supabaseClient
          .from("bp_tournament_pairs")
          .update({ status: next, updated_at: new Date().toISOString() })
          .eq("id", pair.id)
          .eq("tournament_id", current);
        if (error) throw readableError(error);
        feedback(
          next === "approved"
            ? "Inscripción aprobada."
            : "Inscripción rechazada.",
        );
      },
    );
  }
  function values() {
    const player1_name = $("torneos-pair-player1")
      .value.trim()
      .replace(/\s+/g, " ");
    const player2_name = $("torneos-pair-player2")
      .value.trim()
      .replace(/\s+/g, " ");
    const contact_phone = $("torneos-pair-phone").value.trim();
    if (
      player1_name.length < 3 ||
      player1_name.length > 100 ||
      player2_name.length < 3 ||
      player2_name.length > 100
    )
      throw new Error(
        "Ingresá nombre y apellido de ambos jugadores (3 a 100 caracteres).",
      );
    if (player1_name.toLocaleLowerCase() === player2_name.toLocaleLowerCase())
      throw new Error("Los dos jugadores deben ser diferentes.");
    if (
      contact_phone.length < 6 ||
      contact_phone.length > 30 ||
      !/^[+\d\s()\-]+$/.test(contact_phone)
    )
      throw new Error("Ingresá un teléfono válido (6 a 30 caracteres).");
    return { player1_name, player2_name, contact_phone };
  }
  function readableError(error) {
    if (error.code === "23514" &&
        /cupo|capacity/i.test(`${error.message || ""} ${error.details || ""} ${error.hint || ""}`))
      return new Error("Cupo completo. No se pueden agregar más parejas.");
    if (error.code === "23505")
      return new Error(
        "Esta pareja ya tiene una inscripción pendiente o aprobada en el torneo.",
      );
    if (error.code === "23503")
      return new Error("El torneo ya no está disponible.");
    return new Error(
      "No se pudo guardar. Revisá la conexión, permisos o datos e intentá nuevamente.",
    );
  }
  $("torneos-pair-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !action) return;
    busy = true;
    submit.disabled = true;
    try {
      await verifyAdmin();
      await action();
      dialog.close();
      await loadPairs();
    } catch (error) {
      console.error(error);
      $("torneos-pair-dialog-error").textContent =
        error.message || "Error al guardar.";
      if (error.message === "Cupo completo. No se pueden agregar más parejas.") {
        // Otro administrador pudo ocupar el último cupo mientras estaba abierto el diálogo.
        await loadPairs().catch((refreshError) => console.error(refreshError));
      }
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
  $("torneos-pairs-add").addEventListener("click", openCreate);
  select.addEventListener("change", () =>
    loadPairs().catch((e) => {
      console.error(e);
      feedback("No se pudieron cargar las parejas.");
    }),
  );
  $("admin-tab-torneos").addEventListener("click", () =>
    loadTournaments().catch((e) => {
      console.error(e);
      feedback("No se pudieron cargar las inscripciones.");
    }),
  );
  // Si se crea o elimina una competencia, al volver a la sección se actualiza el selector.
})();
