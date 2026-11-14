# Boulevard Pádel — Protección del simulador de llaves (14/11/2026)

## Actualización — Dos cuentas administradas por Martín

**Corrección PR #40** (merge `5edf880313ac185457280bb2d1e30af4b71a5171`). El propietario aclaró que los dos perfiles Admin activos de BP son manejados por Martín: «Martín» y «Administrador Boulevard Pádel». Se autorizaron ambos UID explícitos en una lista controlada desde la función Cloudflare. Cada token se sigue validando contra Supabase Auth y luego se exige `is_admin()=true` en la misma sesión: si el perfil pierde el rol o se desactiva, deja de ingresar. Una tercera cuenta Admin **no entra automáticamente**, incluso si tiene rol Admin. La protección cubre las URL `/admin/simulador-llaves` y `/admin/simulador-llaves.html`. El usuario había confirmado que la protección del simulador ya impedía acceso anónimo.

**Tests:** dos cuentas autorizadas y Admin, ambas denegadas cuando `is_admin()=false`, tercera cuenta Admin simulada denegada, anónimos denegados. Cinco checks de PR verdes, sin cambios en Supabase, turnero, contraseñas ni cuentas. Después del deploy, comprobar con cada login real (en distinta sesión/ventana) que el simulador se abre; los tests positivos usan tokens ficticios.

---

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

## Cierre de ruta canónica sin extensión — 14/11/2026

**Reporte del usuario:** el enlace copiado desde el Admin era
`https://boulevard-padel.pages.dev/admin/simulador-llaves` (sin
`.html`). Esa URL se abría en incógnito, a pesar de que la prueba
original protegía solo `/admin/simulador-llaves.html`.
Cloudflare Pages utiliza URLs canónicas sin la extensión HTML.

**Solución desplegada:** PR #39 merge `b0e30a910377534e31807b7a0b0b5d6d32af7f80`.
Se agregó `functions/admin/simulador-llaves.js`, alias que
**reexporta el mismo onRequest** con validación de token Supabase,
UID de Martín e `is_admin()`, sin duplicar guardias. `_routes.json`
incluye tanto `/admin/simulador-llaves` como
`/admin/simulador-llaves.html`, además del resguardo
`/functions/*`. El enlace del Admin ahora apunta a la URL canónica
sin extensión.

**Prevención de regresión:** `tests/simulador-privado96.test.js`
verifica la existencia del alias y la inclusión de ambas rutas. El
workflow de simulador ejecuta en Cloudflare Pages Dev **las dos URL**,
probando GET con la puerta de acceso sin el contenido y POST sin JWT
con HTTP 403. Tras fusionar, se ejecutó el control en la **dirección
real de producción** para **ambas URL** y todos los casos pasaron.
La ruta del código fuente interno permanece protegida. CI de PR:
cinco controles verdes (Node, Cloudflare Pages local y compilación,
SQL89 PostgreSQL, Chromium y despliegue); CI main: protección y
despliegue correctos. **Sin cambios en Supabase ni datos reales.**

**Pendiente del usuario:** probar en ventana privada nueva
`/admin/simulador-llaves` y confirmar que solo aparece la pantalla
«Simulador de llaves» con aviso de acceso privado, sin las llaves.
La prueba de acceso real de Martín con su sesión sigue pendiente:
las pruebas automáticas simulan correctamente esa identidad, pero
no acceden con su contraseña.

---

## Estado de producción comprobado — 14/11/2026

**Implementado y desplegado:** PR #38, merge
`4f60b9ed3854a25392e0e31947fe870e946159db`.
`functions/admin/simulador-llaves.html.js` identifica exclusivamente el UID
Supabase de Martín y exige además `is_admin()=true`.
No se modificaron perfiles, contraseñas, registros ni esquema Supabase.

**Se descubrió y corrigió una vía alternativa:** este sitio publica la raíz
del repositorio como assets estáticos y en una prueba de CI
`/functions/admin/simulador-llaves.html.js` devolvió el contenido fuente.
Se agregó `functions/_middleware.js` y una segunda ruta
`/functions/*` en `_routes.json` para responder HTTP 404 a toda
petición de código interno. La función efectiva de simulador usa
el mismo middleware y sigue comprobando Supabase.

**Pruebas aprobadas:** 273/273 pruebas Node, compilación Cloudflare,
prueba de Cloudflare Pages Dev localhost, Cloudflare despliegue exitoso,
y comprobación HTTP a la dirección **real de producción**:
GET devuelve pantalla de autorización sin las llaves, POST sin
JWT responde 403, y la URL del código fuente de Cloudflare responde
403 o 404, sin entrega del recurso. Para la prueba remota se utilizó
User-Agent descriptivo, dado que Cloudflare Pages rechaza el User-Agent
por defecto de Python urllib mediante Browser Integrity Check.

**Pendiente manual:** que Martín abra el simulador con su sesión y
verifique el funcionamiento visual; no se utilizó su contraseña durante
los tests. Para quien use otro perfil de administrador, el bloqueo
403 es intencional. El repositorio Github público conserva el HTML
antiguo en su historial, aunque la URL funcional ya está protegida.

---

## Pruebas automatizadas
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
