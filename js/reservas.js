const dateSelector = document.getElementById("dateSelector");

const datePrevButton = document.getElementById("datePrevButton");

const dateNextButton = document.getElementById("dateNextButton");

const bookingDateRange = document.getElementById("bookingDateRange");

const timeSelector = document.getElementById("timeSelector");

const timeSection = document.getElementById("timeSection");

const detailsSection = document.getElementById("detailsSection");

const selectedDateText = document.getElementById("selectedDateText");

const selectedBookingText = document.getElementById("selectedBookingText");

const summaryDate = document.getElementById("summaryDate");

const summaryTime = document.getElementById("summaryTime");

const summaryCourt = document.getElementById("summaryCourt");

const bookingForm = document.getElementById("bookingForm");

const bookingIntro = document.querySelector(".booking-intro");

const bookingConfirmation = document.getElementById("bookingConfirmation");

const confirmationCode = document.getElementById("confirmationCode");

const confirmationName = document.getElementById("confirmationName");

const confirmationDate = document.getElementById("confirmationDate");

const confirmationTime = document.getElementById("confirmationTime");

const copyBookingCodeButton = document.getElementById("copyBookingCodeButton");

const shareBookingCodeButton = document.getElementById(
  "shareBookingCodeButton",
);

const openManageBookingButton = document.getElementById(
  "openManageBookingButton",
);

const closeManageBookingButton = document.getElementById(
  "closeManageBookingButton",
);

const bookingManage = document.getElementById("bookingManage");

const manageBookingForm = document.getElementById("manageBookingForm");

const manageBookingCode = document.getElementById("manageBookingCode");

const manageBookingResult = document.getElementById("manageBookingResult");

const manageResultCode = document.getElementById("manageResultCode");

const manageResultStatus = document.getElementById("manageResultStatus");

const manageResultDate = document.getElementById("manageResultDate");

const manageResultTime = document.getElementById("manageResultTime");

const manageBookingNotice = document.getElementById("manageBookingNotice");

const cancelBookingButton = document.getElementById("cancelBookingButton");

const cancelBookingModal = document.getElementById("cancelBookingModal");

const cancelBookingModalBackdrop = document.getElementById(
  "cancelBookingModalBackdrop",
);

const cancelBookingModalClose = document.getElementById(
  "cancelBookingModalClose",
);

const cancelBookingModalBack = document.getElementById(
  "cancelBookingModalBack",
);

const cancelBookingModalConfirm = document.getElementById(
  "cancelBookingModalConfirm",
);

const cancelBookingModalDate = document.getElementById(
  "cancelBookingModalDate",
);

const cancelBookingModalTime = document.getElementById(
  "cancelBookingModalTime",
);

const newBookingButton = document.getElementById("newBookingButton");

let bookingConfig = null;

let selectedDate = null;

let selectedSlot = null;

let managedBooking = null;

/* =========================================================

   UTILIDADES

========================================================= */

