const dateSelector = document.getElementById("dateSelector");
const timeSelector = document.getElementById("timeSelector");

const timeSection = document.getElementById("timeSection");
const detailsSection = document.getElementById("detailsSection");

const selectedDateText = document.getElementById("selectedDateText");
const selectedBookingText = document.getElementById("selectedBookingText");

const summaryDate = document.getElementById("summaryDate");
const summaryTime = document.getElementById("summaryTime");

const bookingForm = document.getElementById("bookingForm");

const bookingConfirmation = document.getElementById("bookingConfirmation");

const confirmationCode = document.getElementById("confirmationCode");

const confirmationName = document.getElementById("confirmationName");

const confirmationDate = document.getElementById("confirmationDate");

const confirmationTime = document.getElementById("confirmationTime");

const newBookingButton = document.getElementById("newBookingButton");

let selectedDate = null;
let selectedTime = null;

/*
=========================================================
HORARIOS DEL PROTOTIPO

Después estos horarios vendrán del backend.
=========================================================
*/

const availableTimes = [
  "08:00",
  "09:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30",
  "17:00",
  "18:30",
  "20:00",
  "21:30",
  "23:00",
];

/*
=========================================================
SIMULACIÓN DE HORARIOS OCUPADOS
=========================================================
*/

function getUnavailableTimes(dayIndex) {
  const examples = [
    ["18:30", "21:30"],
    ["17:00", "20:00"],
    ["09:30", "18:30", "23:00"],
    ["15:30", "20:00"],
    ["17:00", "21:30"],
    ["11:00", "18:30"],
    ["14:00", "20:00"],
  ];

  return examples[dayIndex % examples.length];
}

/*
=========================================================
GENERAR LOS PRÓXIMOS 7 DÍAS
=========================================================
*/

function generateDates() {
  if (!dateSelector) return;

  dateSelector.innerHTML = "";

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);

    date.setDate(today.getDate() + i);

    const button = document.createElement("button");

    button.type = "button";
    button.className = "date-card";

    const weekday =
      i === 0
        ? "HOY"
        : date
            .toLocaleDateString("es-AR", { weekday: "short" })
            .replace(".", "")
            .toUpperCase();

    const month = date
      .toLocaleDateString("es-AR", { month: "short" })
      .replace(".", "")
      .toUpperCase();

    button.innerHTML = `
            <span class="date-card__day">
                ${weekday}
            </span>

            <span class="date-card__number">
                ${date.getDate()}
            </span>

            <span class="date-card__month">
                ${month}
            </span>
        `;

    button.addEventListener("click", () => {
      document
        .querySelectorAll(".date-card")
        .forEach((card) => card.classList.remove("date-card--active"));

      button.classList.add("date-card--active");

      selectedDate = date;
      selectedTime = null;

      renderTimes(i);
    });

    dateSelector.appendChild(button);
  }
}

/*
=========================================================
MOSTRAR HORARIOS
=========================================================
*/

function renderTimes(dayIndex) {
  timeSection.classList.remove("booking-step--disabled");

  detailsSection.classList.add("booking-step--disabled");

  timeSelector.innerHTML = "";

  const formattedDate = selectedDate.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  selectedDateText.textContent = capitalize(formattedDate);

  const unavailableTimes = getUnavailableTimes(dayIndex);

  availableTimes.forEach((time) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "time-slot";

    button.textContent = time;

    if (unavailableTimes.includes(time)) {
      button.disabled = true;

      button.title = "Horario no disponible";
    } else {
      button.addEventListener("click", () => selectTime(button, time));
    }

    timeSelector.appendChild(button);
  });
}

/*
=========================================================
SELECCIONAR HORARIO
=========================================================
*/

function selectTime(button, time) {
  document
    .querySelectorAll(".time-slot")
    .forEach((slot) => slot.classList.remove("time-slot--active"));

  button.classList.add("time-slot--active");

  selectedTime = time;

  detailsSection.classList.remove("booking-step--disabled");

  const formattedDate = selectedDate.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const readableDate = capitalize(formattedDate);

  selectedBookingText.textContent = `${readableDate} · ${time} hs`;

  summaryDate.textContent = readableDate;

  summaryTime.textContent = `${time} hs`;

  setTimeout(() => {
    detailsSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 150);
}

/*
=========================================================
CONFIRMAR RESERVA
=========================================================
*/

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!selectedDate || !selectedTime) {
      return;
    }

    const customerName = document.getElementById("customerName").value.trim();

    const customerPhone = document.getElementById("customerPhone").value.trim();

    if (!customerName || !customerPhone) {
      return;
    }

    const code = generateReservationCode();

    confirmationCode.textContent = code;

    confirmationName.textContent = customerName;

    confirmationDate.textContent = capitalize(
      selectedDate.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );

    confirmationTime.textContent = `${selectedTime} hs`;

    document.querySelectorAll(".booking-step").forEach((section) => {
      section.style.display = "none";
    });

    document.querySelector(".booking-intro").style.display = "none";

    bookingConfirmation.hidden = false;

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

/*
=========================================================
NUEVA RESERVA
=========================================================
*/

if (newBookingButton) {
  newBookingButton.addEventListener("click", () => {
    window.location.reload();
  });
}

/*
=========================================================
GENERAR CÓDIGO DE RESERVA
=========================================================
*/

function generateReservationCode() {
  const number = Math.floor(1000 + Math.random() * 9000);

  return `BP-${number}`;
}

/*
=========================================================
CAPITALIZAR TEXTO
=========================================================
*/

function capitalize(text) {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/*
=========================================================
INICIAR
=========================================================
*/

generateDates();
