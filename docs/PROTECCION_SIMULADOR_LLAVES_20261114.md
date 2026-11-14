# Boulevard Pádel — Protección del simulador de llaves (14/11/2026)

## Objetivo
El enlace `/admin/simulador-llaves.html` debe permitir consultar el simulador
solo a la cuenta Supabase de **Martín**, siempre que conserve `role=admin` y
`active=true`. La segunda cuenta de administración NO adquiere acceso por
ser admin. No se crea un login paralelo, no se modifican RLS ni tablas y
no se bloquea ninguna otra página de BP.

## Diseño
La página era un archivo HTML estático público, así que ocultar el enlace o
usar JavaScript para ocultar botones NO era protección real.

- Eliminamos `admin/simulador-llaves.html` de los archivos estáticos
  actuales, manteniendo el enlace que Martín abre desde el Admin.
- `functions/admin/simulador-llaves.html.js` intercepta exactamente esa
  dirección mediante Cloudflare Pages Functions; `_routes.json` limita
  las invocaciones a la URL del simulador.
- `GET` devuelve solamente una pantalla breve que busca la sesión del
  Admin en el mismo navegador/origen y envía el token al mismo endpoint.
- `POST` verifica en Supabase Auth que el JWT corresponde a la cuenta
  identificada como Martín; luego ejecuta `is_admin()` con ese mismo
  token para constatar que sigue siendo administrador activo.
- Solo ante ambas verificaciones la función devuelve el HTML real;
  para cualquier otra persona responde 403. No se usan cookies
  privilegiadas ni contraseñas duplicadas.
- La respuesta está marcada `Cache-Control: no-store`,
  `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`,
  `Content-Security-Policy: frame-ancestors 'none'`.
- Los scripts deportivos públicos permanecen disponibles para que no
  se rompa la visualización general de torneos.
- La cuenta de Martín está fijada en el **servidor de Cloudflare**,
  no confiamos en nombre de usuario transmitido por el navegador ni
  en `user_metadata`. Revisar esta identidad si cambia la cuenta.

**Limitación importante:** el repositorio de GitHub de Boulevard Pádel es
público y el HTML antiguo del simulador existe en su historial Git.
Esta protección **evita consultar la página funcional publicada sin
autenticación**; no puede prometer confidencialidad del código fuente ya
publicado. Para ocultar el código habría que hacer privado el repositorio
y revisar la distribución de scripts; es una tarea separada.

## Pruebas previstas y realizadas
`tests/simulador-privado96.test.js` debe verificar:
1. GET y HEAD sin las llaves.
2. POST sin token, token inválido, otro admin y Martín sin rol activo: 403.
3. Martín con JWT válido y función `is_admin()=true`: HTML íntegro.
4. Respuesta sin caché.
5. Cloudflare Pages Functions compila la ruta exacta.
6. La suite global de tests de BP no presenta regresiones.

**Antes de marcar producción como protegido:** GitHub CI completo verde,
Cloudflare Preview probado desde un navegador no autenticado (GET no
muestra llaves), POST no autenticado=403 y despliegue en producción
confirmado. Probar con Martín una vez por su sesión real.

## Localhost
Como el simulador ya no es un archivo estático descargable, debe usarse
Cloudflare Pages Dev para reproducir la misma protección localmente:

```bash
cd ~/Clientes-TGJotaPe/BoulevardPadel
npx --yes wrangler@4.47.0 pages dev . --port 5500
```

Entrar al Admin usando `http://localhost:5500/admin/` y después abrir
el enlace de simulador con la cuenta de Martín. `http://127.0.0.1:5500`
tiene almacenamiento de sesión separado de `localhost:5500`; iniciar
sesión en el origen que se vaya a probar.

**Live Server HTTP puramente estático** sigue siendo adecuado para
revisar el resto de BP, pero no puede ejecutar Cloudflare Pages Functions:
en ese modo la URL del simulador dará 404. Eso es intencional para no
añadir una copia accesible por fuera de la protección. Las reservas,
torneos, turnos fijos y el resto del Admin no fueron modificados.

## Mantenimiento
No volver a crear un `admin/simulador-llaves.html` estático con el
contenido deportivo. No incluir tokens de Martín ni service_role en
GitHub, frontend o documentación. Si algún día Martín decide hacer
público el simulador, diseñar por separado un control Admin para
modificar la política de publicación sin duplicar HTML ni publicar
accidentalmente contenido de otras áreas.