function capitalize(text) {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseLocalDate(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

function formatDateToISO(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatSelectedDate(dateString) {
  const date = parseLocalDate(dateString);

  return capitalize(
    date.toLocaleDateString("es-AR", {
      weekday: "long",

      day: "numeric",

      month: "long",

      year: "numeric",
    }),
  );
}

function formatShortDate(dateString) {
  const date = parseLocalDate(dateString);

  return date.toLocaleDateString("es-AR", {
    day: "numeric",

    month: "long",

    year: "numeric",
  });
}

function formatTime(time) {
  return time.slice(0, 5);
}

function scrollToStep(section) {
  if (!section) return;

  requestAnimationFrame(() => {
    setTimeout(() => {
      section.scrollIntoView({
        behavior: "smooth",

        block: "start",
      });
    }, 100);
  });
}

function showDateMessage(message) {
  if (!dateSelector) return;

  dateSelector.innerHTML = `

    <p class="booking-empty-message">${message}</p>

  `;
}

function showTimeMessage(message) {
  if (!timeSelector) return;

  timeSelector.innerHTML = `

    <p class="booking-empty-message">${message}</p>

  `;
}

function resetDetailsStep() {
  selectedSlot = null;

  detailsSection?.classList.add("booking-step--disabled");

  document

    .querySelectorAll(".time-slot")

    .forEach((item) => item.classList.remove("time-slot--active"));

  if (selectedBookingText) {
    selectedBookingText.textContent = "Seleccioná un horario para continuar.";
  }

  if (summaryDate) summaryDate.textContent = "—";

  if (summaryTime) summaryTime.textContent = "—";

  if (summaryCourt) summaryCourt.textContent = "Cancha 1";
}

/* =========================================================

   CONFIGURACIÓN DEL TURNERO

========================================================= */

async function loadBookingConfig() {
  if (!dateSelector) return;

  showDateMessage("Cargando fechas disponibles...");

  const { data, error } = await supabaseClient.rpc("get_booking_config");

  if (error) {
    console.error("Error cargando configuración:", error);

    showDateMessage(
      "No fue posible cargar las fechas disponibles. Intentá nuevamente.",
    );

    if (bookingDateRange) {
      bookingDateRange.textContent =
        "El turnero no está disponible temporalmente.";
    }

    return;
  }

  if (!data || data.length === 0) {
    showDateMessage("El turnero no está disponible temporalmente.");

    return;
  }

  bookingConfig = data[0];

  generateDates(
    bookingConfig.booking_start_date,

    bookingConfig.booking_end_date,
  );

  if (bookingDateRange) {
    bookingDateRange.textContent =
      `Reservas habilitadas del ` +
      `${formatShortDate(bookingConfig.booking_start_date)} ` +
      `al ${formatShortDate(bookingConfig.booking_end_date)}.`;
  }
}

/* =========================================================

   GENERAR TARJETAS DE FECHA

========================================================= */

function generateDates(startDateString, endDateString) {
  if (!dateSelector) return;

  dateSelector.innerHTML = "";

  const startDate = parseLocalDate(startDateString);

  const endDate = parseLocalDate(endDateString);

  const todayISO = formatDateToISO(new Date());

  const current = new Date(startDate);

  while (current <= endDate) {
    const date = new Date(current);

    const dateISO = formatDateToISO(date);

    const button = document.createElement("button");

    button.type = "button";

    button.className = "date-card";

    button.dataset.date = dateISO;

    const weekday =
      dateISO === todayISO
        ? "HOY"
        : date

            .toLocaleDateString("es-AR", {
              weekday: "short",
            })

            .replace(".", "")

            .toUpperCase();

    const month = date

      .toLocaleDateString("es-AR", {
        month: "short",
      })

      .replace(".", "")

      .toUpperCase();

    button.setAttribute(
      "aria-label",

      `${formatSelectedDate(dateISO)}. Seleccionar fecha`,
    );

    button.innerHTML = `

      <span class="date-card__day">${weekday}</span>

      <span class="date-card__number">${date.getDate()}</span>

      <span class="date-card__month">${month}</span>

    `;

    button.addEventListener("click", async () => {
      await selectDate(button, dateISO);
    });

    dateSelector.appendChild(button);

    current.setDate(current.getDate() + 1);
  }

  updateDateArrowState();
}

/* =========================================================

   SELECCIONAR FECHA

========================================================= */

async function selectDate(button, dateISO) {
  document

    .querySelectorAll(".date-card")

    .forEach((card) => card.classList.remove("date-card--active"));

  button.classList.add("date-card--active");

  selectedDate = dateISO;

  resetDetailsStep();

  timeSection?.classList.remove("booking-step--disabled");

  if (selectedDateText) {
    selectedDateText.textContent = formatSelectedDate(dateISO);
  }

  showTimeMessage("Consultando horarios disponibles...");

  await loadAvailableSlots(dateISO);

  scrollToStep(timeSection);
}

/* =========================================================

   CONSULTAR HORARIOS DISPONIBLES

========================================================= */

async function loadAvailableSlots(dateISO) {
  const { data, error } = await supabaseClient.rpc("get_available_slots", {
    p_date: dateISO,
  });

  if (error) {
    console.error("Error consultando horarios:", error);

    showTimeMessage(
      "No fue posible consultar los horarios. Intentá nuevamente.",
    );

    return;
  }

  if (!data || data.length === 0) {
    showTimeMessage("No hay horarios disponibles para este día.");

    return;
  }

  renderTimes(data);
}

/* =========================================================

   MOSTRAR HORARIOS

========================================================= */

function renderTimes(slots) {
  if (!timeSelector) return;

  timeSelector.innerHTML = "";

  slots.forEach((slot) => {
    const time = formatTime(slot.start_time);

    const button = document.createElement("button");

    button.type = "button";

    button.className = "time-slot";

    button.textContent = time;

    button.setAttribute("aria-label", `${time} hs, disponible`);

    button.addEventListener("click", () => {
      selectTime(button, slot);
    });

    timeSelector.appendChild(button);
  });
}

/* =========================================================

   SELECCIONAR HORARIO

========================================================= */

function selectTime(button, slot) {
  if (!selectedDate) return;

  document

    .querySelectorAll(".time-slot")

    .forEach((item) => item.classList.remove("time-slot--active"));

  button.classList.add("time-slot--active");

  selectedSlot = slot;

  detailsSection?.classList.remove("booking-step--disabled");

  const readableDate = formatSelectedDate(selectedDate);

  const readableTime = formatTime(slot.start_time);

  if (selectedBookingText) {
    selectedBookingText.textContent = `${readableDate} · ${readableTime} hs`;
  }

  if (summaryDate) summaryDate.textContent = readableDate;

  if (summaryTime) summaryTime.textContent = `${readableTime} hs`;

  if (summaryCourt) {
    summaryCourt.textContent = slot.court_name || "Cancha 1";
  }

  scrollToStep(detailsSection);
}

/* =========================================================

   DESPLAZAMIENTO DE FECHAS

========================================================= */

function scrollDates(direction) {
  if (!dateSelector) return;

  const amount = Math.max(320, Math.round(dateSelector.clientWidth * 0.8));

  dateSelector.scrollBy({
    left: direction * amount,

    behavior: "smooth",
  });
}

function updateDateArrowState() {
  if (!dateSelector) return;

  const maxScroll = dateSelector.scrollWidth - dateSelector.clientWidth;

  if (datePrevButton) {
    datePrevButton.disabled = dateSelector.scrollLeft <= 4;
  }

  if (dateNextButton) {
    dateNextButton.disabled = dateSelector.scrollLeft >= maxScroll - 4;
  }
}

datePrevButton?.addEventListener("click", () => {
  scrollDates(-1);
});

dateNextButton?.addEventListener("click", () => {
  scrollDates(1);
});

dateSelector?.addEventListener("scroll", () => {
  window.requestAnimationFrame(updateDateArrowState);
});

window.addEventListener("resize", updateDateArrowState);

/* =========================================================
   SOLICITUD DE TURNO FIJO (flujo separado; reserva normal intacta)
========================================================= */
const fixedOptions = document.getElementById('fixedOptions');
const fixedEndDate = document.getElementById('fixedEndDate');
const fixedEndDateField = document.getElementById('fixedEndDateField');
const fixedDurationType = document.getElementById('fixedDurationType');
const fixedResult = document.getElementById('fixedResult');
const bookingModeNote = document.getElementById('bookingModeNote');
const bookingModeRadios = document.querySelectorAll('input[name="bookingMode"]');
function isFixedMode() { return document.querySelector('input[name="bookingMode"]:checked')?.value === 'fixed'; }
function syncBookingMode() {
  const fixed = isFixedMode();
  fixedOptions.hidden = !fixed;
  fixedEndDateField.hidden = !fixed || fixedDurationType.value === 'indefinite';
  fixedEndDate.required = fixed && fixedDurationType.value === 'defined';
  const submit = bookingForm?.querySelector('.booking-submit');
  if (submit) submit.textContent = fixed ? 'Enviar solicitud' : 'Confirmar reserva';
  if (bookingModeNote) bookingModeNote.textContent = fixed ? 'Tu solicitud quedará pendiente de aprobación. No se reserva la cancha todavía.' : 'Al confirmar, tu turno quedará reservado en el sistema.';
  if (fixedResult) fixedResult.hidden = true;
}
bookingModeRadios.forEach(r => r.addEventListener('change', syncBookingMode));
fixedDurationType?.addEventListener('change', syncBookingMode);
syncBookingMode();

/* =========================================================

   CONFIRMAR RESERVA

========================================================= */

bookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedDate || !selectedSlot) return;

  const customerName = document.getElementById("customerName")?.value.trim();

  const customerPhone = document.getElementById("customerPhone")?.value.trim();

  if (!customerName || !customerPhone) return;

  const submitButton = bookingForm.querySelector(".booking-submit");

  if (!submitButton) return;

  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.classList.add("button--loading");
  submitButton.textContent = "Confirmando...";

  try {
    const turnstileToken = document.querySelector(
      '[name="cf-turnstile-response"]',
    )?.value;

    if (!turnstileToken) {
      throw new Error("Completá la verificación de seguridad.");
    }

    if (isFixedMode()) {
      if (fixedDurationType.value === 'defined' && (!fixedEndDate.value || fixedEndDate.value < selectedDate)) {
        throw new Error('Elegí una fecha final igual o posterior al primer turno.');
      }
      const { data: fixedData, error: fixedError } = await supabaseClient.functions.invoke('request-fixed-turn', {
        body: {
          fullName: customerName,
          phone: customerPhone,
          startsAt: selectedSlot.starts_at,
          durationType: fixedDurationType.value,
          endDate: fixedDurationType.value === 'defined' ? fixedEndDate.value : null,
          notes: document.getElementById('fixedNotes')?.value.trim() || null,
          turnstileToken,
        },
      });
      if (fixedError || !fixedData?.success) throw new Error(fixedData?.error || fixedError?.message || 'No pudimos enviar la solicitud.');
      fixedResult.textContent = 'Solicitud recibida. Queda pendiente de aprobación por el administrador. No es una reserva confirmada.';
      fixedResult.hidden = false;
      bookingModeNote.textContent = '';
      scrollToStep(detailsSection);
      return;
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "create-booking-secure",
      {
        body: {
          fullName: customerName,
          phone: customerPhone,
          startsAt: selectedSlot.starts_at,
          notes: null,
          turnstileToken,
        },
      },
    );

    if (error) {
      throw error;
    }

    if (!data?.success || !data?.reservation || data.reservation.length === 0) {
      throw new Error(
        data?.error || "No se recibió confirmación de la reserva.",
      );
    }

    const reservation = data.reservation[0];

    if (confirmationCode) {
      confirmationCode.textContent = reservation.reservation_code;
    }

    if (confirmationName) {
      confirmationName.textContent = customerName;
    }

    if (confirmationDate) {
      confirmationDate.textContent = formatSelectedDate(selectedDate);
    }

    if (confirmationTime) {
      confirmationTime.textContent = `${formatTime(selectedSlot.start_time)} hs`;
    }

    document.querySelectorAll(".booking-step").forEach((section) => {
      section.hidden = true;
    });

    if (bookingIntro) bookingIntro.hidden = true;

    if (bookingConfirmation) {
      bookingConfirmation.hidden = false;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } catch (error) {
    console.error("Error creando reserva:", error);

    const errorText = error?.message || "";

    let message = "No fue posible confirmar la reserva. Intentá nuevamente.";

    if (
      errorText.includes("verificación de seguridad") ||
      errorText.includes("Turnstile")
    ) {
      message =
        "No pudimos validar la verificación de seguridad. Intentá nuevamente.";
    }

    if (
      errorText.includes("acaba de ser reservado") ||
      errorText.includes("no está disponible")
    ) {
      message = "Ese horario ya no está disponible. Elegí otro turno.";

      selectedSlot = null;
      detailsSection?.classList.add("booking-step--disabled");

      await loadAvailableSlots(selectedDate);

      scrollToStep(timeSection);
    }

    if (window.turnstile) {
      window.turnstile.reset();
    }

    if (isFixedMode() && fixedResult) {
      fixedResult.textContent = error?.message || message;
      fixedResult.hidden = false;
    } else {
      alert(message);
    }
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove("button--loading");
    submitButton.textContent = originalText;
  }
});

/* =========================================================

   CONSULTAR / CANCELAR RESERVA

========================================================= */

function setMainBookingVisibility(visible) {
  if (bookingIntro) bookingIntro.hidden = !visible;

  document.querySelectorAll(".booking-step").forEach((section) => {
    section.hidden = !visible;
  });
}

function resetManageBookingView() {
  managedBooking = null;

  if (manageBookingResult) {
    manageBookingResult.hidden = true;
  }

  if (cancelBookingButton) {
    cancelBookingButton.hidden = true;

    cancelBookingButton.disabled = false;

    cancelBookingButton.textContent = "Cancelar turno";
  }

  if (manageBookingNotice) {
    manageBookingNotice.textContent = "";

    manageBookingNotice.className = "booking-manage__notice";
  }

  if (manageResultCode) manageResultCode.textContent = "—";

  if (manageResultStatus) manageResultStatus.textContent = "—";

  if (manageResultDate) manageResultDate.textContent = "—";

  if (manageResultTime) manageResultTime.textContent = "—";
}

function openManageBooking() {
  resetManageBookingView();

  if (bookingConfirmation) {
    bookingConfirmation.hidden = true;
  }

  setMainBookingVisibility(false);

  if (bookingManage) {
    bookingManage.hidden = false;
  }

  window.scrollTo({
    top: 0,

    behavior: "smooth",
  });

  setTimeout(() => {
    manageBookingCode?.focus();
  }, 250);
}

function closeManageBooking() {
  if (bookingManage) {
    bookingManage.hidden = true;
  }

  setMainBookingVisibility(true);

  window.scrollTo({
    top: 0,

    behavior: "smooth",
  });
}

function normalizeBookingCode(value) {
  return value.trim().toUpperCase();
}

function bookingStatusLabel(status) {
  const labels = {
    confirmed: "Confirmada",

    cancelled: "Cancelada",

    completed: "Finalizada",

    no_show: "No asistió",
  };

  return labels[status] || status;
}

function formatBookingDateTime(dateTimeString) {
  const date = new Date(dateTimeString);

  return {
    date: capitalize(
      date.toLocaleDateString("es-AR", {
        weekday: "long",

        day: "numeric",

        month: "long",

        year: "numeric",

        timeZone: "America/Argentina/Cordoba",
      }),
    ),

    time: date.toLocaleTimeString("es-AR", {
      hour: "2-digit",

      minute: "2-digit",

      hour12: false,

      timeZone: "America/Argentina/Cordoba",
    }),
  };
}

function renderManagedBooking(booking) {
  managedBooking = booking;

  const start = formatBookingDateTime(booking.starts_at);

  const end = formatBookingDateTime(booking.ends_at);

  if (manageResultCode) {
    manageResultCode.textContent = booking.reservation_code;
  }

  if (manageResultStatus) {
    manageResultStatus.textContent = bookingStatusLabel(booking.status);
  }

  if (manageResultDate) {
    manageResultDate.textContent = start.date;
  }

  if (manageResultTime) {
    manageResultTime.textContent = `${start.time} a ${end.time} hs`;
  }

  if (manageBookingResult) {
    manageBookingResult.hidden = false;
  }

  if (!manageBookingNotice || !cancelBookingButton) return;

  manageBookingNotice.className = "booking-manage__notice";

  cancelBookingButton.hidden = true;

  if (booking.status === "cancelled") {
    manageBookingNotice.textContent = "Esta reserva ya fue cancelada.";

    manageBookingNotice.classList.add("booking-manage__notice--warning");

    return;
  }

  if (booking.status !== "confirmed") {
    manageBookingNotice.textContent =
      "Esta reserva no puede cancelarse online.";

    manageBookingNotice.classList.add("booking-manage__notice--warning");

    return;
  }

  if (booking.can_cancel) {
    manageBookingNotice.textContent = `Podés cancelar este turno online hasta ${booking.cancellation_hours_before} horas antes del inicio.`;

    manageBookingNotice.classList.add("booking-manage__notice--success");

    cancelBookingButton.hidden = false;

    return;
  }

  manageBookingNotice.textContent = `Este turno ya no puede cancelarse online porque faltan menos de ${booking.cancellation_hours_before} horas para el inicio. Comunicate con Boulevard Pádel.`;

  manageBookingNotice.classList.add("booking-manage__notice--warning");
}

openManageBookingButton?.addEventListener("click", openManageBooking);

closeManageBookingButton?.addEventListener("click", closeManageBooking);

manageBookingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = normalizeBookingCode(manageBookingCode?.value || "");

  if (!code) return;

  resetManageBookingView();

  const submitButton = manageBookingForm.querySelector(
    ".booking-manage__submit",
  );

  const originalText = submitButton?.textContent || "Consultar reserva";

  if (submitButton) {
    submitButton.disabled = true;

    submitButton.classList.add("button--loading");

    submitButton.textContent = "Consultando...";
  }

  try {
    const { data, error } = await supabaseClient.rpc("get_booking_by_code", {
      p_reservation_code: code,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      if (manageBookingResult) {
        manageBookingResult.hidden = false;
      }

      if (manageBookingNotice) {
        manageBookingNotice.textContent =
          "No encontramos una reserva con ese código. Revisalo e intentá nuevamente.";

        manageBookingNotice.className =
          "booking-manage__notice booking-manage__notice--error";
      }

      return;
    }

    renderManagedBooking(data[0]);
  } catch (error) {
    console.error("Error consultando reserva:", error);

    if (manageBookingResult) {
      manageBookingResult.hidden = false;
    }

    if (manageBookingNotice) {
      manageBookingNotice.textContent =
        "No fue posible consultar la reserva. Intentá nuevamente.";

      manageBookingNotice.className =
        "booking-manage__notice booking-manage__notice--error";
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;

      submitButton.classList.remove("button--loading");

      submitButton.textContent = originalText;
    }
  }
});

