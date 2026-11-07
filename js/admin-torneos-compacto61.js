/* Boulevard Pádel — Parche 61: presentación compacta de Torneos.
   Únicamente despliega u oculta el formulario; no modifica datos ni llamadas a Supabase. */
(() => {
  "use strict";
  const root = document.getElementById("admin-torneos-view");
  const toggle = document.getElementById("torneos-create-toggle");
  const content = document.getElementById("torneos-create-details");
  const cancelEdit = document.getElementById("torneo-edit-cancel");
  const nameInput = document.getElementById("torneo-name");
  if (!root || !toggle || !content || !cancelEdit || !nameInput) return;

  function setExpanded(expanded, focusName = false) {
    content.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Ocultar formulario" : "+ Nuevo torneo";
    if (expanded && focusName) nameInput.focus({ preventScroll: true });
  }

  // Con JavaScript deshabilitado, el formulario permanece visible.
  // Al editar desde la lista, se despliega automáticamente.
  setExpanded(!cancelEdit.hidden);
  toggle.addEventListener("click", () =>
    setExpanded(content.hidden, content.hidden),
  );

  new MutationObserver(() => {
    if (!cancelEdit.hidden) setExpanded(true, true);
  }).observe(cancelEdit, { attributes: true, attributeFilter: ["hidden"] });

  // Abrir antes del manejador del botón Editar, para permitir foco y scroll.
  document.getElementById("torneos-list")?.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button");
      if (button && /^editar$/i.test(button.textContent.trim()))
        setExpanded(true);
    },
    { capture: true },
  );
})();
