/* Boulevard Pádel — Portal Admin (acceso y recuperación). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const panels = [
    "login-panel",
    "request-panel",
    "recovery-panel",
    "dashboard-panel",
    "loading-panel",
  ].map($);
  let operation = false;
  let recoveryMode = false;
  const show = (id) =>
    panels.forEach((p) => {
      p.hidden = p.id !== id;
    });
  const display = (id, text, success = false) => {
    const el = $(id);
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle("success", success);
  };
  const recoveryInUrl = () =>
    new URLSearchParams(location.hash.slice(1)).get("type") === "recovery" ||
    new URLSearchParams(location.search).get("type") === "recovery";

  async function getAdminProfile(user) {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("full_name, role, active")
      .eq("id", user.id)
      .maybeSingle();
    if (error)
      throw new Error("No pudimos verificar los permisos del administrador.");
    if (!data || data.role !== "admin" || data.active !== true) return null;
    return data;
  }
  const ARGENTINA_TZ = "America/Argentina/Cordoba";
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let reservationsRequest = 0;
  let loadedReservations = [];
  let viewingCancelled = false;
  const argentinaDay = (date) => {
    const parts = Object.fromEntries(
      dateFormatter
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  // Argentina no utiliza horario de verano actualmente (UTC-03:00).
  const dateBounds = (day) => {
    const start = new Date(`${day}T03:00:00.000Z`);
    const end = new Date(start.getTime() + 86400000);
    if (Number.isNaN(start.getTime()))
      throw new Error("Seleccioná una fecha válida.");
    return [start.toISOString(), end.toISOString()];
  };
  function safeText(element, value) {
    element.textContent = String(value ?? "");
  }
  function renderReservations(rows) {
    const list = $("reservations-list");
    list.replaceChildren();
    safeText(
      $("reservations-count"),
      `${rows.length} ${rows.length === 1 ? "reserva encontrada" : "reservas encontradas"}${viewingCancelled ? " · Canceladas" : " · Activas"}`,
    );
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = viewingCancelled
        ? "No hay reservas canceladas para esta fecha."
        : "No hay reservas activas para esta fecha.";
      list.append(empty);
      return;
    }
    for (const item of rows) {
      const card = document.createElement("article");
      card.className = "reservation-card";
      const top = document.createElement("div");
      top.className = "reservation-card__top";
      const schedule = document.createElement("strong");
      safeText(
        schedule,
        `${timeFormatter.format(new Date(item.starts_at))} a ${timeFormatter.format(new Date(item.ends_at))}`,
      );
      const status = document.createElement("span");
      status.className = "reservation-status";
      const statuses = {
        confirmed: "Confirmada",
        cancelled: "Cancelada",
        completed: "Completada",
        no_show: "No asistió",
      };
      safeText(status, statuses[item.status] || item.status || "Sin estado");
      top.append(schedule, status);
      const name = document.createElement("h3");
      safeText(
        name,
        item.booking_name || item.customers?.full_name || "Cliente sin nombre",
      );
      const court = document.createElement("p");
      court.className = "reservation-muted";
      safeText(court, item.courts?.name || item.courts?.court_name || "Cancha");
      const phone = document.createElement("p");
      phone.className = "reservation-muted";
      safeText(
        phone,
        `Teléfono: ${item.booking_phone || item.customers?.phone || "No registrado"}`,
      );
      const code = document.createElement("p");
      code.className = "reservation-code";
      safeText(code, `Código: ${item.reservation_code}`);
      card.append(top, name, court, phone, code);
      if (item.notes) {
        const notes = document.createElement("p");
        notes.className = "reservation-muted";
        safeText(notes, `Observaciones: ${item.notes}`);
        card.append(notes);
      }
      const actions = document.createElement("div");
      actions.className = "reservation-card__actions";
      for (const [label, modifier] of [
        ["Editar", "edit"],
        ["Cancelar", "cancel"],
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `reservation-action reservation-action--${modifier}`;
        button.textContent = label;
        button.disabled = item.status !== "confirmed";
        button.title = button.disabled
          ? "Solo reservas confirmadas"
          : `${label} esta reserva`;
        if (!button.disabled)
          button.addEventListener("click", () =>
            modifier === "edit"
              ? openEditBooking(item)
              : openCancelBooking(item),
          );
        actions.append(button);
      }
      card.append(actions);
      list.append(card);
    }
  }
  async function loadReservations() {
    const requestId = ++reservationsRequest;
    const day = $("reservations-date").value;
    if (!day) return;
    syncDateCards();
    $("refresh-reservations").disabled = true;
    display("reservations-message", "Cargando reservas…", true);
    try {
      const [from, until] = dateBounds(day);
      const { data, error } = await supabaseClient
        .from("reservations")
        .select(
          "id, reservation_code, starts_at, ends_at, status, notes, booking_name, booking_phone, customers(full_name,phone), courts(*)",
        )
        .eq("status", viewingCancelled ? "cancelled" : "confirmed")
        .gte("starts_at", from)
        .lt("starts_at", until)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      if (requestId !== reservationsRequest) return;
      loadedReservations = data || [];
      renderReservations(loadedReservations);
      display("reservations-message", "");
    } catch (error) {
      if (requestId !== reservationsRequest) return;
      $("reservations-list").replaceChildren();
      safeText($("reservations-count"), "");
      display(
        "reservations-message",
        "No se pudieron consultar las reservas. Revisaremos el acceso a Supabase.",
      );
      console.error("Error de lectura de reservas:", error);
    } finally {
      if (requestId === reservationsRequest)
        $("refresh-reservations").disabled = false;
    }
  }
  // Cancelación administrativa: confirmación explícita, conserva el historial.
  const cancelDialog = $("cancel-booking-dialog");
  let cancelTarget = null;
  let cancelInProgress = false;
  let cancelReturnFocus = null;
  const cancelContent = $("cancel-booking-content");
  function closeCancelBooking() {
    if (cancelInProgress) return;
    cancelDialog.hidden = true;
    cancelTarget = null;
    display("cancel-booking-message", "");
    document.body.classList.remove("admin-dialog-open");
    if (cancelReturnFocus?.isConnected) cancelReturnFocus.focus();
    cancelReturnFocus = null;
  }
  function openCancelBooking(item) {
    if (item.status !== "confirmed" || cancelInProgress) return;
    cancelReturnFocus = document.activeElement;
    cancelTarget = { id: item.id, reservation_code: item.reservation_code };
    const date = new Intl.DateTimeFormat("es-AR", {
      timeZone: ARGENTINA_TZ,
      dateStyle: "full",
    }).format(new Date(item.starts_at));
    safeText(
      $("cancel-detail-name"),
      item.booking_name || item.customers?.full_name || "Cliente",
    );
    safeText($("cancel-detail-date"), date);
    safeText(
      $("cancel-detail-time"),
      `${timeFormatter.format(new Date(item.starts_at))} a ${timeFormatter.format(new Date(item.ends_at))}`,
    );
    safeText($("cancel-detail-code"), item.reservation_code);
    display("cancel-booking-message", "");
    cancelDialog.hidden = false;
    document.body.classList.add("admin-dialog-open");
    cancelContent.focus();
  }
  $("cancel-booking-back").addEventListener("click", closeCancelBooking);
  $("cancel-booking-backdrop").addEventListener("click", closeCancelBooking);
  document.addEventListener("keydown", (event) => {
    if (cancelDialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeCancelBooking();
    }
    if (event.key === "Tab") {
      const controls = [$("cancel-booking-back"), $("cancel-booking-confirm")];
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls[1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[1]) {
        event.preventDefault();
        controls[0].focus();
      }
    }
  });
  $("cancel-booking-confirm").addEventListener("click", async () => {
    if (!cancelTarget || cancelInProgress) return;
    cancelInProgress = true;
    const id = cancelTarget.id;
    const confirm = $("cancel-booking-confirm");
    confirm.disabled = true;
    $("cancel-booking-back").disabled = true;
    display("cancel-booking-message", "Cancelando reserva…", true);
    try {
      const { data, error } = await supabaseClient.rpc("cancel_admin_booking", {
        p_reservation_id: id,
      });
      if (error) throw error;
      if (!data?.length || data[0].status !== "cancelled")
        throw new Error("No se recibió confirmación de la cancelación.");
      cancelInProgress = false;
      closeCancelBooking();
      await loadReservations();
      display(
        "reservations-message",
        `Reserva ${data[0].reservation_code} cancelada correctamente. El horario está disponible.`,
        true,
      );
    } catch (error) {
      console.error("Error cancelando reserva:", error);
      display(
        "cancel-booking-message",
        error.message || "No se pudo cancelar la reserva.",
      );
    } finally {
      cancelInProgress = false;
      confirm.disabled = false;
      $("cancel-booking-back").disabled = false;
    }
  });
  // Edición: disponibilidad específica de Admin que ignora solo la reserva editada.
  const editPanel = $("edit-booking-panel");
  let editing = null;
  let editSlots = [];
  let editSlotsRequest = 0;
  let editSaving = false;
  const isoMillis = (value) => new Date(value).getTime();
  function closeEditBooking() {
    if (editSaving) return;
    ++editSlotsRequest;
    editPanel.hidden = true;
    editing = null;
    editSlots = [];
    display("edit-booking-message", "");
  }
  async function loadEditSlots() {
    const req = ++editSlotsRequest;
    const day = $("edit-booking-date").value;
    const duration = Number($("edit-booking-duration").value);
    const select = $("edit-booking-slot");
    editSlots = [];
    select.replaceChildren(new Option("Consultando horarios…", ""));
    select.disabled = true;
    display("edit-booking-message", "");
    if (!day || !editing || ![90, 120].includes(duration)) return;
    try {
      const { data, error } = await supabaseClient.rpc("get_admin_edit_slots_flexible", {
        p_date: day,
        p_duration_minutes: duration,
        p_reservation_id: editing.id,
      });
      if (error) throw error;
      if (req !== editSlotsRequest || !editing || editPanel.hidden) return;
      const slots = (data || []).filter(
        (v) => v.starts_at && Number.isFinite(isoMillis(v.starts_at)),
      );
      const originalDuration = Math.round(
        (isoMillis(editing.ends_at) - isoMillis(editing.starts_at)) / 60000,
      );
      if (
        day === argentinaDay(new Date(editing.starts_at)) &&
        duration === originalDuration
      ) {
        // Si el inicio original ya pasó, dejarlo seleccionado únicamente cuando
        // se conserva la duración: permite corregir datos sin mover el turno.
        // Los cambios de horario/duración requieren disponibilidad real.
        if (!slots.some((v) => isoMillis(v.starts_at) === isoMillis(editing.starts_at))) {
          slots.push({ starts_at: editing.starts_at, current: true });
        }
      }
      slots.sort((a, b) => isoMillis(a.starts_at) - isoMillis(b.starts_at));
      editSlots = slots;
      select.replaceChildren(new Option(
        slots.length ? "Seleccioná un horario" : "No hay horarios disponibles", "",
      ));
      slots.forEach((slot, i) => {
        const isCurrent = isoMillis(slot.starts_at) === isoMillis(editing.starts_at);
        select.add(new Option(
          `${timeFormatter.format(new Date(slot.starts_at))}${isCurrent ? " (horario actual)" : ""}`,
          String(i),
        ));
        if (isCurrent) select.value = String(i);
      });
      select.disabled = !slots.length;
    } catch (error) {
      if (req !== editSlotsRequest) return;
      select.replaceChildren(new Option("No se pudieron cargar los horarios", ""));
      display("edit-booking-message", "No se pudo consultar la disponibilidad. Intentá cambiar la fecha y volver.");
      console.error("Error cargando horarios de edición:", error);
    }
  }
  function openEditBooking(item) {
    if (item.status !== "confirmed") return;
    closeBookingEditor();
    editing = { ...item };
    editPanel.hidden = false;
    safeText($("edit-booking-code"), `Código: ${item.reservation_code}`);
    $("edit-booking-date").value = argentinaDay(new Date(item.starts_at));
    const savedDuration = Math.round((new Date(item.ends_at) - new Date(item.starts_at)) / 60000);
    $("edit-booking-duration").value = [90, 120].includes(savedDuration) ? String(savedDuration) : "90";
    $("edit-booking-name").value =
      item.booking_name || item.customers?.full_name || "";
    $("edit-booking-phone").value =
      item.booking_phone || item.customers?.phone || "";
    $("edit-booking-notes").value = item.notes || "";
    loadEditSlots();
    editPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("edit-booking-close").addEventListener("click", closeEditBooking);
  $("edit-booking-cancel").addEventListener("click", closeEditBooking);
  $("edit-booking-date").addEventListener("change", loadEditSlots);
  $("edit-booking-duration").addEventListener("change", loadEditSlots);
  $("edit-booking-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editing || editSaving) return;
    const indexText = $("edit-booking-slot").value;
    const slot = indexText === "" ? null : editSlots[Number(indexText)];
    if (!slot) {
      display("edit-booking-message", "Elegí un horario válido.");
      return;
    }
    const name = $("edit-booking-name").value.trim();
    const phone = $("edit-booking-phone").value.trim();
    if (!name || !phone) {
      display("edit-booking-message", "Completá nombre y teléfono.");
      return;
    }
    editSaving = true;
    $("edit-booking-save").disabled = true;
    display("edit-booking-message", "Guardando cambios…", true);
    try {
      const { data, error } = await supabaseClient.rpc("update_admin_booking_flexible", {
        p_reservation_id: editing.id,
        p_duration_minutes: Number($("edit-booking-duration").value),
        p_full_name: name,
        p_phone: phone,
        p_starts_at: slot.starts_at,
        p_notes: $("edit-booking-notes").value.trim() || null,
      });
      if (error) throw error;
      if (!data || !data.length)
        throw new Error("No recibimos confirmación de los cambios.");
      const day = $("edit-booking-date").value;
      editSaving = false;
      closeEditBooking();
      $("reservations-date").value = day;
      await loadReservations();
      display(
        "reservations-message",
        `Reserva actualizada. Código: ${data[0].reservation_code}`,
        true,
      );
    } catch (error) {
      console.error("Error editando reserva:", error);
      display(
        "edit-booking-message",
        error.message || "No se pudo editar la reserva.",
      );
    } finally {
      editSaving = false;
      $("edit-booking-save").disabled = false;
    }
  });
  // Nueva reserva: mismas franjas que el turnero público, sin horarios hardcodeados.
  let availableSlots = [];
  let slotsRequest = 0;
  let bookingSaving = false;
  const editor = $("new-booking-panel");
  const setSlotPlaceholder = (message) => {
    const select = $("new-booking-slot");
    select.replaceChildren(new Option(message, ""));
    select.disabled = true;
  };
  function closeBookingEditor() {
    ++slotsRequest;
    editor.hidden = true;
    display("new-booking-message", "");
  }
  async function loadAdminSlots() {
    const request = ++slotsRequest;
    const day = $("new-booking-date").value;
    const duration = Number($("new-booking-duration").value);
    availableSlots = [];
    setSlotPlaceholder(
      day ? "Consultando horarios…" : "Elegí primero una fecha",
    );
    display("new-booking-message", "");
    if (!day) return;
    try {
      const { data, error } = await supabaseClient.rpc("get_available_slots_flexible", {
        p_date: day,
        p_duration_minutes: duration,
      });
      if (error) throw error;
      if (request !== slotsRequest || editor.hidden) return;
      const select = $("new-booking-slot");
      availableSlots = (data || []).filter(
        (slot) =>
          slot.starts_at && !Number.isNaN(new Date(slot.starts_at).getTime()),
      );
      select.replaceChildren(
        new Option(
          availableSlots.length
            ? "Seleccioná un horario"
            : "No hay horarios disponibles",
          "",
        ),
      );
      availableSlots.forEach((slot, i) => {
        const time = timeFormatter.format(new Date(slot.starts_at));
        select.add(new Option(time, String(i)));
      });
      select.disabled = !availableSlots.length;
    } catch (error) {
      if (request !== slotsRequest) return;
      setSlotPlaceholder("No se pudieron cargar horarios");
      display(
        "new-booking-message",
        "No se pudo consultar la disponibilidad. Intentá otra vez.",
      );
      console.error("Error consultando horarios del Admin:", error);
    }
  }
  $("new-booking-open").addEventListener("click", () => {
    closeEditBooking();
    editor.hidden = false;
    $("new-booking-date").value =
      $("reservations-date").value || argentinaDay(new Date());
    $("new-booking-name").value = "";
    $("new-booking-phone").value = "";
    $("new-booking-notes").value = "";
    $("new-booking-duration").value = "90";
    loadAdminSlots();
    editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("new-booking-close").addEventListener("click", closeBookingEditor);
  $("new-booking-cancel").addEventListener("click", closeBookingEditor);
  $("new-booking-date").addEventListener("change", loadAdminSlots);
  $("new-booking-duration").addEventListener("change", loadAdminSlots);
  $("new-booking-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (bookingSaving) return;
    const slotIndex = $("new-booking-slot").value;
    const slot = availableSlots[Number(slotIndex)];
    if (slotIndex === "" || !slot) {
      display("new-booking-message", "Elegí un horario disponible.");
      return;
    }
    const fullName = $("new-booking-name").value.trim();
    const phone = $("new-booking-phone").value.trim();
    if (!fullName || !phone) {
      display("new-booking-message", "Completá el nombre y el teléfono.");
      return;
    }
    bookingSaving = true;
    $("new-booking-save").disabled = true;
    display("new-booking-message", "Guardando reserva…", true);
    try {
      const { data, error } = await supabaseClient.rpc("create_admin_booking_flexible", {
        p_full_name: fullName,
        p_phone: phone,
        p_starts_at: slot.starts_at,
        p_duration_minutes: Number($("new-booking-duration").value),
        p_notes: $("new-booking-notes").value.trim() || null,
      });
      if (error) throw error;
      if (!data || !data.length)
        throw new Error("No recibimos confirmación de la reserva.");
      const bookedDate = $("new-booking-date").value;
      closeBookingEditor();
      $("reservations-date").value = bookedDate;
      await loadReservations();
      display(
        "reservations-message",
        `Reserva creada correctamente. Código: ${data[0].reservation_code}`,
        true,
      );
    } catch (error) {
      console.error("Error creando reserva administrativa:", error);
      await loadAdminSlots();
      display(
        "new-booking-message",
        error.message || "No se pudo crear la reserva.",
      );
    } finally {
      bookingSaving = false;
      $("new-booking-save").disabled = false;
    }
  });
  // Tarjetas de fechas; navegación semanal con acceso también a fechas históricas.
  const dateCardsHost = $("admin-date-cards");
  const dateDisplay = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekLabels = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const monthLabels = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];
  const parseDay = (day) => new Date(`${day}T12:00:00Z`);
  const formatDay = (date) => date.toISOString().slice(0, 10);
  const mondayOf = (date) => {
    const result = new Date(date);
    const offset = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - offset);
    return result;
  };
  let firstVisibleDate = mondayOf(parseDay(argentinaDay(new Date())));
  function drawAdminDates() {
    const selected = $("reservations-date").value;
    dateCardsHost.replaceChildren();
    const today = argentinaDay(new Date());
    for (let i = 0; i < 21; i++) {
      const day = new Date(firstVisibleDate);
      day.setUTCDate(day.getUTCDate() + i);
      const iso = formatDay(day);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "admin-date-card";
      card.setAttribute("aria-pressed", String(selected === iso));
      card.setAttribute(
        "aria-label",
        dateDisplay.format(day) + (iso === today ? ", hoy" : ""),
      );
      const weekday = document.createElement("span");
      weekday.className = "admin-date-card__weekday";
      weekday.textContent = iso === today ? "HOY" : weekLabels[day.getUTCDay()];
      const number = document.createElement("span");
      number.className = "admin-date-card__number";
      number.textContent = day.getUTCDate();
      const month = document.createElement("span");
      month.className = "admin-date-card__month";
      month.textContent = monthLabels[day.getUTCMonth()];
      card.append(weekday, number, month);
      card.addEventListener("click", () => {
        $("reservations-date").value = iso;
        drawAdminDates();
        loadReservations();
      });
      dateCardsHost.append(card);
    }
    $("admin-selected-date").textContent = selected
      ? dateDisplay.format(parseDay(selected))
      : "";
  }
  // Escritorio: 7 días. Tablet y celular: tarjetas completas visibles.
  function calendarStepDays() {
    if (window.innerWidth > 1024) return 7;
    const firstCard = dateCardsHost.querySelector(".admin-date-card");
    if (!firstCard) return 1;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(dateCardsHost).gap) || 0;
    const availableWidth = dateCardsHost.clientWidth;
    const visibleCards = Math.floor(
      (availableWidth + gap + 0.5) / (cardWidth + gap),
    );
    return Math.max(1, Math.min(7, visibleCards));
  }
  const moveCalendar = (direction) => {
    const days = calendarStepDays();
    firstVisibleDate.setUTCDate(
      firstVisibleDate.getUTCDate() + direction * days,
    );
    drawAdminDates();
    dateCardsHost.scrollLeft = 0;
  };
  $("admin-dates-prev").addEventListener("click", () => moveCalendar(-1));
  $("admin-dates-next").addEventListener("click", () => moveCalendar(1));
  function syncDateCards() {
    const selected = $("reservations-date").value;
    if (!selected) return;
    const selectedDate = parseDay(selected);
    const end = new Date(firstVisibleDate);
    end.setUTCDate(end.getUTCDate() + 21);
    if (selectedDate < firstVisibleDate || selectedDate >= end)
      firstVisibleDate = mondayOf(selectedDate);
    drawAdminDates();
  }

  // Configuración real del complejo: se lee de Supabase y solo puede guardarse
  // cuando las filas existentes se cargaron correctamente bajo RLS de Admin.
  let configRows = [];
  let currentSettings = null;
  let configBusy = false;
  let configLoadCounter = 0;
  const configDays = [...document.querySelectorAll(".admin-weekly-day")];
  // Paso 35I: selects con horario 24 h en cualquier navegador, sin a. m./p. m.
  // La base de datos y el turnero trabajan con inicios en :00 o :30.
  const availableConfigTimes = Array.from({ length: 48 }, (_, index) => {
    const hh = String(Math.floor(index / 2)).padStart(2, "0");
    return `${hh}:${index % 2 === 0 ? "00" : "30"}`;
  });
  for (const select of document.querySelectorAll(".admin-weekly-time__select")) {
    const initialTime = select.value;
    const options = availableConfigTimes.map((time) => new Option(time, time));
    select.replaceChildren(...options);
    select.value = initialTime;
  }
  const configSave = $("admin-config-save");
  const configNote = (message, success = false) =>
    display("admin-config-message", message, success);
  const hhmm = (time) => String(time || "").slice(0, 5);
  const validConfigTime = (value) => /^([01]\d|2[0-3]):(00|30)$/.test(value);
  function fillConfig() {
    const byDay = new Map(configRows.map((row) => [Number(row.weekday), row]));
    for (let day = 1; day <= 7; day++) {
      const row = byDay.get(day);
      const dayFields = configDays[day - 1];
      dayFields.querySelector('input[type="checkbox"]').checked = Boolean(row.is_open);
      dayFields.querySelector('.admin-weekly-time--start select').value = hhmm(row.opening_time);
      dayFields.querySelector('.admin-weekly-time--end select').value = hhmm(row.last_start_time);
    }
    const windowMonths = $("admin-preview-window");
    windowMonths.value = String(currentSettings.default_window_months);
  }
  async function loadConfig() {
    const seq = ++configLoadCounter;
    configSave.disabled = true;
    configNote("Cargando configuración…", true);
    try {
      const [settingsResult, weeklyResult] = await Promise.all([
        supabaseClient
          .from("booking_settings")
          .select("id, default_window_months")
          .eq("id", 1)
          .single(),
        supabaseClient
          .from("weekly_hours")
          .select("id, court_id, weekday, is_open, opening_time, last_start_time")
          .order("weekday"),
      ]);
      if (seq !== configLoadCounter) return;
      if (settingsResult.error) throw settingsResult.error;
      if (weeklyResult.error) throw weeklyResult.error;
      const rows = weeklyResult.data || [];
      if (
        rows.length !== 7 ||
        new Set(rows.map((r) => Number(r.weekday))).size !== 7 ||
        new Set(rows.map((r) => r.court_id)).size !== 1
      ) {
        throw new Error(
          "La configuración semanal no contiene exactamente los 7 días de una cancha.",
        );
      }
      if (
        ![1, 2, 3].includes(Number(settingsResult.data?.default_window_months)) ||
        rows.some((row) =>
          !validConfigTime(hhmm(row.opening_time)) ||
          !validConfigTime(hhmm(row.last_start_time))
        )
      ) {
        throw new Error("Los horarios o el período almacenados no son válidos. Revisá la configuración en Supabase.");
      }
      currentSettings = settingsResult.data;
      configRows = rows;
      fillConfig();
      configSave.disabled = false;
      configNote("Configuración actual cargada desde Supabase.", true);
    } catch (error) {
      if (seq !== configLoadCounter) return;
      currentSettings = null;
      configRows = [];
      configSave.disabled = true;
      configNote(error.message || "No se pudo cargar la configuración.");
      console.error("Error cargando configuración del Admin:", error);
    }
  }
  function requestConfigConfirmation() {
    const dialog = $("admin-save-dialog");
    return new Promise((resolve) => {
      const cancel = $("admin-save-dialog-cancel");
      const accept = $("admin-save-dialog-accept");
      let finished = false;
      function finish(confirmed) {
        if (finished) return;
        finished = true;
        dialog.removeEventListener("close", onClose);
        cancel.removeEventListener("click", onCancel);
        accept.removeEventListener("click", onAccept);
        if (dialog.open) dialog.close();
        resolve(confirmed);
      }
      const onClose = () => finish(false);
      const onCancel = () => finish(false);
      const onAccept = () => finish(true);
      dialog.addEventListener("close", onClose);
      cancel.addEventListener("click", onCancel);
      accept.addEventListener("click", onAccept);
      dialog.showModal();
      cancel.focus();
    });
  }
  configSave.addEventListener("click", async () => {
    if (configBusy || !currentSettings || configRows.length !== 7) return;
    const months = Number($("admin-preview-window").value);
    if (![1, 2, 3].includes(months)) {
      configNote("Elegí un período de reservas válido.");
      return;
    }
    const days = [];
    for (let index = 0; index < configDays.length; index++) {
      const dayFields = configDays[index];
      const open = dayFields.querySelector('input[type="checkbox"]');
      const first = dayFields.querySelector('.admin-weekly-time--start select');
      const last = dayFields.querySelector('.admin-weekly-time--end select');
      const name = configDays[index].querySelector("strong").textContent;
      if (
        !validConfigTime(first.value) ||
        !validConfigTime(last.value) ||
        first.value > last.value
      ) {
        configNote(`Revisá los horarios de ${name}: usá horas en :00 o :30 y asegurate de que el último inicio no sea anterior al primero.`);
        return;
      }
      days.push({
        weekday: index + 1,
        is_open: open.checked,
        opening_time: first.value,
        last_start_time: last.value,
      });
    }
    if (!(await requestConfigConfirmation())) return;
    configBusy = true;
    configSave.disabled = true;
    configNote("Guardando cambios…", true);
    try {
      const { error } = await supabaseClient.rpc("save_admin_booking_config_flexible", {
        p_window_months: months,
        p_days: days,
      });
      if (error) throw error;
      await loadConfig();
      if (!currentSettings) throw new Error("No se pudo verificar la configuración guardada.");
      configNote("Configuración guardada correctamente.", true);
    } catch (error) {
      await loadConfig();
      configNote(error.message || "No se pudo guardar la configuración. Revisá los datos y reintentá.");
      console.error("Error guardando configuración:", error);
    } finally {
      configBusy = false;
    }
  });

  // Confirmación visual reutilizable y accesible para crear/desactivar bloqueos.
  // Conserva el comportamiento anterior: cancelar no ejecuta ninguna operación.
  function confirmBlockAction({
    title,
    description,
    hint,
    actionLabel,
    icon = "🗓",
  }) {
    const dialog = $("bp-block-dialog");
    $("bp-block-dialog-title").textContent = title;
    $("bp-block-dialog-description").textContent = description;
    $("bp-block-dialog-hint").textContent = hint;
    $("bp-block-dialog-accept").textContent = actionLabel;
    dialog.querySelector(".admin-save-dialog__icon").textContent = icon;
    return new Promise((resolve) => {
      const cancel = $("bp-block-dialog-cancel");
      const accept = $("bp-block-dialog-accept");
      const finish = (result) => {
        dialog.removeEventListener("cancel", onCancel);
        dialog.removeEventListener("close", onClose);
        cancel.removeEventListener("click", onNo);
        accept.removeEventListener("click", onYes);
        if (dialog.open) dialog.close();
        resolve(result);
      };
      const onCancel = (event) => {
        event.preventDefault();
        finish(false);
      };
      const onClose = () => finish(false);
      const onNo = () => finish(false);
      const onYes = () => finish(true);
      dialog.addEventListener("cancel", onCancel);
      dialog.addEventListener("close", onClose);
      cancel.addEventListener("click", onNo);
      accept.addEventListener("click", onYes);
      dialog.showModal();
      cancel.focus();
    });
  }

  // Bloqueos excepcionales: interfaz aislada; lecturas y escrituras solo mediante RPC Admin.
  const blockPanel = $("bp-block-panel");
  const blockNote = (message, success = false) =>
    display("bp-block-message", message, success);
  const blockListNote = (message, success = false) =>
    display("bp-block-list-message", message, success);
  const blockConflicts = $("bp-block-conflicts");
  let blockBusy = false;
  let blockPreviewKey = "";
  $("bp-block-save").disabled = true;
  const blockFields = () => ({
    p_day: $("bp-block-day").value,
    p_full_day: $("bp-block-type").value === "all",
    p_from:
      $("bp-block-type").value === "all" ? null : $("bp-block-from").value,
    p_until:
      $("bp-block-type").value === "all" ? null : $("bp-block-until").value,
  });
  const blockKey = () => JSON.stringify(blockFields());
  const blockTimeLabel = (stamp) => timeFormatter.format(new Date(stamp));
  function blockInputsValid() {
    const v = blockFields();
    if (!v.p_day || v.p_day < argentinaDay(new Date()))
      throw new Error("Elegí una fecha actual o futura.");
    if (!v.p_full_day && (!v.p_from || !v.p_until || v.p_from >= v.p_until))
      throw new Error(
        "Revisá las horas: el cierre debe ser posterior a la apertura.",
      );
    return v;
  }
  function blockInvalidatePreview() {
    blockPreviewKey = "";
    blockConflicts.hidden = true;
    blockConflicts.replaceChildren();
    blockNote("");
    $("bp-block-save").disabled = true;
  }
  function blockToggleHours() {
    const full = $("bp-block-type").value === "all";
    for (const el of document.querySelectorAll(".bp-block__time"))
      el.hidden = full;
    $("bp-block-from").required = !full;
    $("bp-block-until").required = !full;
    blockInvalidatePreview();
  }
  $("bp-block-type").addEventListener("change", blockToggleHours);
  for (const id of ["bp-block-day", "bp-block-from", "bp-block-until"])
    $(id).addEventListener("change", blockInvalidatePreview);
  $("bp-block-open").addEventListener("click", () => {
    blockPanel.hidden = false;
    $("bp-block-day").min = argentinaDay(new Date());
    if (!$("bp-block-day").value)
      $("bp-block-day").value = argentinaDay(new Date());
    blockToggleHours();
    blockPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("bp-block-close").addEventListener("click", () => {
    if (!blockBusy) blockPanel.hidden = true;
  });
  async function previewBlock() {
    const params = blockInputsValid();
    blockNote("Comprobando reservas…", true);
    const { data, error } = await supabaseClient.rpc(
      "bp_admin_blockout_conflicts",
      params,
    );
    if (error) throw error;
    blockConflicts.replaceChildren();
    const rows = data || [];
    if (rows.length) {
      const heading = document.createElement("div");
      heading.className = "bp-conflict__intro";
      const title = document.createElement("h3");
      title.textContent = "No se puede crear el bloqueo";
      const explanation = document.createElement("p");
      explanation.textContent = `Hay ${rows.length} ${rows.length === 1 ? "reserva vigente" : "reservas vigentes"} en la fecha o franja seleccionada. Reprogramalas o cancelalas antes de crear este cierre.`;
      heading.append(title, explanation);
      const cards = document.createElement("div");
      cards.className = "bp-conflict__cards";
      for (const item of rows) {
        const card = document.createElement("article");
        card.className = "bp-conflict__card";
        const time = document.createElement("strong");
        time.className = "bp-conflict__time";
        time.textContent = `${blockTimeLabel(item.starts_at)} a ${blockTimeLabel(item.ends_at)}`;
        const name = document.createElement("div");
        name.className = "bp-conflict__name";
        name.textContent = item.booking_name || "Cliente sin nombre";
        const phone = document.createElement("div");
        phone.className = "bp-conflict__detail";
        phone.textContent = `Teléfono: ${item.booking_phone || "No registrado"}`;
        const code = document.createElement("div");
        code.className = "bp-conflict__detail";
        code.textContent = `Código: ${item.reservation_code || "No disponible"}`;
        card.append(time, name, phone, code);
        cards.append(card);
      }
      const footer = document.createElement("div");
      footer.className = "bp-conflict__footer";
      const go = document.createElement("button");
      go.type = "button";
      go.className = "secondary bp-conflict__go";
      go.textContent = "Ver reservas del día";
      go.addEventListener("click", () => {
        setAdminSection("reservas");
        $("reservations-date").value = params.p_day;
        syncDateCards();
        viewingCancelled = false;
        $("show-cancelled").textContent = "Ver canceladas";
        $("show-cancelled").setAttribute("aria-pressed", "false");
        loadReservations();
        $("admin-reservas-view").scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      footer.append(go);
      blockConflicts.append(heading, cards, footer);
      blockConflicts.hidden = false;
      blockNote("");
      $("bp-block-save").disabled = true;
      blockPreviewKey = "";
    } else {
      blockConflicts.hidden = true;
      blockNote(
        "No se encontraron reservas en conflicto. Podés crear el bloqueo.",
        true,
      );
      $("bp-block-save").disabled = false;
      blockPreviewKey = blockKey();
    }
    return rows.length === 0;
  }
  $("bp-block-preview").addEventListener("click", async () => {
    if (blockBusy) return;
    try {
      await previewBlock();
    } catch (error) {
      blockInvalidatePreview();
      blockNote(error.message || "No fue posible comprobar las reservas.");
    }
  });
  async function loadBlockouts() {
    blockListNote("Consultando bloqueos…", true);
    const container = $("bp-block-list-content");
    try {
      const { data, error } = await supabaseClient.rpc(
        "bp_admin_list_blockouts",
      );
      if (error) throw error;
      container.replaceChildren();
      if (!data?.length) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "No hay bloqueos futuros activos.";
        container.append(p);
      }
      for (const item of data || []) {
        const entry = document.createElement("article");
        entry.className = "bp-block-entry";
        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `${new Intl.DateTimeFormat("es-AR", { timeZone: ARGENTINA_TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(item.starts_at))} · ${blockTimeLabel(item.starts_at)} a ${blockTimeLabel(item.ends_at)}`;
        const note = document.createElement("p");
        note.textContent = item.reason || "Sin motivo registrado";
        info.append(title, note);
        const cancel = document.createElement("button");
        cancel.className = "secondary";
        cancel.type = "button";
        cancel.textContent = "Desactivar";
        cancel.addEventListener("click", async () => {
          if (
            !(await confirmBlockAction({
              title: "Desactivar bloqueo",
              description: "¿Querés desactivar este cierre excepcional?",
              hint: "Los horarios que estén libres volverán a aparecer en el turnero.",
              actionLabel: "Sí, desactivar",
              icon: "↺",
            }))
          )
            return;
          cancel.disabled = true;
          const { error: err } = await supabaseClient.rpc(
            "bp_admin_disable_blockout",
            { p_id: item.id },
          );
          if (err) {
            blockListNote(err.message || "No se pudo desactivar el bloqueo.");
            cancel.disabled = false;
            return;
          }
          await loadBlockouts();
          blockListNote("Bloqueo desactivado correctamente.", true);
        });
        entry.append(info, cancel);
        container.append(entry);
      }
      blockListNote("");
    } catch (error) {
      blockListNote(error.message || "No se pudieron consultar los bloqueos.");
    }
  }
  $("bp-block-refresh").addEventListener("click", loadBlockouts);
  $("bp-block-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (blockBusy) return;
    let params;
    try {
      params = blockInputsValid();
    } catch (error) {
      blockNote(error.message);
      return;
    }
    if (blockPreviewKey !== blockKey()) {
      blockNote("Primero comprobá las reservas para esta fecha y horario.");
      return;
    }
    if (
      !(await confirmBlockAction({
        title: "Crear bloqueo excepcional",
        description:
          "¿Confirmás el cierre para la fecha y franja horaria seleccionadas?",
        hint: "No se modificarán los horarios semanales ni se cancelarán reservas.",
        actionLabel: "Sí, crear bloqueo",
      }))
    )
      return;
    blockBusy = true;
    $("bp-block-save").disabled = true;
    try {
      const { error } = await supabaseClient.rpc("bp_admin_create_blockout", {
        ...params,
        p_reason: $("bp-block-reason").value.trim() || null,
      });
      if (error) throw error;
      blockInvalidatePreview();
      blockNote("Bloqueo creado correctamente.", true);
      $("bp-block-form").reset();
      blockToggleHours();
      await loadBlockouts();
    } catch (error) {
      blockPreviewKey = "";
      blockNote(
        error.message ||
          "No se pudo crear el bloqueo. Verificá las reservas y reintentá.",
      );
    } finally {
      blockBusy = false;
      $("bp-block-save").disabled = false;
    }
  });

  // Módulo aislado de solicitudes fijas. La aprobación la valida íntegramente PostgreSQL.
  const fixedDays = [
    "",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];
  const fixedDate = (iso) =>
    iso ? iso.split("-").reverse().join("/") : "Sin fecha final";
  const fixedHour = (value) => String(value || "").slice(0, 5);
  const fixedStatus = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    suspended: "Suspendido",
    cancelled: "Cancelado",
    ended: "Finalizado",
  };
  const fixedList = $("admin-fixed-list");
  let fixedHideInactive = false;
  const fixedInactiveStatuses = new Set(["rejected", "cancelled", "ended"]);
  function fixedCell(label, value) {
    const d = document.createElement("div"),
      dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    d.append(dt, dd);
    return d;
  }
  function fixedWhatsapp(item) {
    // Normalizar celulares argentinos: 3492664153, 03492..., 15..., 54..., 549...
    // WhatsApp Web para Argentina espera 549 + 10 dígitos (sin 0 ni 15).
    let raw = String(item.customers?.phone || "").replace(/\D/g, "");
    if (raw.startsWith("00")) raw = raw.slice(2);
    if (raw.startsWith("549")) raw = raw.slice(3);
    else if (raw.startsWith("54")) raw = raw.slice(2);
    raw = raw.replace(/^0+/, "");
    // En el formato local argentino «15» puede anteceder al número móvil.
    if (raw.length === 12 && raw.slice(2, 4) === "15")
      raw = raw.slice(0, 2) + raw.slice(4);
    if (raw.length === 12 && raw.slice(3, 5) === "15")
      raw = raw.slice(0, 3) + raw.slice(5);
    if (raw.length === 12 && raw.slice(4, 6) === "15")
      raw = raw.slice(0, 4) + raw.slice(6);
    const phone = raw.length === 10 ? "549" + raw : "";
    const dateRange =
      item.duration_type === "indefinite"
        ? `desde el ${fixedDate(item.start_date)}, sin fecha final`
        : `del ${fixedDate(item.start_date)} al ${fixedDate(item.end_date)}`;
    const text =
      item.status === "approved"
        ? `¡Hola! Te escribimos de Boulevard Pádel. Tu turno fijo fue aprobado: todos los ${fixedDays[item.weekday]} a las ${fixedHour(item.start_time)} (${item.duration_minutes} minutos), ${dateRange}. ¡Te esperamos! 🎾`
        : `¡Hola! Te escribimos de Boulevard Pádel por tu solicitud de turno fijo para los ${fixedDays[item.weekday]} a las ${fixedHour(item.start_time)}. Queremos coordinar algunos detalles. 🎾`;
    return phone
      ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
  async function loadFixedRequests() {
    display("admin-fixed-message", "Consultando solicitudes…", true);
    fixedList.replaceChildren();
    const { data, error } = await supabaseClient.rpc(
      "bp_admin_list_fixed_requests",
    );
    if (error) {
      display(
        "admin-fixed-message",
        "No se pudieron consultar los turnos fijos. Verificá que el SQL 24 esté instalado.",
      );
      console.error("Turnos fijos:", error);
      return;
    }
    display("admin-fixed-message", "");
    const visible = (data || []).filter(
      (item) => !fixedHideInactive || !fixedInactiveStatuses.has(item.status),
    );
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "admin-fixed__empty";
      empty.textContent =
        data?.length && fixedHideInactive
          ? "No hay turnos activos ni pendientes. Podés volver a mostrar el historial."
          : "Todavía no hay solicitudes de turnos fijos.";
      fixedList.append(empty);
      return;
    }
    for (const item of visible) {
      const card = document.createElement("article");
      card.className = "admin-fixed__item";
      const head = document.createElement("div");
      head.className = "admin-fixed__item-header";
      const tag = document.createElement("span");
      tag.className =
        "admin-fixed__status" +
        (item.status === "pending" ? " admin-fixed__status--pending" : "");
      tag.textContent = fixedStatus[item.status] || item.status;
      const when = document.createElement("strong");
      when.textContent = `${fixedDays[item.weekday]} · ${fixedHour(item.start_time)}`;
      head.append(when, tag);
      const name = document.createElement("h2");
      name.textContent = item.customer_name || "Cliente";
      const details = document.createElement("dl");
      details.className = "admin-fixed__details";
      details.append(
        fixedCell("Teléfono", item.customer_phone || "—"),
        fixedCell("Duración", `${item.duration_minutes} minutos`),
        fixedCell("Comienza", fixedDate(item.start_date)),
        fixedCell(
          "Finaliza",
          item.duration_type === "indefinite"
            ? "Indeterminado"
            : fixedDate(item.end_date),
        ),
      );
      const actions = document.createElement("div");
      actions.className = "admin-fixed__actions";
      const whatsapp = document.createElement("a");
      whatsapp.className = "admin-fixed__whatsapp";
      whatsapp.href = fixedWhatsapp({
        ...item,
        customers: { phone: item.customer_phone },
      });
      whatsapp.target = "_blank";
      whatsapp.rel = "noopener noreferrer";
      whatsapp.textContent =
        item.status === "approved"
          ? "Avisar por WhatsApp"
          : "Contactar por WhatsApp";
      actions.append(whatsapp);
      if (item.status === "approved") {
        const release = document.createElement("button");
        release.type = "button";
        release.className = "secondary";
        release.textContent = "Liberar una fecha";
        release.addEventListener("click", () => fixedReleaseOne(item));
        const end = document.createElement("button");
        end.type = "button";
        end.className = "secondary";
        end.textContent = "Finalizar turno fijo";
        end.addEventListener("click", () => fixedEndEarly(item));
        actions.append(release, end);
      }
      if (item.status === "pending") {
        const approve = document.createElement("button");
        approve.className = "primary";
        approve.textContent = "Aprobar";
        const reject = document.createElement("button");
        reject.className = "secondary";
        reject.textContent = "Rechazar";
        if (item.duration_type === "indefinite") {
          approve.disabled = true;
          approve.title =
            "La aprobación indeterminada se habilitará al completar la renovación automática";
        }
        approve.addEventListener("click", () => fixedAction(item, "approve"));
        reject.addEventListener("click", () => fixedAction(item, "reject"));
        actions.append(approve, reject);
      }
      card.append(head, name, details);
      if (item.customer_notes) {
        const note = document.createElement("p");
        note.className = "admin-fixed__note";
        note.textContent = `Observaciones: ${item.customer_notes}`;
        card.append(note);
      }
      if (item.duration_type === "indefinite" && item.status === "pending") {
        const n = document.createElement("p");
        n.className = "admin-fixed__note";
        n.textContent =
          "Aprobación indeterminada pendiente de activar: requiere renovación automática segura de horarios.";
        card.append(n);
      }
      card.append(actions);
      fixedList.append(card);
    }
  }
  async function fixedAction(item, action) {
    const isApprove = action === "approve";
    const proceed = await confirmBlockAction({
      title: isApprove ? "Aprobar turno fijo" : "Rechazar solicitud",
      description: isApprove
        ? "¿Aprobar y reservar todas las fechas semanales de este período?"
        : "¿Confirmás el rechazo de esta solicitud?",
      hint: isApprove
        ? "Si hay reservas o bloqueos incompatibles, no se guardará ningún turno."
        : "La solicitud no ocupará horarios de la cancha.",
      actionLabel: isApprove ? "Sí, aprobar" : "Sí, rechazar",
      icon: isApprove ? "🔁" : "↩",
    });
    if (!proceed) return;
    display(
      "admin-fixed-message",
      isApprove
        ? "Comprobando disponibilidad y aprobando…"
        : "Rechazando solicitud…",
      true,
    );
    try {
      const { error } = await supabaseClient.rpc(
        isApprove
          ? "bp_admin_approve_fixed_request"
          : "bp_admin_reject_fixed_request",
        { p_id: item.id },
      );
      if (error) throw error;
      await loadFixedRequests();
      display(
        "admin-fixed-message",
        isApprove
          ? "Solicitud aprobada y horarios reservados. Podés avisarle al jugador por WhatsApp."
          : "Solicitud rechazada.",
        true,
      );
    } catch (e) {
      display(
        "admin-fixed-message",
        e.message || "No se pudo completar la operación.",
      );
      console.error(e);
    }
  }
  // Liberación puntual o definitiva. Solo RPC administrativa; no editar reservas desde JS.
  async function fixedReleaseOne(item) {
    display("admin-fixed-message", "Consultando fechas futuras…", true);
    const { data, error } = await supabaseClient.rpc(
      "bp_admin_fixed_future_dates",
      { p_id: item.id },
    );
    if (error) {
      display(
        "admin-fixed-message",
        error.message || "No se pudieron consultar las fechas.",
      );
      return;
    }
    if (!data?.length) {
      display(
        "admin-fixed-message",
        "Este turno fijo no tiene reservas futuras confirmadas para liberar.",
      );
      return;
    }
    display("admin-fixed-message", "");
    const choices = data.map((v) => ({
      id: v.reservation_id,
      label: new Intl.DateTimeFormat("es-AR", {
        timeZone: ARGENTINA_TZ,
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(v.starts_at)),
    }));
    const select = $("admin-fixed-release-select");
    select.replaceChildren();
    for (const choice of choices)
      select.add(new Option(choice.label, choice.id));
    $("admin-fixed-release-name").textContent = item.customer_name || "Jugador";
    const dialog = $("admin-fixed-release-dialog");
    dialog.showModal();
    $("admin-fixed-release-cancel").focus();
    const accepted = await new Promise((resolve) => {
      const yes = $("admin-fixed-release-accept"),
        no = $("admin-fixed-release-cancel");
      const finish = (value) => {
        dialog.removeEventListener("close", closed);
        yes.removeEventListener("click", approve);
        no.removeEventListener("click", cancel);
        if (dialog.open) dialog.close();
        resolve(value);
      };
      const closed = () => finish(null),
        approve = () => finish(select.value),
        cancel = () => finish(null);
      dialog.addEventListener("close", closed);
      yes.addEventListener("click", approve);
      no.addEventListener("click", cancel);
    });
    if (!accepted) return;
    display("admin-fixed-message", "Liberando la fecha seleccionada…", true);
    const result = await supabaseClient.rpc("bp_admin_release_fixed_date", {
      p_id: item.id,
      p_reservation_id: accepted,
    });
    if (result.error) {
      display(
        "admin-fixed-message",
        result.error.message || "No se pudo liberar la fecha.",
      );
      return;
    }
    await loadFixedRequests();
    display(
      "admin-fixed-message",
      "La fecha fue liberada. Las demás semanas siguen reservadas.",
      true,
    );
  }
  async function fixedEndEarly(item) {
    const proceed = await confirmBlockAction({
      title: "Finalizar turno fijo",
      description: `¿Finalizar definitivamente el turno fijo de ${item.customer_name || "este jugador"}?`,
      hint: "Se liberarán todas sus reservas futuras. Las fechas anteriores quedarán en el historial. Esta acción no se puede deshacer automáticamente.",
      actionLabel: "Sí, finalizar",
      icon: "📅",
    });
    if (!proceed) return;
    display(
      "admin-fixed-message",
      "Finalizando turno fijo y liberando fechas futuras…",
      true,
    );
    const { data, error } = await supabaseClient.rpc(
      "bp_admin_end_fixed_request",
      { p_id: item.id },
    );
    if (error) {
      display(
        "admin-fixed-message",
        error.message || "No se pudo finalizar el turno fijo.",
      );
      return;
    }
    await loadFixedRequests();
    display(
      "admin-fixed-message",
      `Turno fijo finalizado. Se liberaron ${data} reservas futuras.`,
      true,
    );
  }

  $("admin-fixed-clear").addEventListener("click", () => {
    fixedHideInactive = !fixedHideInactive;
    const button = $("admin-fixed-clear");
    button.textContent = fixedHideInactive
      ? "Mostrar historial"
      : "Limpiar vista";
    button.setAttribute("aria-pressed", String(fixedHideInactive));
    loadFixedRequests();
  });
  $("admin-fixed-refresh").addEventListener("click", loadFixedRequests);

  // Navegación entre reservas y maquetas visuales; no realiza escrituras.
  const setAdminSection = (section) => {
    const sections = {
      reservas: ["admin-reservas-view", "admin-tab-reservas"],
      config: ["admin-config-view", "admin-tab-config"],
      torneos: ["admin-torneos-view", "admin-tab-torneos"],
      fijos: ["admin-fijos-view", "admin-tab-fijos"],
    };
    for (const [name, [viewId, tabId]] of Object.entries(sections)) {
      const selected = name === section;
      $(viewId).hidden = !selected;
      const button = $(tabId);
      button.classList.toggle("is-current", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  };
  $("admin-tab-reservas").addEventListener("click", () =>
    setAdminSection("reservas"),
  );
  $("admin-tab-config").addEventListener("click", () => {
    setAdminSection("config");
    loadConfig();
    loadBlockouts();
  });
  $("admin-tab-torneos").addEventListener("click", () =>
    setAdminSection("torneos"),
  );
  $("admin-tab-fijos").addEventListener("click", () => {
    setAdminSection("fijos");
    loadFixedRequests();
  });
  $("reservations-date").value = argentinaDay(new Date());
  syncDateCards();
  $("show-cancelled").addEventListener("click", async () => {
    viewingCancelled = !viewingCancelled;
    $("show-cancelled").textContent = viewingCancelled
      ? "Ver activas"
      : "Ver canceladas";
    $("show-cancelled").setAttribute("aria-pressed", String(viewingCancelled));
    await loadReservations();
  });
  $("reservations-date").addEventListener("change", () => {
    syncDateCards();
    loadReservations();
  });
  $("refresh-reservations").addEventListener("click", loadReservations);
  async function verifySession() {
    if (recoveryMode) {
      show("recovery-panel");
      return;
    }
    show("loading-panel");
    try {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser();
      if (recoveryMode) {
        show("recovery-panel");
        return;
      }
      if (error || !user) {
        show("login-panel");
        return;
      }
      const profile = await getAdminProfile(user);
      if (recoveryMode) {
        show("recovery-panel");
        return;
      }
      if (!profile) {
        await supabaseClient.auth.signOut();
        display(
          "login-message",
          "Esta cuenta no tiene permiso para administrar Boulevard Pádel.",
        );
        show("login-panel");
        return;
      }
      $("admin-name").textContent =
        profile.full_name || user.email || "Acceso autorizado";
      show("dashboard-panel");
      await loadReservations();
    } catch (error) {
      display(
        "login-message",
        error.message || "No se pudo verificar el acceso.",
      );
      show("login-panel");
    }
  }

  // Supabase procesa el enlace de recuperación al iniciar su cliente.
  // El evento evita mostrar el panel cuando se abre ese enlace.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryMode = true;
      show("recovery-panel");
    }
  });

  $("forgot-button").addEventListener("click", () => {
    $("request-email").value = $("email").value.trim();
    display("request-message", "");
    show("request-panel");
  });
  $("request-back").addEventListener("click", () => show("login-panel"));

  $("request-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (operation) return;
    operation = true;
    $("request-button").disabled = true;
    display("request-message", "");
    try {
      const email = $("request-email").value.trim();
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/admin/index.html`,
      });
      if (error) throw error;
      display(
        "request-message",
        "Si el correo está registrado, recibirás un enlace para restablecer la contraseña. Revisá también spam.",
        true,
      );
    } catch (error) {
      display(
        "request-message",
        "No se pudo enviar el enlace. Esperá un momento e intentá nuevamente.",
      );
    } finally {
      operation = false;
      $("request-button").disabled = false;
    }
  });

  $("recovery-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (operation) return;
    const password = $("new-password").value;
    if (password.length < 12) {
      display("recovery-message", "Usá al menos 12 caracteres.");
      return;
    }
    if (password !== $("confirm-password").value) {
      display("recovery-message", "Las contraseñas no coinciden.");
      return;
    }
    operation = true;
    $("recovery-button").disabled = true;
    display("recovery-message", "");
    try {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();
      if (userError || !user || !recoveryMode)
        throw new Error(
          "El enlace no es válido o ya venció. Solicitá uno nuevo.",
        );
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      // Al finalizar la recuperación, exigir un nuevo inicio de sesión.
      await supabaseClient.auth.signOut();
      recoveryMode = false;
      history.replaceState(null, "", location.pathname);
      $("new-password").value = "";
      $("confirm-password").value = "";
      display(
        "login-message",
        "Contraseña actualizada. Ahora podés ingresar.",
        true,
      );
      show("login-panel");
    } catch (error) {
      display(
        "recovery-message",
        error.message || "No se pudo guardar la contraseña.",
      );
    } finally {
      operation = false;
      $("recovery-button").disabled = false;
    }
  });

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (operation) return;
    operation = true;
    $("login-button").disabled = true;
    $("login-button").textContent = "Ingresando…";
    display("login-message", "");
    try {
      const email = $("email").value.trim(),
        password = $("password").value;
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        throw new Error(
          "Correo o contraseña incorrectos, o acceso no disponible.",
        );
      $("password").value = "";
      await verifySession();
    } catch (error) {
      display("login-message", error.message || "No se pudo iniciar sesión.");
      show("login-panel");
    } finally {
      operation = false;
      $("login-button").disabled = false;
      $("login-button").textContent = "Ingresar";
    }
  });
  $("logout-button").addEventListener("click", async () => {
    if (operation) return;
    operation = true;
    $("logout-button").disabled = true;
    try {
      closeBookingEditor();
      closeCancelBooking();
      ++reservationsRequest;
      await supabaseClient.auth.signOut();
      $("reservations-list").replaceChildren();
      display("login-message", "");
      show("login-panel");
    } finally {
      $("logout-button").disabled = false;
      operation = false;
    }
  });

  // Durante el canje de tokens, mantener visible el estado de verificación.
  if (recoveryInUrl()) show("loading-panel");
  verifySession();
})();