function openCancelBookingModal() {
  if (!managedBooking?.reservation_code) return;

  const start = formatBookingDateTime(managedBooking.starts_at);

  const end = formatBookingDateTime(managedBooking.ends_at);

  if (cancelBookingModalDate) {
    cancelBookingModalDate.textContent = start.date;
  }

  if (cancelBookingModalTime) {
    cancelBookingModalTime.textContent = `${start.time} a ${end.time} hs`;
  }

  if (cancelBookingModal) {
    cancelBookingModal.hidden = false;
  }

  document.body.classList.add("booking-modal-open");

  setTimeout(() => {
    cancelBookingModalConfirm?.focus();
  }, 100);
}

function closeCancelBookingModal() {
  if (cancelBookingModal) {
    cancelBookingModal.hidden = true;
  }

  document.body.classList.remove("booking-modal-open");
}

cancelBookingButton?.addEventListener("click", openCancelBookingModal);

cancelBookingModalBack?.addEventListener("click", closeCancelBookingModal);

cancelBookingModalClose?.addEventListener("click", closeCancelBookingModal);

cancelBookingModalBackdrop?.addEventListener("click", closeCancelBookingModal);

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    cancelBookingModal &&
    !cancelBookingModal.hidden
  ) {
    closeCancelBookingModal();
  }
});

