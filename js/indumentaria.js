/* Boulevard Pádel — Visor público de fotografías en Indumentaria y +.
   Mejora progresiva: si no hay soporte de <dialog>, el enlace a la foto
   sigue funcionando. No afecta reservas ni torneos. */
(() => {
  "use strict";

  const dialog = document.getElementById("shopLightbox");
  const image = document.getElementById("shopLightboxImage");
  const caption = document.getElementById("shopLightboxCaption");
  const closeButton = document.getElementById("shopLightboxClose");

  if (!dialog || !image || !caption || !closeButton ||
      typeof dialog.showModal !== "function") return;

  document.querySelectorAll(".shop-card__photo").forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");

    link.addEventListener("click", (event) => {
      // Respetar gestos propios del navegador, como Ctrl+clic.
      if (event.button !== 0 || event.ctrlKey || event.metaKey ||
          event.shiftKey || event.altKey) return;

      event.preventDefault();
      const thumbnail = link.querySelector("img");
      const card = link.closest(".shop-card");
      const name = card?.querySelector(".shop-card__name h3")?.textContent?.trim() || "Producto";
      const variant = card?.querySelector(".shop-card__variant")?.textContent?.trim();

      image.src = link.href;
      image.alt = thumbnail?.alt || name;
      caption.textContent = variant ? `${name} · ${variant}` : name;
      dialog.showModal();
      document.body.classList.add("shop-lightbox-open");
    });
  });

  closeButton.addEventListener("click", () => dialog.close());

  // Cerrar también tocando fuera de la ventana o con Escape (nativo).
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    document.body.classList.remove("shop-lightbox-open");
    image.removeAttribute("src");
    image.alt = "";
    caption.textContent = "";
  });
})();
