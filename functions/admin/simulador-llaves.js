// Ruta canónica de Cloudflare Pages: las páginas HTML usan URL sin extensión.
// Conservamos el único verificador JWT/rol de Martín y evitamos una segunda
// implementación de permisos que pueda divergir.
export { onRequest } from "./simulador-llaves.html.js";