cancelBookingModalConfirm?.addEventListener("click", async () => {
  if (!managedBooking?.reservation_code) return;

  const originalText = cancelBookingModalConfirm.textContent;

  cancelBookingModalConfirm.disabled = true;

  cancelBookingModalConfirm.textContent = "Cancelando...";

  try {
    const { data, error } = await supabaseClient.rpc("cancel_booking_by_code", {
      p_reservation_code: managedBooking.reservation_code,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0 || !data[0].cancelled) {
      throw new Error("No se recibió confirmación de la cancelación.");
    }

    managedBooking.status = "cancelled";

    managedBooking.can_cancel = false;

    if (manageResultStatus) {
      manageResultStatus.textContent = "Cancelada";
    }

    if (manageBookingNotice) {
      manageBookingNotice.textContent =
        "Reserva cancelada correctamente. El horario ya volvió a quedar disponible.";

      manageBookingNotice.className =
        "booking-manage__notice booking-manage__notice--success";
    }

    if (cancelBookingButton) {
      cancelBookingButton.hidden = true;
    }

    closeCancelBookingModal();
  } catch (error) {
    console.error("Error cancelando reserva:", error);

    closeCancelBookingModal();

    if (manageBookingNotice) {
      const errorText = error?.message || "";

      if (
        errorText.includes("menos de") ||
        errorText.includes("no puede cancelarse online")
      ) {
        manageBookingNotice.textContent =
          "Esta reserva ya no puede cancelarse online. Comunicate con Boulevard Pádel.";
      } else {
        manageBookingNotice.textContent =
          "No fue posible cancelar la reserva. Intentá nuevamente.";
      }

      manageBookingNotice.className =
        "booking-manage__notice booking-manage__notice--error";
    }
  } finally {
    cancelBookingModalConfirm.disabled = false;

    cancelBookingModalConfirm.textContent = originalText;
  }
});

/* =========================================================

   COPIAR Y COMPARTIR CÓDIGO

========================================================= */

async function copyBookingCode() {
  const code = confirmationCode?.textContent?.trim();

  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);

    if (copyBookingCodeButton) {
      const originalText = copyBookingCodeButton.textContent;

      copyBookingCodeButton.textContent = "¡Copiado!";

      setTimeout(() => {
        copyBookingCodeButton.textContent = originalText;
      }, 1800);
    }
  } catch (error) {
    console.error("No se pudo copiar el código:", error);

    window.prompt("Copiá tu código de reserva:", code);
  }
}

