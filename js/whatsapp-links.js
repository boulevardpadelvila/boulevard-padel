/* Boulevard Pádel — enlaces WhatsApp, solo sitio público.
 * En equipos de escritorio abrimos directamente WhatsApp Web para evitar
 * la pantalla que intenta invocar una aplicación no instalada (Linux).
 * En móviles mantenemos el enlace wa.me para usar WhatsApp del teléfono.
 * No interviene sobre otras direcciones ni sobre el panel Admin.
 */
(() => {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobile) return;

  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
    const original = new URL(link.href);
    const phone = original.pathname.replace(/\D/g, "");
    if (!phone) return;
    const web = new URL("https://web.whatsapp.com/send");
    web.searchParams.set("phone", phone);
    const message = original.searchParams.get("text");
    if (message) web.searchParams.set("text", message);
    link.href = web.toString();
  });
})();
