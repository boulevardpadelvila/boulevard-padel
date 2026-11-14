// Protección de rutas internas de Cloudflare Pages.
// El sitio publica la raíz del repositorio como assets. Sin esta
// barrera la ruta /functions/admin/simulador-llaves.html.js permitiría
// descargar el fuente completo del simulador a pesar del control JWT.
// _routes.json invoca este middleware en /functions/*.
export function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (path === "/functions" || path.startsWith("/functions/")) {
    return new Response("No encontrado", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
  return context.next();
}