async function shareBookingCode() {
  const code = confirmationCode?.textContent?.trim();

  if (!code) return;

  const shareText =
    `Boulevard Pádel\n` +
    `Código de reserva: ${code}\n` +
    `Guardalo para consultar o cancelar el turno.`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Reserva Boulevard Pádel",

        text: shareText,
      });

      return;
    } catch (error) {
      if (error?.name === "AbortError") return;

      console.error("No se pudo compartir:", error);
    }
  }

  try {
    await navigator.clipboard.writeText(shareText);

    if (shareBookingCodeButton) {
      const originalText = shareBookingCodeButton.textContent;

      shareBookingCodeButton.textContent = "Texto copiado";

      setTimeout(() => {
        shareBookingCodeButton.textContent = originalText;
      }, 1800);
    }
  } catch (error) {
    console.error("No se pudo copiar para compartir:", error);

    window.prompt("Copiá estos datos de la reserva:", shareText);
  }
}

copyBookingCodeButton?.addEventListener("click", copyBookingCode);

shareBookingCodeButton?.addEventListener("click", shareBookingCode);

/* =========================================================

   NUEVA RESERVA

========================================================= */

newBookingButton?.addEventListener("click", () => {
  selectedDate = null;

  selectedSlot = null;

  bookingForm?.reset();

  document.querySelectorAll(".date-card").forEach((card) => {
    card.classList.remove("date-card--active");
  });

  document.querySelectorAll(".time-slot").forEach((slot) => {
    slot.classList.remove("time-slot--active");
  });

  if (timeSelector) {
    timeSelector.innerHTML = "";
  }

  if (selectedDateText) {
    selectedDateText.textContent = "Primero seleccioná un día.";
  }

  if (selectedBookingText) {
    selectedBookingText.textContent = "Seleccioná un horario para continuar.";
  }

  if (summaryDate) summaryDate.textContent = "—";

  if (summaryTime) summaryTime.textContent = "—";

  if (summaryCourt) summaryCourt.textContent = "Cancha 1";

  timeSection?.classList.add("booking-step--disabled");

  detailsSection?.classList.add("booking-step--disabled");

  document.querySelectorAll(".booking-step").forEach((section) => {
    section.hidden = false;
  });

  if (bookingIntro) {
    bookingIntro.hidden = false;
  }

  if (bookingConfirmation) {
    bookingConfirmation.hidden = true;
  }

  if (window.turnstile) {
    window.turnstile.reset();
  }

  window.scrollTo({
    top: 0,

    left: 0,

    behavior: "smooth",
  });
});

/* =========================================================

   INICIAR

========================================================= */

loadBookingConfig();
