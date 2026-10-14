/* Boulevard Pádel — Portal Admin (acceso y recuperación). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panels = ['login-panel', 'request-panel', 'recovery-panel', 'dashboard-panel', 'loading-panel'].map($);
  let operation = false;
  let recoveryMode = false;
  const show = (id) => panels.forEach((p) => { p.hidden = p.id !== id; });
  const display = (id, text, success = false) => {
    const el = $(id); el.textContent = text; el.hidden = !text; el.classList.toggle('success', success);
  };
  const recoveryInUrl = () =>
    new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery' ||
    new URLSearchParams(location.search).get('type') === 'recovery';

  async function getAdminProfile(user) {
    const { data, error } = await supabaseClient.from('profiles')
      .select('full_name, role, active').eq('id', user.id).maybeSingle();
    if (error) throw new Error('No pudimos verificar los permisos del administrador.');
    if (!data || data.role !== 'admin' || data.active !== true) return null;
    return data;
  }
  const ARGENTINA_TZ = 'America/Argentina/Cordoba';
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const timeFormatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  let reservationsRequest = 0;
  let loadedReservations = [];
  let viewingCancelled = false;
  const argentinaDay = (date) => {
    const parts = Object.fromEntries(dateFormatter.formatToParts(date)
      .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  // Argentina no utiliza horario de verano actualmente (UTC-03:00).
  const dateBounds = (day) => {
    const start = new Date(`${day}T03:00:00.000Z`);
    const end = new Date(start.getTime() + 86400000);
    if (Number.isNaN(start.getTime())) throw new Error('Seleccioná una fecha válida.');
    return [start.toISOString(), end.toISOString()];
  };
  function safeText(element, value) { element.textContent = String(value ?? ''); }
  function renderReservations(rows) {
    const list = $('reservations-list');
    list.replaceChildren();
    safeText($('reservations-count'), `${rows.length} ${rows.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}${viewingCancelled ? ' · Canceladas' : ' · Activas'}`);
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state'; empty.textContent = viewingCancelled ? 'No hay reservas canceladas para esta fecha.' : 'No hay reservas activas para esta fecha.';
      list.append(empty); return;
    }
    for (const item of rows) {
      const card = document.createElement('article'); card.className = 'reservation-card';
      const top = document.createElement('div'); top.className = 'reservation-card__top';
      const schedule = document.createElement('strong');
      safeText(schedule, `${timeFormatter.format(new Date(item.starts_at))} a ${timeFormatter.format(new Date(item.ends_at))}`);
      const status = document.createElement('span'); status.className = 'reservation-status';
      const statuses = { confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada', no_show: 'No asistió' };
      safeText(status, statuses[item.status] || item.status || 'Sin estado');
      top.append(schedule, status);
      const name = document.createElement('h3'); safeText(name, item.booking_name || item.customers?.full_name || 'Cliente sin nombre');
      const court = document.createElement('p'); court.className = 'reservation-muted';
      safeText(court, item.courts?.name || item.courts?.court_name || 'Cancha');
      const phone = document.createElement('p'); phone.className = 'reservation-muted';
      safeText(phone, `Teléfono: ${item.booking_phone || item.customers?.phone || 'No registrado'}`);
      const code = document.createElement('p'); code.className = 'reservation-code';
      safeText(code, `Código: ${item.reservation_code}`);
      card.append(top, name, court, phone, code);
      if (item.notes) {
        const notes = document.createElement('p'); notes.className = 'reservation-muted';
        safeText(notes, `Observaciones: ${item.notes}`); card.append(notes);
      }
      const actions = document.createElement('div');
      actions.className = 'reservation-card__actions';
      for (const [label, modifier] of [['Editar', 'edit'], ['Cancelar', 'cancel']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `reservation-action reservation-action--${modifier}`;
        button.textContent = label;
        button.disabled = item.status !== 'confirmed';
        button.title = button.disabled ? 'Solo reservas confirmadas' : `${label} esta reserva`;
        if (!button.disabled) button.addEventListener('click', () => modifier === 'edit' ? openEditBooking(item) : openCancelBooking(item));
        actions.append(button);
      }
      card.append(actions);
      list.append(card);
    }
  }
  async function loadReservations() {
    const requestId = ++reservationsRequest;
    const day = $('reservations-date').value;
    if (!day) return;
    syncDateCards();
    $('refresh-reservations').disabled = true;
    display('reservations-message', 'Cargando reservas…', true);
    try {
      const [from, until] = dateBounds(day);
      const { data, error } = await supabaseClient.from('reservations')
        .select('id, reservation_code, starts_at, ends_at, status, notes, booking_name, booking_phone, customers(full_name,phone), courts(*)')
        .eq('status', viewingCancelled ? 'cancelled' : 'confirmed')
        .gte('starts_at', from).lt('starts_at', until).order('starts_at', { ascending: true });
      if (error) throw error;
      if (requestId !== reservationsRequest) return;
      loadedReservations = data || [];
      renderReservations(loadedReservations);
      display('reservations-message', '');
    } catch (error) {
      if (requestId !== reservationsRequest) return;
      $('reservations-list').replaceChildren();
      safeText($('reservations-count'), '');
      display('reservations-message', 'No se pudieron consultar las reservas. Revisaremos el acceso a Supabase.');
      console.error('Error de lectura de reservas:', error);
    } finally {
      if (requestId === reservationsRequest) $('refresh-reservations').disabled = false;
    }
  }
  // Cancelación administrativa: confirmación explícita, conserva el historial.
  const cancelDialog = $('cancel-booking-dialog');
  let cancelTarget = null;
  let cancelInProgress = false;
  let cancelReturnFocus = null;
  const cancelContent = $('cancel-booking-content');
  function closeCancelBooking() {
    if (cancelInProgress) return;
    cancelDialog.hidden = true;
    cancelTarget = null;
    display('cancel-booking-message', '');
    document.body.classList.remove('admin-dialog-open');
    if (cancelReturnFocus?.isConnected) cancelReturnFocus.focus();
    cancelReturnFocus = null;
  }
  function openCancelBooking(item) {
    if (item.status !== 'confirmed' || cancelInProgress) return;
    cancelReturnFocus = document.activeElement;
    cancelTarget = { id: item.id, reservation_code: item.reservation_code };
    const date = new Intl.DateTimeFormat('es-AR', { timeZone: ARGENTINA_TZ, dateStyle: 'full' }).format(new Date(item.starts_at));
    safeText($('cancel-detail-name'), item.booking_name || item.customers?.full_name || 'Cliente');
    safeText($('cancel-detail-date'), date);
    safeText($('cancel-detail-time'), `${timeFormatter.format(new Date(item.starts_at))} a ${timeFormatter.format(new Date(item.ends_at))}`);
    safeText($('cancel-detail-code'), item.reservation_code);
    display('cancel-booking-message', '');
    cancelDialog.hidden = false;
    document.body.classList.add('admin-dialog-open');
    cancelContent.focus();
  }
  $('cancel-booking-back').addEventListener('click', closeCancelBooking);
  $('cancel-booking-backdrop').addEventListener('click', closeCancelBooking);
  document.addEventListener('keydown', (event) => {
    if (cancelDialog.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeCancelBooking(); }
    if (event.key === 'Tab') {
      const controls = [$('cancel-booking-back'), $('cancel-booking-confirm')];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[1]) { event.preventDefault(); controls[0].focus(); }
    }
  });
  $('cancel-booking-confirm').addEventListener('click', async () => {
    if (!cancelTarget || cancelInProgress) return;
    cancelInProgress = true;
    const id = cancelTarget.id;
    const confirm = $('cancel-booking-confirm');
    confirm.disabled = true;
    $('cancel-booking-back').disabled = true;
    display('cancel-booking-message', 'Cancelando reserva…', true);
    try {
      const { data, error } = await supabaseClient.rpc('cancel_admin_booking', { p_reservation_id: id });
      if (error) throw error;
      if (!data?.length || data[0].status !== 'cancelled') throw new Error('No se recibió confirmación de la cancelación.');
      cancelInProgress = false;
      closeCancelBooking();
      await loadReservations();
      display('reservations-message', `Reserva ${data[0].reservation_code} cancelada correctamente. El horario está disponible.`, true);
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      display('cancel-booking-message', error.message || 'No se pudo cancelar la reserva.');
    } finally {
      cancelInProgress = false;
      confirm.disabled = false;
      $('cancel-booking-back').disabled = false;
    }
  });
  // Edición: la opción original permanece disponible para no forzar un cambio de turno.
  const editPanel = $('edit-booking-panel');
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
    display('edit-booking-message', '');
  }
  async function loadEditSlots() {
    const req = ++editSlotsRequest;
    const day = $('edit-booking-date').value;
    const select = $('edit-booking-slot');
    editSlots = [];
    select.replaceChildren(new Option('Consultando horarios…', ''));
    select.disabled = true;
    display('edit-booking-message', '');
    if (!day || !editing) return;
    try {
      const { data, error } = await supabaseClient.rpc('get_available_slots', { p_date: day });
      if (error) throw error;
      if (req !== editSlotsRequest || !editing || editPanel.hidden) return;
      const slots = (data || []).filter((v) => v.starts_at && Number.isFinite(isoMillis(v.starts_at)));
      if (day === argentinaDay(new Date(editing.starts_at))) {
        // La reserva actual no aparece en los slots libres: incluirla una sola vez.
        if (!slots.some((v) => isoMillis(v.starts_at) === isoMillis(editing.starts_at))) {
          slots.push({ starts_at: editing.starts_at });
        }
      }
      slots.sort((a,b) => isoMillis(a.starts_at) - isoMillis(b.starts_at));
      editSlots = slots;
      select.replaceChildren(new Option(slots.length ? 'Seleccioná un horario' : 'No hay horarios disponibles', ''));
      slots.forEach((slot, i) => {
        const isCurrent = isoMillis(slot.starts_at) === isoMillis(editing.starts_at);
        select.add(new Option(`${timeFormatter.format(new Date(slot.starts_at))}${isCurrent ? ' (horario actual)' : ''}`, String(i)));
        if (isCurrent) select.value = String(i);
      });
      select.disabled = !slots.length;
    } catch (error) {
      if (req !== editSlotsRequest) return;
      select.replaceChildren(new Option('No se pudieron cargar los horarios', ''));
      display('edit-booking-message', 'No se pudo consultar la disponibilidad. Intentá cambiar la fecha y volver.');
      console.error('Error cargando horarios de edición:', error);
    }
  }
  function openEditBooking(item) {
    if (item.status !== 'confirmed') return;
    closeBookingEditor();
    editing = { ...item };
    editPanel.hidden = false;
    safeText($('edit-booking-code'), `Código: ${item.reservation_code}`);
    $('edit-booking-date').value = argentinaDay(new Date(item.starts_at));
    $('edit-booking-name').value = item.booking_name || item.customers?.full_name || '';
    $('edit-booking-phone').value = item.booking_phone || item.customers?.phone || '';
    $('edit-booking-notes').value = item.notes || '';
    loadEditSlots();
    editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  $('edit-booking-close').addEventListener('click', closeEditBooking);
  $('edit-booking-cancel').addEventListener('click', closeEditBooking);
  $('edit-booking-date').addEventListener('change', loadEditSlots);
  $('edit-booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!editing || editSaving) return;
    const indexText = $('edit-booking-slot').value;
    const slot = indexText === '' ? null : editSlots[Number(indexText)];
    if (!slot) { display('edit-booking-message', 'Elegí un horario válido.'); return; }
    const name = $('edit-booking-name').value.trim();
    const phone = $('edit-booking-phone').value.trim();
    if (!name || !phone) { display('edit-booking-message', 'Completá nombre y teléfono.'); return; }
    editSaving = true;
    $('edit-booking-save').disabled = true;
    display('edit-booking-message', 'Guardando cambios…', true);
    try {
      const { data, error } = await supabaseClient.rpc('update_admin_booking', {
        p_reservation_id: editing.id,
        p_full_name: name,
        p_phone: phone,
        p_starts_at: slot.starts_at,
        p_notes: $('edit-booking-notes').value.trim() || null
      });
      if (error) throw error;
      if (!data || !data.length) throw new Error('No recibimos confirmación de los cambios.');
      const day = $('edit-booking-date').value;
      editSaving = false;
      closeEditBooking();
      $('reservations-date').value = day;
      await loadReservations();
      display('reservations-message', `Reserva actualizada. Código: ${data[0].reservation_code}`, true);
    } catch (error) {
      console.error('Error editando reserva:', error);
      display('edit-booking-message', error.message || 'No se pudo editar la reserva.');
    } finally {
      editSaving = false;
      $('edit-booking-save').disabled = false;
    }
  });
  // Nueva reserva: mismas franjas que el turnero público, sin horarios hardcodeados.
  let availableSlots = [];
  let slotsRequest = 0;
  let bookingSaving = false;
  const editor = $('new-booking-panel');
  const setSlotPlaceholder = (message) => {
    const select = $('new-booking-slot');
    select.replaceChildren(new Option(message, ''));
    select.disabled = true;
  };
  function closeBookingEditor() {
    ++slotsRequest;
    editor.hidden = true;
    display('new-booking-message', '');
  }
  async function loadAdminSlots() {
    const request = ++slotsRequest;
    const day = $('new-booking-date').value;
    availableSlots = [];
    setSlotPlaceholder(day ? 'Consultando horarios…' : 'Elegí primero una fecha');
    display('new-booking-message', '');
    if (!day) return;
    try {
      const { data, error } = await supabaseClient.rpc('get_available_slots', { p_date: day });
      if (error) throw error;
      if (request !== slotsRequest || editor.hidden) return;
      const select = $('new-booking-slot');
      availableSlots = (data || []).filter((slot) => slot.starts_at && !Number.isNaN(new Date(slot.starts_at).getTime()));
      select.replaceChildren(new Option(availableSlots.length ? 'Seleccioná un horario' : 'No hay horarios disponibles', ''));
      availableSlots.forEach((slot, i) => {
        const time = timeFormatter.format(new Date(slot.starts_at));
        select.add(new Option(time, String(i)));
      });
      select.disabled = !availableSlots.length;
    } catch (error) {
      if (request !== slotsRequest) return;
      setSlotPlaceholder('No se pudieron cargar horarios');
      display('new-booking-message', 'No se pudo consultar la disponibilidad. Intentá otra vez.');
      console.error('Error consultando horarios del Admin:', error);
    }
  }
  $('new-booking-open').addEventListener('click', () => {
    closeEditBooking();
    editor.hidden = false;
    $('new-booking-date').value = $('reservations-date').value || argentinaDay(new Date());
    $('new-booking-name').value = '';
    $('new-booking-phone').value = '';
    $('new-booking-notes').value = '';
    loadAdminSlots();
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('new-booking-close').addEventListener('click', closeBookingEditor);
  $('new-booking-cancel').addEventListener('click', closeBookingEditor);
  $('new-booking-date').addEventListener('change', loadAdminSlots);
  $('new-booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (bookingSaving) return;
    const slotIndex = $('new-booking-slot').value;
    const slot = availableSlots[Number(slotIndex)];
    if (slotIndex === '' || !slot) {
      display('new-booking-message', 'Elegí un horario disponible.');
      return;
    }
    const fullName = $('new-booking-name').value.trim();
    const phone = $('new-booking-phone').value.trim();
    if (!fullName || !phone) {
      display('new-booking-message', 'Completá el nombre y el teléfono.');
      return;
    }
    bookingSaving = true;
    $('new-booking-save').disabled = true;
    display('new-booking-message', 'Guardando reserva…', true);
    try {
      const { data, error } = await supabaseClient.rpc('create_admin_booking', {
        p_full_name: fullName, p_phone: phone,
        p_starts_at: slot.starts_at,
        p_notes: $('new-booking-notes').value.trim() || null
      });
      if (error) throw error;
      if (!data || !data.length) throw new Error('No recibimos confirmación de la reserva.');
      const bookedDate = $('new-booking-date').value;
      closeBookingEditor();
      $('reservations-date').value = bookedDate;
      await loadReservations();
      display('reservations-message', `Reserva creada correctamente. Código: ${data[0].reservation_code}`, true);
    } catch (error) {
      console.error('Error creando reserva administrativa:', error);
      await loadAdminSlots();
      display('new-booking-message', error.message || 'No se pudo crear la reserva.');
    } finally {
      bookingSaving = false;
      $('new-booking-save').disabled = false;
    }
  });
  // Tarjetas de fechas; navegación semanal con acceso también a fechas históricas.
  const dateCardsHost = $('admin-date-cards');
  const dateDisplay = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekLabels = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  const monthLabels = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const parseDay = (day) => new Date(`${day}T12:00:00Z`);
  const formatDay = (date) => date.toISOString().slice(0,10);
  const mondayOf = (date) => {
    const result = new Date(date);
    const offset = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - offset);
    return result;
  };
  let firstVisibleDate = mondayOf(parseDay(argentinaDay(new Date())));
  function drawAdminDates() {
    const selected = $('reservations-date').value;
    dateCardsHost.replaceChildren();
    const today = argentinaDay(new Date());
    for (let i = 0; i < 21; i++) {
      const day = new Date(firstVisibleDate);
      day.setUTCDate(day.getUTCDate() + i);
      const iso = formatDay(day);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'admin-date-card';
      card.setAttribute('aria-pressed', String(selected === iso));
      card.setAttribute('aria-label', dateDisplay.format(day) + (iso === today ? ', hoy' : ''));
      const weekday = document.createElement('span');
      weekday.className = 'admin-date-card__weekday';
      weekday.textContent = iso === today ? 'HOY' : weekLabels[day.getUTCDay()];
      const number = document.createElement('span');
      number.className = 'admin-date-card__number';
      number.textContent = day.getUTCDate();
      const month = document.createElement('span');
      month.className = 'admin-date-card__month';
      month.textContent = monthLabels[day.getUTCMonth()];
      card.append(weekday, number, month);
      card.addEventListener('click', () => {
        $('reservations-date').value = iso;
        drawAdminDates();
        loadReservations();
      });
      dateCardsHost.append(card);
    }
    $('admin-selected-date').textContent = selected ? dateDisplay.format(parseDay(selected)) : '';
  }
  // Escritorio: 7 días. Tablet y celular: tarjetas completas visibles.
  function calendarStepDays() {
    if (window.innerWidth > 1024) return 7;
    const firstCard = dateCardsHost.querySelector('.admin-date-card');
    if (!firstCard) return 1;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(dateCardsHost).gap) || 0;
    const availableWidth = dateCardsHost.clientWidth;
    const visibleCards = Math.floor((availableWidth + gap + 0.5) / (cardWidth + gap));
    return Math.max(1, Math.min(7, visibleCards));
  }
  const moveCalendar = (direction) => {
    const days = calendarStepDays();
    firstVisibleDate.setUTCDate(firstVisibleDate.getUTCDate() + direction * days);
    drawAdminDates();
    dateCardsHost.scrollLeft = 0;
  };
  $('admin-dates-prev').addEventListener('click', () => moveCalendar(-1));
  $('admin-dates-next').addEventListener('click', () => moveCalendar(1));
  function syncDateCards() {
    const selected = $('reservations-date').value;
    if (!selected) return;
    const selectedDate = parseDay(selected);
    const end = new Date(firstVisibleDate);
    end.setUTCDate(end.getUTCDate() + 21);
    if (selectedDate < firstVisibleDate || selectedDate >= end) firstVisibleDate = mondayOf(selectedDate);
    drawAdminDates();
  }

  // Navegación entre reservas y maquetas visuales; no realiza escrituras.
  const setAdminSection = (section) => {
    const sections = {
      reservas: ['admin-reservas-view', 'admin-tab-reservas'],
      config: ['admin-config-view', 'admin-tab-config'],
      torneos: ['admin-torneos-view', 'admin-tab-torneos']
    };
    for (const [name, [viewId, tabId]] of Object.entries(sections)) {
      const selected = name === section;
      $(viewId).hidden = !selected;
      const button = $(tabId);
      button.classList.toggle('is-current', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  };
  $('admin-tab-reservas').addEventListener('click', () => setAdminSection('reservas'));
  $('admin-tab-config').addEventListener('click', () => setAdminSection('config'));
  $('admin-tab-torneos').addEventListener('click', () => setAdminSection('torneos'));
  $('reservations-date').value = argentinaDay(new Date());
  syncDateCards();
  $('show-cancelled').addEventListener('click', async () => {
    viewingCancelled = !viewingCancelled;
    $('show-cancelled').textContent = viewingCancelled ? 'Ver activas' : 'Ver canceladas';
    $('show-cancelled').setAttribute('aria-pressed', String(viewingCancelled));
    await loadReservations();
  });
  $('reservations-date').addEventListener('change', () => { syncDateCards(); loadReservations(); });
  $('refresh-reservations').addEventListener('click', loadReservations);
  async function verifySession() {
    if (recoveryMode) { show('recovery-panel'); return; }
    show('loading-panel');
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (recoveryMode) { show('recovery-panel'); return; }
      if (error || !user) { show('login-panel'); return; }
      const profile = await getAdminProfile(user);
      if (recoveryMode) { show('recovery-panel'); return; }
      if (!profile) {
        await supabaseClient.auth.signOut();
        display('login-message', 'Esta cuenta no tiene permiso para administrar Boulevard Pádel.');
        show('login-panel'); return;
      }
      $('admin-name').textContent = profile.full_name || user.email || 'Acceso autorizado';
      show('dashboard-panel');
      await loadReservations();
    } catch (error) {
      display('login-message', error.message || 'No se pudo verificar el acceso.');
      show('login-panel');
    }
  }

  // Supabase procesa el enlace de recuperación al iniciar su cliente.
  // El evento evita mostrar el panel cuando se abre ese enlace.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      show('recovery-panel');
    }
  });

  $('forgot-button').addEventListener('click', () => {
    $('request-email').value = $('email').value.trim();
    display('request-message', ''); show('request-panel');
  });
  $('request-back').addEventListener('click', () => show('login-panel'));

  $('request-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (operation) return;
    operation = true; $('request-button').disabled = true;
    display('request-message', '');
    try {
      const email = $('request-email').value.trim();
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/admin/index.html`,
      });
      if (error) throw error;
      display('request-message', 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña. Revisá también spam.', true);
    } catch (error) {
      display('request-message', 'No se pudo enviar el enlace. Esperá un momento e intentá nuevamente.');
    } finally { operation = false; $('request-button').disabled = false; }
  });

  $('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault(); if (operation) return;
    const password = $('new-password').value;
    if (password.length < 12) { display('recovery-message', 'Usá al menos 12 caracteres.'); return; }
    if (password !== $('confirm-password').value) {
      display('recovery-message', 'Las contraseñas no coinciden.'); return;
    }
    operation = true; $('recovery-button').disabled = true;
    display('recovery-message', '');
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user || !recoveryMode) throw new Error('El enlace no es válido o ya venció. Solicitá uno nuevo.');
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;
      // Al finalizar la recuperación, exigir un nuevo inicio de sesión.
      await supabaseClient.auth.signOut();
      recoveryMode = false;
      history.replaceState(null, '', location.pathname);
      $('new-password').value = ''; $('confirm-password').value = '';
      display('login-message', 'Contraseña actualizada. Ahora podés ingresar.', true);
      show('login-panel');
    } catch (error) {
      display('recovery-message', error.message || 'No se pudo guardar la contraseña.');
    } finally { operation = false; $('recovery-button').disabled = false; }
  });

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (operation) return;
    operation = true; $('login-button').disabled = true;
    $('login-button').textContent = 'Ingresando…'; display('login-message', '');
    try {
      const email = $('email').value.trim(), password = $('password').value;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw new Error('Correo o contraseña incorrectos, o acceso no disponible.');
      $('password').value = '';
      await verifySession();
    } catch (error) {
      display('login-message', error.message || 'No se pudo iniciar sesión.'); show('login-panel');
    } finally { operation = false; $('login-button').disabled = false; $('login-button').textContent = 'Ingresar'; }
  });
  $('logout-button').addEventListener('click', async () => {
    if (operation) return;
    operation = true; $('logout-button').disabled = true;
    try { closeBookingEditor(); closeCancelBooking(); ++reservationsRequest; await supabaseClient.auth.signOut(); $('reservations-list').replaceChildren(); display('login-message', ''); show('login-panel'); }
    finally { $('logout-button').disabled = false; operation = false; }
  });

  // Durante el canje de tokens, mantener visible el estado de verificación.
  if (recoveryInUrl()) show('loading-panel');
  verifySession();
})();
