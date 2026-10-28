/* Boulevard Pádel — Galería de La cancha.
   Detecta Cancha01.webp, Cancha02.webp... al abrir; números consecutivos sin saltos.
   En Cloudflare Pages una carpeta no se puede enumerar directamente, por eso
   se comprueba la existencia de cada imagen mediante HEAD. Sin API ni Supabase. */
(() => {
  "use strict";
  const button = document.getElementById("openBpGallery");
  const dialog = document.getElementById("bpGalleryDialog");
  const image = document.getElementById("bpGalleryImage");
  const message = document.getElementById("bpGalleryMessage");
  const closeButton = document.getElementById("bpGalleryClose");
  const footer = document.getElementById("bpGalleryFooter");
  const previous = document.getElementById("bpGalleryPrev");
  const next = document.getElementById("bpGalleryNext");
  const counter = document.getElementById("bpGalleryCounter");
  if (![button, dialog, image, message, closeButton, footer, previous, next, counter].every(Boolean)) return;

  const root = "assets/img/BP_Galeria/";
  let photos = [];
  let current = 0;
  let loaded = false;
  let loadingPromise = null;
  let touchStartX = null;

  async function discover() {
    const found = [];
    // Límite defensivo de 99 fotos; se detiene cuando encuentra el primer hueco.
    for (let number = 1; number <= 99; number++) {
      const file = `Cancha${String(number).padStart(2, "0")}.webp`;
      const url = root + file;
      let response;
      try {
        response = await fetch(url, { method: "HEAD" });
      } catch (error) {
        if (number === 1) throw error;
        break;
      }
      if (!response.ok || !((response.headers.get("content-type") || "").toLowerCase().startsWith("image/"))) break;
      found.push({ url, alt: `Boulevard Pádel — fotografía ${number} de la cancha` });
    }
    return found;
  }

  function showPhoto(index) {
    if (!photos.length) return;
    current = Math.max(0, Math.min(index, photos.length - 1));
    image.src = photos[current].url;
    image.alt = photos[current].alt;
    image.hidden = false;
    message.hidden = true;
    footer.hidden = false;
    counter.textContent = `${current + 1} / ${photos.length}`;
    previous.disabled = current === 0;
    next.disabled = current === photos.length - 1;
  }

  async function openGallery() {
    dialog.showModal();
    closeButton.focus();
    if (loaded) { showPhoto(current); return; }
    message.textContent = "Cargando fotografías…";
    message.hidden = false;
    image.hidden = true;
    footer.hidden = true;
    try {
      if (!loadingPromise) loadingPromise = discover();
      photos = await loadingPromise;
      loaded = true;
      if (!dialog.open) return;
      if (photos.length) showPhoto(0);
      else message.textContent = "Todavía no hay fotos en la galería.";
    } catch (error) {
      loadingPromise = null;
      if (dialog.open) message.textContent = "No se pudieron cargar las fotografías. Intentá nuevamente.";
    }
  }

  button.addEventListener("click", openGallery);
  closeButton.addEventListener("click", () => dialog.close());
  previous.addEventListener("click", () => showPhoto(current - 1));
  next.addEventListener("click", () => showPhoto(current + 1));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); showPhoto(current - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); showPhoto(current + 1); }
  });
  image.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.screenX ?? null;
  }, { passive: true });
  image.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const delta = (event.changedTouches[0]?.screenX ?? touchStartX) - touchStartX;
    if (Math.abs(delta) >= 45) showPhoto(current + (delta < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });
  dialog.addEventListener("close", () => button.focus());
})();
