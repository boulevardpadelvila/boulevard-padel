/* Boulevard Pádel · Parche 88 · Limpieza manual segura de historial.
   La RPC consulta y valida todo en Supabase: el navegador nunca hace DELETE. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const openButton = $("bp-cleanup88-open");
  const dialog = $("bp-cleanup88-dialog");
  const choose = $("bp-cleanup88-choose");
  const review = $("bp-cleanup88-review");
  const next = $("bp-cleanup88-next");
  const back = $("bp-cleanup88-back");
  const phrase = $("bp-cleanup88-phrase");
  const confirmation = $("bp-cleanup88-confirmation");
  const errorBox = $("bp-cleanup88-error");
  const feedback = $("bp-cleanup88-feedback");
  const boxes = {
    cancelled: $("bp-cleanup88-cancelled"),
    finished: $("bp-cleanup88-finished"),
    fixed: $("bp-cleanup88-fixed"),
  };

  if (
    !openButton || !dialog || !choose || !review || !next || !back ||
    !phrase || !confirmation || !errorBox || !feedback ||
    Object.values(boxes).some((element) => !element)
  ) return;

  let step = "choose";
  let busy = false;
  let preview = null;
  let requestGeneration = 0;

  const selections = () => ({
    p_cancelled: boxes.cancelled.checked,
    p_finished: boxes.finished.checked,
    p_fixed: boxes.fixed.checked,
  });

  function showError(message) {
    errorBox.textContent = String(message || "");
    errorBox.hidden = !message;
  }

  function setNumber(id, value) {
    $(id).textContent = String(Number(value) || 0);
  }

  function updateDeleteButton() {
    next.disabled =
      busy ||
      (step === "review" &&
        (!preview || !(preview.total_rows > 0) ||
          phrase.value.trim() !== "ELIMINAR"));
  }

  function setStep(value) {
    step = value;
    choose.hidden = value !== "choose";
    review.hidden = value !== "review";
    confirmation.hidden = value !== "review";
    back.textContent = value === "review" ? "Volver a elegir" : "Volver";
    next.textContent = value === "review"
      ? "Eliminar definitivamente"
      : "Revisar limpieza";
    next.className = value === "review"
      ? "bp-cleanup88__danger"
      : "primary";
    updateDeleteButton();
  }

  function setBusy(value) {
    busy = value;
    back.disabled = value;
    updateDeleteButton();
  }

  function reset() {
    requestGeneration++;
    preview = null;
    setBusy(false);
    Object.values(boxes).forEach((checkbox) => { checkbox.checked = false; });
    phrase.value = "";
    showError("");
    setStep("choose");
  }

  openButton.addEventListener("click", () => {
    if (dialog.open) return;
    reset();
    feedback.textContent = "";
    dialog.showModal();
    back.focus();
  });

  back.addEventListener("click", () => {
    if (busy) return;
    if (step === "review") {
      preview = null;
      phrase.value = "";
      showError("");
      setStep("choose");
    } else {
      dialog.close();
    }
  });

  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    if (!busy) reset();
  });

  phrase.addEventListener("input", updateDeleteButton);
  Object.values(boxes).forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      preview = null;
      showError("");
    });
  });

  async function askPreview() {
    const selected = selections();
    if (!Object.values(selected).some(Boolean)) {
      showError("Seleccioná al menos un tipo de historial para revisar.");
      return;
    }
    const generation = ++requestGeneration;
    showError("");
    setBusy(true);
    try {
      const { data, error } = await supabaseClient.rpc(
        "bp_admin_cleanup_reservations",
        { ...selected, p_expected_signature: null },
      );
      if (generation !== requestGeneration || !dialog.open) return;
      if (error) throw error;
      if (
        !data || data.deleted !== false ||
        typeof data.signature !== "string" ||
        !Number.isInteger(data.total_rows) ||
        data.total_rows < 0
      ) throw new Error("La vista previa no devolvió un resumen válido.");

      preview = { selected, ...data };
      setNumber("bp-cleanup88-count-cancelled", data.cancelled_reservations);
      setNumber("bp-cleanup88-count-finished", data.finished_reservations);
      setNumber("bp-cleanup88-count-fixed", data.fixed_turns);
      setNumber("bp-cleanup88-count-fixed-reservations", data.fixed_reservations);
      setNumber("bp-cleanup88-count-total", data.total_rows);
      setStep("review");
      if (data.total_rows === 0) {
        confirmation.hidden = true;
        showError("No hay registros que puedan eliminarse con esta selección.");
        back.focus();
      } else {
        phrase.focus();
      }
    } catch (error) {
      if (generation === requestGeneration)
        showError(error.message ||
          "No se pudo consultar el historial. Verificá que SQL 88 esté instalado.");
    } finally {
      if (generation === requestGeneration) setBusy(false);
    }
  }

  async function confirmDelete() {
    if (
      !preview ||
      !(preview.total_rows > 0) ||
      phrase.value.trim() !== "ELIMINAR"
    ) return;
    const saved = preview;
    const generation = ++requestGeneration;
    setBusy(true);
    showError("");
    try {
      // Segunda llamada: Supabase vuelve a verificar permisos, períodos,
      // cada ID, su firma y las FK antes de borrar en una sola transacción.
      const { data, error } = await supabaseClient.rpc(
        "bp_admin_cleanup_reservations",
        {
          ...saved.selected,
          p_expected_signature: saved.signature,
        },
      );
      if (error) throw error;
      if (!data || data.deleted !== true ||
          data.signature !== saved.signature ||
          data.total_rows !== saved.total_rows) {
        throw new Error("No se pudo verificar la confirmación de limpieza.");
      }
      if (dialog.open) dialog.close();
      feedback.textContent =
        "Limpieza completada: " + data.total_reservations +
        " reservas y " + data.fixed_turns +
        " turnos fijos históricos eliminados.";
      // Refrescar las dos vistas mediante sus controles existentes.
      $("refresh-reservations")?.click();
      $("admin-fixed-refresh")?.click();
    } catch (error) {
      if (generation === requestGeneration) {
        preview = null;
        phrase.value = "";
        setStep("choose");
        showError(
          error.message ||
          "No se pudo completar la limpieza. Revisá los datos nuevamente.",
        );
      }
    } finally {
      if (generation === requestGeneration) setBusy(false);
    }
  }

  next.addEventListener("click", () => {
    if (busy) return;
    if (step === "choose") void askPreview();
    else void confirmDelete();
  });
})();
