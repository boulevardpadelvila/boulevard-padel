# Boulevard Pádel — ESTADO ACTUAL / RELEVO ENTRE CHATS

## 14/11/2026 — Simulador de llaves PRIVADO para Martín (IMPLEMENTADO)

**PROTEGIDO EN PRODUCCIÓN** `/admin/simulador-llaves.html` por Cloudflare Pages Function, PR #38 merge `4f60b9ed3854a25392e0e31947fe870e946159db`. GET público entrega solo una puerta de validación, jamás el simulador. El navegador envía en POST su token Supabase al mismo endpoint. El servidor valida token contra Supabase Auth, exige que el UID sea **exactamente Martín** (hay dos perfiles Admin activos) y que `is_admin()=true`, que requiere administrador activo. Los otros Admin y los visitantes reciben 403. No se cambió Supabase, permisos globales, reservas, torneos ni cuentas. La hoja HTML estática antigua se retiró: no se distribuye como página pública.

**Rutas internas protegidas adicionalmente:** al publicar el sitio desde la raíz, una primera prueba encontró que `/functions/admin/simulador-llaves.html.js` exponía el código fuente como asset; **se corrigió** mediante `functions/_middleware.js` que rechaza con HTTP 404 cualquier `/functions/*`, y `_routes.json` invoca Cloudflare para `/admin/simulador-llaves.html` y `/functions/*` únicamente. No se bloquean otras páginas. **El repositorio de GitHub de BP es público y su historial conserva versiones anteriores del simulador:** se garantiza restricción de la URL operativa en el sitio, NO confidencialidad del código histórico.

**Verificación automatizada:** 273 tests Node aprobados, compilación Wrangler, Cloudflare local: GET puerta, POST anónimo 403, código interno bloqueado, home intacta; desplegado en producción y CI HTTP de producción verificado: GET puerta sin contenido, POST anónimo=403, URL del código interno=403/404. Cloudflare Pages reportó despliegue correcto. **Pendiente** una comprobación visual de Martín con su login legítimo (no conocemos ni usamos su contraseña). Cuando Martín lo abra desde Admin, debe verse el simulador normal. 

**Localhost:** el servidor estático habitual (p. ej. Live Server) ya no puede mostrar `/admin/simulador-llaves.html` porque es deliberadamente privado. Para verificar el simulador local, ejecutar `npx --yes wrangler@4.47.0 pages dev . --port 5500` en el directorio BP y entrar a `http://localhost:5500/admin/` con sesión de Martín; salir del Live Server si usa el mismo puerto. El resto del sitio no cambió. Referencia `docs/PROTECCION_SIMULADOR_LLAVES_20261114.md`.

**Proyecto nuevo TG Torneos:** se desarrollará SEPARADAMENTE bajo la identidad y cuenta de TecnoGestión JotaPe, repositorio privado nuevo y backend propio; ningún componente de la cuenta BP se emplea como backend de TG Torneos. Pendiente crear Proyecto nuevo de ChatGPT por el usuario, compartir logo y empezar nuevo chat. No se creó aún el repositorio ni Supabase independiente.

---

## 13/11/2026 — PENDIENTES: simulador privado y producto TG Torneos comercializable

**Pendiente: restringir URL pública del simulador de llaves.** El usuario confirmó que `admin/simulador-llaves.html` puede abrirse pegando su URL en otro navegador, sin sesión. **Verificado en código:** es HTML estático, enlazado desde el Admin, sin control de acceso en el servidor; contiene un aviso que reconoce el acceso directo. No consulta Supabase ni modifica reservas, pero permite ver el reglamento/las llaves de 6 a 40 parejas sin autenticarse. **Objetivo solicitado:** que por defecto solamente Martín (único administrador de BP por ahora) pueda abrirlo; estudiar una opción **controlada por Martín** para hacerlo público si lo desea. NO alcanza ocultar el enlace, usar CSS, añadir verificación JS ni bloquear con un simple diálogo: en Cloudflare Pages se debe proteger la entrega del recurso mediante control efectivo en el servidor/edge (evaluar Cloudflare Access o Pages Functions/Worker con sesión y política Admin, junto con una forma segura de publicación opcional). Revisar también si el motor `js/torneos-reglamento-2026.js` queda públicamente descargable como script: un HTML privado no oculta por sí solo el algoritmo. **No implementar todavía sin evaluar impacto y probar localhost/Admin**, ni bloquear consultas del público que use el motor para ver torneos.

**Pendiente: producto independiente de torneos para venta/demostración a dos posibles clientes.** Nombre provisional **TG Torneos**; identidad visual y marca comercial de **TecnoGestión JotaPe** (TGJotaPe). El usuario está conforme con esta orientación y **enviará posteriormente su logo**. Preparar demostración con datos 100% ficticios, repositorio privado/código maestro y Supabase/hosting independientes de Boulevard Pádel; extraer Admin, público, motors, PDF, inscripciones y calendario de competición, desacoplando `blockouts`, `reservations`, `courts`, `booking_settings` y autentificación/perfiles de BP. No crear proyecto, migrar datos ni reutilizar identidad/activos de BP hasta acordar siguiente paso. Mantener las dos modalidades deportivas y validar licencias/derechos de reutilización antes de vender a terceros. **Pendiente recibir logo TGJotaPe.**

**Estado:** solamente anotación documental; no hubo cambio del simulador, contraseñas, Supabase, Cloudflare, reglas deportivas ni datos reales.

---

## 13/11/2026 — SQL95: vistas públicas de torneos sin SECURITY DEFINER (VIGENTE)

**INSTALADO Y VERIFICADO EN PRODUCCIÓN:** PR #37, merge `1e5a82b1effe7b68fcff19281080aa2be2de695d`, migración `bp_sql95_torneos_publicos_security_invoker` (`20261113235204`). Vistas `bp_public_tournament_groups` y `bp_public_tournament_group_fixture` ahora tienen `security_invoker=true`, conservando sus nombres, columnas, SELECT públicos existentes y `security_barrier=true` donde correspondía. Cuatro políticas `bp95_*` conceden RLS a `anon` **solo para torneos y grupos publicados**, fixture publicado y parejas aprobadas que realmente integran grupos públicos. SELECT por columnas de nombres, IDs de relación, horarios y estados publicados; **sin** permiso de `anon` sobre `contact_phone`, `source`, INSERT, UPDATE o DELETE.

**Pruebas:** seis checks GitHub (SQL95 PostgreSQL 17 aislado con casos aprobados/pendientes, torneos publicados/ocultos y fixture sin publicar; Node, SQL89, Chromium, Cloudflare). Producción: ambas vistas invoker, cuatro políticas, `anon_contactos=false`, `anon_nombre=true`, `anon_source=false`, DML anon false. Transacción `READ ONLY` con `SET LOCAL ROLE anon` comprobó que consultas a vistas y tablas no generan errores. **Sin torneos reales en producción** (0), por lo que la validación de salida positiva con grupos/fixture la cubrieron solo los tests aislados; queda prueba visual integral con Martín al crear el primer torneo real. SQL95 no cambió la página web ni orígenes localhost.

**Datos intactos antes/después:** 41 reservas (31 confirmadas), cuatro solicitudes de turno fijo (tres aprobadas), cuatro bloqueos, 0 torneos, 0 parejas. Supabase Advisor: desaparecieron las dos advertencias `security_definer_view` (ERROR) y permanece eliminado `function_search_path_mutable` de SQL94. Subsisten 11 warnings de funciones ejecutables por `anon` que incluyen RPC públicas necesarias, otros avisos de funciones Admin, `btree_gist` en `public`, y la protección de contraseñas filtradas desactivada. Esta última opción requiere Supabase Pro y ajustes de Auth a los que no tenemos acceso por conector; no tocar ni contratar un plan sin evaluación. Referencia `docs/AUDITORIA_SEGURIDAD_SUPABASE_20261113.md`.

**Pendiente antes de entregar:** Martín debe validar con su sesión las acciones clave del Admin (sin registrar datos ficticios productivos) y completar una prueba de torneo real de principio a fin, publicando grupos, fixture, resultados y cierre. Confirmar que el respaldo de Drive se actualiza efectivamente después de un cambio legítimo (la primera ejecución solo comprobó igualdad). Luego, considerar configuración Auth en el dashboard si la cuenta y plan lo permiten. Para la laptop: `git pull --ff-only origin main`. Rama remota `security/tournament-views-invoker95-20261113` fusionada, borrar luego de sincronizar.

---

## 13/11/2026 — SQL94: endurecimiento de RPC y compatibilidad localhost (VIGENTE)

**IMPLEMENTADO Y VERIFICADO EN PRODUCCIÓN:** PR #36 fusionado en `main` (`0955f63e64f73e0b112414ac5d6db302e5958bb4`), migración Supabase `bp_sql94_minimo_privilegio_rpc_localhost_2026` instalada con éxito (versión `20261113232433`). Se retiró EXECUTE público a **15 funciones trigger**, 1 event trigger y el generador de códigos; `create_admin_booking_flexible` y `update_admin_booking_flexible` ya no son ejecutables directamente por `anon`, pero continúan habilitadas a `authenticated` y `service_role`. Se fijó el `search_path` de `set_updated_at()`. **No se modificaron** vistas, RLS, SQL deportivo, Edge Functions ni credenciales/orígenes de localhost.

**CI y prueba de roles:** los seis checks PR aprobaron (Node, SQL94 PostgreSQL 17 desechable, SQL89 PostgreSQL 17, Chromium y Cloudflare). Post-verificación directa: 15/15 triggers restringidos; las RPC públicas de turnos, cancelación por código y seguimiento de torneos siguen habilitadas a `anon`. Consulta transaccional `READ ONLY` ejecutada como `anon` en producción: configuración disponible, 30 horarios, consulta por código inexistente sin datos y guardias admin false. **No se verificó un login interactivo real con Martín; queda la comprobación visual no destructiva en localhost/Admin.**

**Datos intactos:** antes y después, 41 reservas totales / 31 confirmadas, 4 solicitudes fijas / 3 aprobadas, 4 bloqueos, 0 torneos. Avisos de funciones ejecutables por anónimos de **30 a 11**; los restantes incluyen RPC deliberadamente públicas. Persisten **2 vistas `SECURITY DEFINER`** usadas por la web pública: no se convierten directamente a `security_invoker`, ya que romperían acceso al fixture sin preparar políticas RLS. También quedan pendiente revisar la protección Auth de contraseñas filtradas y `btree_gist` sin cambios improvisados. Referencia: `docs/AUDITORIA_SEGURIDAD_SUPABASE_20261113.md`.

**Laptop:** sincronizar luego de este commit con `git pull --ff-only origin main`. Rama remota `security/supabase-rpc-grants94-20261113` fusionada, su eliminación se coordina por SSH después de confirmar rama `main` actualizada; nunca borrar datos reales.

---

## 13/11/2026 — Admin Torneos: botones uniformes (PR #35 FUSIONADO)

**ENTREGADO EN MAIN:** PR #35, merge `762dd3d29ffc5a7d0a243ce8d1874aee0b799d2d`. La distribución de acciones de cada tarjeta en «Torneos registrados» usa ahora una grilla `auto-fit` con columnas de igual ancho y botones de 42 px de altura; se adapta automáticamente a 6, 7 o cualquier otra cantidad y al ancho de la tarjeta en PC/tablet/celular. Solo cambió `css/admin-torneos-compacto61.css` y se sumó un test de regresión. **No se tocó** `js/admin-torneos.js`, estado de inscripciones, base de datos, reservas ni turnos fijos. El botón «Cerrar inscripciones» desaparece normalmente cuando el torneo ya está cerrado, excepto el caso especial de borrador que conserva la acción propia. CI Node, PostgreSQL 17 aislado, Chromium móvil y Cloudflare Preview completó correctamente. **Pendiente:** comprobación visual con un torneo de prueba en el Admin desplegado, sin alterar datos reales, y limpiar rama temporal remota `fix/torneos-botones-uniformes-20261113` cuando la laptop esté sincronizada.

## 13/11/2026 — Primera ejecución horaria real del respaldo de Drive

**VERIFICADO EN HISTORIAL DE AUTOMATIZACIÓN:** tarea «Respaldo Boulevard Pádel» programada 18:59 hora argentina, iniciada 18:59:09 y completada 19:00:12 del 13/11/2026, estado `completed`, sin error ni acción requerida. Validó por lectura 31 reservas confirmadas y 3 turnos fijos aprobados de Supabase, iguales a ambas pestañas de la planilla del Drive propio de BP, cuatro campos completos. **Como ya estaban sincronizados, no escribió la planilla** (la ejecución está comprobada, pero todavía no se demostró una actualización efectiva al aparecer datos nuevos). Próxima comprobación prevista 19:59. No se alteraron registros ni permisos.

---

## 13/11/2026 — Admin Reservas: seis botones en fila y aviso de exportación modal (VIGENTE)

**IMPLEMENTADO Y FUSIONADO:** PR #34, commit de código `74494095448cbadb47cced63c4b70aba99522f7b`. Los botones Hoy, + Nueva reserva, Ver canceladas, Actualizar, Exportar reservas (CSV) y Limpiar historial están en una misma fila, con columnas iguales, altura 48 px, fuente Inter 13,5 px y etiquetas sin salto de línea; en tablet/móvil una fila se desplaza horizontalmente para no disminuir legibilidad. La hoja `css/admin-respaldos-ui.css` se carga después de las CSS históricas y afecta exclusivamente las acciones de Reservas, sin alterar Torneos ni Turnos fijos.

**MODAL DE EXPORTACIÓN:** el aviso «CSV generado: N registros» ya no se muestra dentro del encabezado; ahora se abre un `<dialog>` institucional con resultado de éxito o error, cantidad de registros, botón Entendido y retorno de foco. El botón de exportar permanece visible y se rehabilita al terminar la operación, incluso ante error, permitiendo volver a exportar sin refrescar. Se aplica la misma confirmación al CSV de Turnos fijos. El respaldo automático de Google Drive de BP continúa independiente y sin cambios.

**PRUEBAS CONFIRMADAS:** suite Node, PostgreSQL 17 aislado y Chromium móvil aprobadas en PR #34; tests nuevos validan seis botones, CSS y diálogo, reintento y recuperación del foco. No hubo cambios SQL ni escrituras a Supabase. Tras esta entrega, usuario debe sincronizar laptop y borrar rama temporal remota `fix/admin-reservas-toolbar-modal-csv-20261113` para dejar solo `main`; confirmar la presentación visual en navegador luego del despliegue Cloudflare.

---


## 13/11/2026 — Planilla Google Drive de BP creada y respaldo horario programado (ESTADO VIGENTE)

**CONFIRMADO DIRECTAMENTE:** se conectó Google Drive de la cuenta propia `boulevardpadelvila@gmail.com`. Planilla nativa **«Boulevard Pádel — Respaldo de reservas y turnos fijos»**: <https://docs.google.com/spreadsheets/d/1ZO1QlRvVrfwlDMBb9QpuXfyfD8IQm7ewMb5Uw6MzUys/edit>. Pestañas «Reservas» (31 registros confirmados) y «Turnos fijos» (3 aprobados), con **exclusivamente cuatro columnas: Nombre, Día, Hora y Teléfono**. Primera copia desde Supabase verificada por relectura del Drive, sin campos faltantes, con filtros y zona horaria Argentina. Ninguna escritura en Supabase; registros reales conservados.

**AUTOMATIZACIÓN HORARIA:** tarea ChatGPT `Respaldo Boulevard Pádel` creada, habilitada, `FREQ=HOURLY`. Debe actualizar el mismo documento con ambas listas y proteger la última copia ante una lectura fallida o inesperadamente vacía, notificando solo errores. **La primera ejecución programada aún no fue observada**: no calificar el mecanismo como sincronización ya probada. Este mecanismo depende de conexiones de ChatGPT, no es una integración Apps Script/Cloudflare autónoma. Confirmar la primera ejecución correcta antes de declarar cerrado el respaldo automático. El PDF de torneos continúa como exportación manual desde Admin para subir al mismo Drive.

**REFERENCIA:** `docs/RESPALDO_DRIVE_BOULEVARD_PADEL.md`. Próximo hito de Torneos: aprobación final de Martín. Tras estas ediciones documentales, sincronizar la laptop (`git pull --ff-only origin main`). Mantener una única rama `main`.

---


## 13/11/2026 — Respaldo operativo externo (FASE MANUAL IMPLEMENTADA / AUTOMÁTICA PENDIENTE)

**Nuevo módulo en Admin, PR #33 FUSIONADO:** botón «Exportar reservas (CSV)» en Reservas y «Exportar turnos fijos (CSV)» en Turnos fijos; archivos con **exactamente 4 columnas: Nombre, Día, Hora, Teléfono**, sin código, correo, observaciones ni estado. Para reservas se exportan `confirmed` y para turnos fijos, `approved`, con paginación y hora argentina. Se incorpora botón «PDF del torneo» en cada torneo, con informe A4 imprimible de participantes y resultados, sin teléfonos; se guarda mediante el navegador y después se sube a Google Drive.

**LIMITACIÓN IMPORTANTE:** NO existe todavía respaldo automático, Google Sheet en Drive de BP, ni integración con Google Drive. El conector Drive disponible sólo ofrece cuentas TecnoGestión JotaPe y Personal, **no la cuenta propia de Boulevard Pádel**; no crear copias privadas del cliente en cuentas ajenas. Las exportaciones actuales deben ejecutarse manualmente mientras Admin y Supabase están disponibles y luego subirse al Drive de BP. La próxima etapa depende de conectar y autorizar Drive de BP y habilitar una sincronización externa y segura (mínimo privilegio, sin service_role en frontend).

**DESPLIEGUE:** PR #33 fusionado en `main` (`725b67d947432bc050cbfc9bd8a6808060b2e957`). CI de Node, PostgreSQL 17 aislado y Chromium móvil aprobada; pendiente de confirmar el check final de Cloudflare en el momento de escribir. La laptop deberá sincronizar `main` tras esta actualización y se podrá eliminar la rama remota temporal `feat/respaldos-manuales-drive-20261113`.\n\n**CALIDAD Y SEGURIDAD:** se añadieron pruebas Node de columnas exactas, zona horaria, protección contra CSV injection, autenticación Admin, HTML escapado y PDF de torneo. Sin cambios de base de datos, pagos ni turnero. Referencia operativa: `docs/RESPALDO_DRIVE_BOULEVARD_PADEL.md`. Mantener como **pendiente** de activación automática hasta realizar una sincronización real y verificar el archivo Drive. La aceptación general de Torneos por Martín continúa pendiente.

---


## 13/11/2026 — SQL93: orden obligatorio de grupos antes de publicar (ESTADO VIGENTE)

**CORREGIDO, PROBADO E INSTALADO EN SUPABASE:** cuando un torneo de Grupos + Eliminatorias usa el Reglamento 2026 (6–40 parejas), las zonas con **4 parejas deben ser las primeras: A, B, C...**; las restantes quedan con 3. Ejemplos: 7=A4/B3; 10=A4/B3/C3; 11=A4/B4/C3; 14=A4/B4/C3/D3. El Admin (`js/admin-grupos.js`) consulta `rules_version`, muestra advertencia y **deshabilita Publicar grupos y la habilitación de fixture** si la distribución es incorrecta, pero permite seguir moviendo e intercambiando parejas y volver a sortear. La validación **real y obligatoria es del servidor**, mediante la migración SQL93 `bp_sql93_validacion_orden_grupos_2026` que reemplaza únicamente el cuerpo del trigger existente `bp_tournament_validate_group_sizes_3_4()`, sin cambiar permisos ni operaciones históricas. El publicador del fixture 2026 ya validaba esta condición antes de SQL93.

**CALIDAD:** CI de PR #32 aprobado con Node, PostgreSQL 17 desechable y Chromium; PostgreSQL ensayó las **35 distribuciones válidas desde 6 hasta 40**, inversiones indebidas 7/10/11/14/40, numeración de grupos incorrecta, reversión a privado y preservación de datos ficticios del turnero. Migración SQL93 aplicada mediante Supabase y verificada por inspección directa de función: solo actúa al pasar grupos a publicados, sigue como SECURITY INVOKER y requiere el orden correcto. No se han hecho pruebas destructivas en producción; queda la aceptación final de Martín.

**INTEGRIDAD DE DATOS:** lectura de producción posterior: **0 torneos** (el usuario eliminó las pruebas de 6 y 7 parejas), **41 reservas reales**, **4 solicitudes de turno fijo** y **4 bloqueos**. No se eliminaron reservas ni se modificaron sus datos.

**ESTADO DEL CLIENTE:** dos pruebas de torneos (6 y 7 parejas) superadas; todavía **pendiente que Martín haga su propia prueba y dé OK definitivo**. La nueva validación de orden deberá incluirse en esa prueba.

**CIERRE DE GITHUB CONFIRMADO:** PR **#32** fusionado a `main`, commit funcional/documental **`604069257185a88f2e507fb8ea3aaccb81d0f50e`**; GitHub Actions Node/PostgreSQL/Chromium aprobadas y Cloudflare Pages **SUCCESS**. PR WIP #20 cerrado como obsoleto, **0 PR abiertos**. Persisten **13 ramas remotas históricas** (incluida la del PR #32); eliminación autorizada por el usuario, **a realizar desde su laptop mediante SSH** porque este conector no dispone de eliminación de refs. No confundir rama fusionada con rama borrada. Confirmar tras la limpieza `git branch -r`, `git status` y ejecución de pruebas locales. Próximo hito funcional: prueba y visto bueno definitivo de Martín.

---


## 13/11/2026 — Validación de torneo de 7 parejas (ESTADO VIGENTE)

**CONFIRMADO por el usuario y lectura de Supabase:** se creó y completó el torneo ficticio `PRUEBA - TORNEO 7 PAREJAS` con Reglamento 2026, grupos A=4 parejas y B=3 parejas, **4+3 partidos** de grupos, clasificación oficial **3+2** y cuadro de eliminatorias de **4 partidos** (una previa, dos semifinales, final). Los 11 partidos constan como disputados. Las posiciones se recalcularon de forma independiente: A = Tiago/Stefano (4 pts), Ludmila/Joaquin (2 pts, diferencia sets 0), Tisiana/Diego (2 pts, diferencia −1), Bruno/María (0); B = Ignacio/Narela (4), Marianela/Santiago (2), Martina/Juan (0). Sin inconsistencias en ganadores, fuentes, sets normales en eliminatorias ni STB de grupos.

**Final:** Tiago/Stefano derrotó 6-4, 6-4 a Ignacio/Narela. Campeones Tiago/Stefano; subcampeones Ignacio/Narela. El usuario indicó que **publicó y revisó satisfactoriamente la presentación visual pública**, luego finalizó administrativamente el torneo. **Última lectura en Supabase:** `status=completed`, `is_published=false` (oculto ahora). Sigue almacenado: **NO eliminarlo automáticamente**. No se programó ningún partido en cancha real ni se generaron bloqueos por esta prueba. Última comprobación de preservación: 41 reservas, 4 solicitudes de turnos fijos y 4 bloqueos.

**SIGUIENTE HITO — APROBACIÓN FINAL DE MARTÍN, PENDIENTE:** Martín debe ejecutar por sí mismo una prueba integral del módulo de Torneos (crear, aprobar parejas, sortear, cargar resultados, resolver empates, confirmar tablas, disputar eliminatorias y publicar/finalizar), verificar Admin y web pública y comunicar su conformidad o ajustes. **La aprobación del usuario no equivale a la aprobación de Martín.** Hasta entonces el módulo está **verificado funcionalmente para pruebas de 6 y 7 parejas**, pero **pendiente de aceptación definitiva del cliente**.

**Higiene posterior:** el usuario indicó que eliminará después el torneo ficticio de 7 parejas; también sigue pendiente retirar el torneo ficticio de 6 parejas y revisar ramas de GitHub ya integradas. No realizar borrados automáticos ni tocar reservas reales. Última sincronización local confirmada por el usuario: `f10cf03`, árbol de trabajo limpio, **246/246 tests Node aprobados** antes de esta actualización documental; el nuevo commit de documentación requerirá `git pull --ff-only origin main` cuando vuelva a trabajar.

---

 
## Cierre de jornada — 12/11/2026, hora Argentina (ESTADO VIGENTE)

**Confirmado en producción:** la modalidad **Grupos + Eliminatorias (Reglamento 2026)** superó un recorrido manual completo con **seis parejas** en el torneo ficticio `PRUEBA - TORNEO 6 PAREJAS`: 2 zonas de 3, 6 resultados de grupo, corrección de un marcador, STB solo en grupos, empate triple del Grupo B, desempate manual, confirmación de posiciones, dos semifinales y final con tercer set normal. Nicolás Castro/Tomás Herrera quedaron campeones y Sebastián Ruiz/Gabriel Romero subcampeones. El usuario aprobó las interfaces Admin y pública tras varias correcciones. El torneo fue finalizado y mostrado públicamente durante las revisiones visuales. **Última lectura directa de Supabase: estado `completed`, `is_published=false` (ahora oculto), 6 partidos de grupo y 3 eliminatorias disputadas. No borrar todavía: queda la limpieza del torneo de prueba para un momento acordado.**

**Diseño entregado:** PR #22 tablas/contraste/llaves Admin; #23 botones alineados; #24 números alineados a la derecha; #25 modal propio de confirmación oficial; #26 grilla 3/2/1 de eliminatorias Admin; #27 referencias R1-1/R1-2 coherentes; #28 fixture y resultados públicos 3/2/1, cuadro claro con podio, sin duplicado vacío; #29 **dos semifinales en una fila, final centrada debajo sin ocupar todo el ancho, podio grande simétrico con copas dorada y plateada**. PR #21 fue la implementación de las reglas/migraciones SQL90/91/92. Último commit funcional de `main`: `9519da454eabfce92f1da1cdb7ca6fa96879cc98` (PR #29); Cloudflare Pages **success**; pruebas Node, PostgreSQL y Chromium **aprobadas** en la rama del PR antes de fusionar. La validación real en distintos equipos con Martín no sustituye los tests automatizados; el usuario confirmó visualmente PC.

**Datos protegidos (consulta de solo lectura al cierre):** 41 reservas reales, 4 solicitudes de turno fijo, 4 bloqueos, 1 torneo de prueba con 6 partidos de grupo y 3 cruces eliminatorios. No modificar ni borrar las reservas ni los turnos reales. Las mejoras de hoy son de interfaz y pruebas; no se alteraron las reservas.

**PRÓXIMO PASO ACORDADO — 13/11/2026:** después de sincronizar la laptop, crear y probar **un torneo de 7 parejas** bajo Reglamento 2026. Comprobar el reparto previsto **A:4 y B:3**, los cuatro encuentros del grupo de 4 y los tres del grupo de 3, clasificación **3+2**, sorteo, tabla/desempates, llave de cinco clasificadas, adaptación responsive PC/móvil, marcadores, final, podio, visibilidad pública y cierres. Probar primero flujo y diseño; si surge alguna diferencia, investigar antes de corregir producción. No crear horarios reales de cancha sin comprobar disponibilidad. Después de las pruebas, **eliminar explícitamente los torneos ficticios** desde Admin con verificación y limpiar ramas de GitHub ya fusionadas, preservando `main`.

**SINCRONIZACIÓN LOCAL PENDIENTE DE CONFIRMACIÓN DEL USUARIO:** en la laptop `cd ~/Clientes-TGJotaPe/BoulevardPadel && git status && git fetch origin && git pull --ff-only origin main && git log -1 --oneline && git status`. La sincronización de la laptop NO puede realizarse desde el GitHub conectado; solo el usuario puede ejecutar los comandos locales. Las ramas remotas de desarrollo no se eliminan de forma automática al fusionar.

> Este bloque sustituye como estado vigente a las notas históricas inferiores. Leer este bloque primero y el último apartado de `BITACORA_DESARROLLO.md`. Las descripciones antiguas de «pendiente de publicar» describen etapas anteriores, no el estado actual.

---


## Despliegue oficial del reglamento 2026 — 12/11/2026 (ÚLTIMO ESTADO)

**CONFIRMADO Y PUBLICADO:** PR #21 fusionado en `main` (squash commit `25d23a6c55db8fd3552bc0fafe2338a26c20cfb1`). El check oficial de **Cloudflare Pages devolvió «Deployed successfully»** para ese commit. También aprobaron los cuatro checks posfusión de GitHub: Cloudflare Pages, test Node, SQL89 PostgreSQL 17 y Chromium móvil. No se pudo inspeccionar el navegador real del usuario desde este entorno; queda pendiente un recorrido visual y operativo con Martín.

**Supabase productivo:** están instaladas las migraciones 2026 SQL90, SQL91 y SQL92. Se verificó al final: **41 reservas, 4 turnos fijos solicitados, 4 blockouts y 0 torneos**; antes de trabajar eran exactamente 41/4/4. Los nuevos módulos de torneos son independientes; los bloqueos de eliminatorias solo se crean al programar un encuentro nuevo y se liberan al postergarlo. No se editaron reservas ni turnos fijos.

**Funcionalidades:** Grupos + Eliminatorias 6–40 y Liga con reglas confirmadas, Admin para posiciones/empates/resultados/horarios, publicación de llaves y horarios en web pública; motor y tests compartidos. Nuevas vistas y RPC protegidas con RLS. Ver sección «Reglas 2026» más abajo y `docs/REGLAMENTO_TORNEOS_20261112.md`.

**Próxima acción del usuario:** cuando pueda, abrir el Admin y la web pública, comprobar visualmente la nueva sección y hacer con Martín una prueba end-to-end con un torneo nuevo (no existen campeonatos en este momento). Para sincronizar la laptop, trabajar sobre `main`, ejecutar `git pull --ff-only` y `node --test tests/*.test.js`. La rama de desarrollo puede eliminarse después de comprobar la sincronización; PR #21 ya quedó fusionado y cerrado.

> Fuente breve de continuidad. Leer este archivo PRIMERO al iniciar otro chat, después consultar el final de `BITACORA_DESARROLLO.md` y los archivos reales de la rama. No sustituye el código ni las pruebas.
>
> Archivo histórico con notas antiguas. **Último estado: 12/11/2026 (Argentina), ver el bloque de abajo.** Notas posteriores del 10/11 conservadas como historial y no sustituyen este estado. 
>
> Histórico — 10/11/2026: **MÓDULO TORNEOS Y CAMPEONATOS FINALIZADO en su alcance funcional actual, validado por el usuario en producción.** `main` es la única rama; el único Supabase productivo permanece sin ramas. La Liga «Apertura 2027» fue auditada por lectura SQL (5 parejas, 10 regulares, 3 cruces finales), con puntos, desempates y campeón/subcampeón correctos; podio oro/plata correcto en Admin y público. El usuario confirmó visualmente que las 3 tarjetas de semifinales y final del Admin ya ocupan todo el ancho. La suite de 230 pruebas Node pasó antes del último ajuste aislado de CSS; no se ha confirmado una nueva ejecución completa posterior al último CSS. **Sin cambios en reservas ni turnos fijos.**

## Reglas 2026 — actualización técnica del 12/11/2026 (último estado)

- **Reglamento deportivo APROBADO con Martín**: torneos de 6 a 40 parejas, grupos de 3/4 (los de 4 son A, B, ...), 2 clasificadas por grupo de 3 y 3 por grupo de 4. Grupo de 3 con 3 partidos; zona de 4 con cuatro partidos (ganadores vs ganadores y perdedores vs perdedores). Sorteo aleatorio servidor. Tabla por puntos (2 ganado/0 perdido), diferencia de sets, diferencia de games, enfrentamiento directo si existió y orden final manual de Martín si persiste empate. Solo grupos usan STB; todas las eliminatorias son al mejor de 3 sets normales. Pase directo prioriza primeras de grupos de 4 o etiquetas A/B cuando son todos de 3. Publicar la estructura completa desde el fixture. Sin tercer puesto. Abandonos: Martín registra marcador normal sin señalar motivo.
- **Liga 2026**: sets normales incluso en fase regular (sin STB); 2 puntos al ganador, 1 al perdedor 2–1 y 0 al perdedor 2–0; 1° vs 3° y 2° vs 4° en semifinales, final y sin tercer puesto.
- **Supabase PRODUCTIVO**: migraciones SQL90 `reglamento_torneos_grupos_eliminatorias_2026`, SQL91 `liga_tres_sets_normales_2026`, SQL92 `programacion_segura_eliminatorias_2026` instaladas. Tablas nuevas con RLS y escrituras administrativas restringidas. SQL92 crea un bloqueo de cancha manual SOLO al programar un encuentro, con vínculo privado; al postergar lo retira. No alteró esquema antiguo ni datos reales de reservas.
- **Verificación posterior a migraciones**: **0 torneos**, **41 reservas**, **4 solicitudes de turno fijo** y **4 bloqueos** (idénticos antes/después). No crear nuevas pruebas en producción sin autorización.
- **GitHub**: desarrollo en rama `desarrollo/reglamento-6-40-20261112`, PR **#21** en borrador hasta aprobación de los checks; `main` aún no ha incorporado estos cambios al momento de esta anotación. Las pruebas automáticas Node (anteriores y nuevas), PostgreSQL17 aislado con 35 configuraciones 6–40, SQL91, SQL92, test de reserva/conflicto, y navegadores Chromium móvil pasaron en commit `2d7cdcc`.
- **Publicación pendiente al momento de esta anotación**: fusionar PR #21 a `main` y verificar despliegue automático en Cloudflare Pages y funcionamiento real del Admin; no confundir migración SQL lista con sitio desplegado.
- **Seguridad**: el asesor Supabase detecta avisos heredados sobre vistas SECURITY DEFINER y funciones legacy; nuevo almacenamiento privado de 2026 está RLS enabled sin SELECT directo (por diseño), y los reportes públicos pasan por RPC sanitizada. Evaluar esas alertas antiguas separadamente; no retocar reservas por el nuevo reglamento.
- **Registro autoritativo de reglas y límite funcional**: `docs/REGLAMENTO_TORNEOS_20261112.md` más el código real de la rama.

## Cierre funcional de Torneos — 10/11/2026 (confirmado por el usuario)

- **Estado: FINALIZADO para el alcance aprobado.** El usuario verificó que todo funciona y dio conformidad para cerrar. Se comprobaron Admin y sitio público, aspecto del podio (campeones/subcampeones) y la distribución a lo ancho de las tarjetas SF1/SF2/Final en el Admin.
- **Reglas:** Liga con fase regular, posiciones, puntajes 2/1/0, desempates, semifinales y final. La auditoría de «Apertura 2027» confirma la correspondencia de los 10 marcadores con la tabla y la final oficial. El usuario probó restricciones de scores, súper tie-break habilitado solo con 1–1, publicación pública y bloqueos del turnero al programar.
- **Calidad:** 230/230 pruebas Node informadas como aprobadas por el usuario antes del último ajuste exclusivamente CSS. No se recibió salida de la suite Node después de ese ajuste; el usuario **sí confirmó visualmente el resultado en producción**. No confundir validación visual con una segunda pasada de tests.
- **Preservación:** NO tocar más el módulo sin nuevo pedido concreto. Solo `main`, un proyecto Supabase, sin nueva SQL ni ramas, y reservas/turnos fijos conservados.
- **Evoluciones futuras separadas del cierre:** el caso particular de empate de posiciones para un torneo de 7 parejas en grupos de 3 y 4 queda como *pendiente diferido de reglas*, no bloquea este cierre; se retomará solo si el usuario lo solicita. No presentar tareas históricas marcadas «desarrollo» como pendientes activos cuando ya fueron publicadas.
- **Siguiente acción:** ninguna en Torneos. Al hacer el próximo trabajo local, sincronizar `main` si hay cambios nuevos de documentación.

## Reapertura de diseño deportivo — 10/11/2026 (sin cambios funcionales)

> **Prioridad de continuidad:** a pedido del usuario, documentar decisiones confirmadas y asuntos en suspenso por separado. El cierre funcional del módulo vigente NO se revoca: se trata de una propuesta futura de reglas para **Grupos + eliminatorias**, pendiente de aprobación. No modificar código, RPC, Supabase, reservas reales ni turnos fijos por estos análisis.

- **CONFIRMADO — 6 parejas:** dos grupos de 3, todos contra todos dentro de cada grupo (3 partidos por grupo); clasifican 1° y 2° de cada grupo. Semifinales 1°A vs 2°B y 1°B vs 2°A; ganadores juegan final. Total 9 partidos.
- **CONFIRMADO — estructura interna del grupo de 4:** dos cruces iniciales; luego ganadores vs ganadores y perdedores vs perdedores (4 partidos en total). Para ordenar la clasificación deportiva de quienes terminan con una victoria y una derrota, NO asumir que el perdedor de ganadores sea siempre 2°: revisar tabla de posiciones; ver los desempates a continuación.
- **CRITERIOS COMUNICADOS POR MARTÍN para empates por puntos:** diferencia de sets → diferencia de games → resultado del enfrentamiento directo (solo si existió) → sorteo o decisión del organizador si aún persiste. Revisar casos de 3+ parejas empatadas antes de implementarlo. Distinto de criterios actuales de algunas funciones del motor; **no implementar todavía**.
- **EN SUSPENSO — 7 parejas (4+3):** se examinó que clasifiquen dos por grupo y haya semifinales cruzadas como en 6; NO se considera aprobado hasta resolver el orden por tabla del grupo de 4 y validarlo con Martín.
- **EN SUSPENSO — 8 parejas (4+4):** definir si clasifican **dos** por grupo (4 clasificadas, semifinales cruzadas y final) o **tres** por grupo (6 clasificadas). Con seis se plantea como alternativa estándar pase directo a semifinales de los 1° de grupo; 2°A vs 3°B y 2°B vs 3°A juegan dos preliminares, cuyos ganadores enfrentan a los 1° del grupo opuesto, y luego final. Alternativa del usuario — tres cruces para obtener tres ganadores, mini todos-contra-todos de esos tres y final — sólo propuesta, no aprobada. Los cruces de ejemplo con un grupo C no aplican cuando solo existen A y B.
- **EN SUSPENSO — más participantes:** distribución en grupos de 3 y 4 es calculable por `planGroupSizes()`; cupos de clasificación y llaves eliminatorias de 9+ necesitan aprobación específica. No asumir que la tabla propuesta anteriormente para 13+ es definitiva.
- **Revisión técnica de solo lectura:** `js/torneos-motor.js` ya crea fixtures de 3/4; `calculateGroupStandings()` hoy ordena por puntos, diferencia de sets, sets a favor, y `decisiveFourPlacings()` por cruces. No reflejan íntegramente los criterios de desempate comunicados por Martín; diseñar una solución futura con tests de regresión. La Liga previamente finalizada permanece intacta.

## Análisis documental de llaves PDF 6–40 parejas — 10/11/2026

> **Estado: DOCUMENTO EXTERNO ANALIZADO; NO APROBADO COMO REGLAMENTO BP.** Archivo suministrado por el usuario «Drops 6 a 40 parejas(1).pdf» (35 páginas, una llave por cantidad de 6 a 40). Se revisaron sus diagramas; ninguna escritura en código, SQL ni Supabase. La regla de 6 parejas sigue confirmada; 7, 8 y 9+ siguen en suspenso para adopción de Martín.

- **Patrón observado en el PDF, no decisión de BP:** formar zonas de 3 y 4; se muestran **2 clasificadas por grupo de 3 y 3 por grupo de 4**, en todas las llaves consultadas. Esto difiere de la propuesta en suspenso de 7 parejas con 2 clasificadas en la zona de cuatro.
- **Ejemplos textuales de las láminas:** página 1, 6 parejas → 4 clasificadas y semifinales cruzadas (confirmado BP); página 2, 7 parejas → 5 clasificadas (1° A, 2° A, 3° A, 1° B, 2° B); previa 3° A vs 2° B, su ganador vs 1° A, otra semifinal 2° A vs 1° B; página 3, 8 parejas → 6 clasificadas, previas 3° A vs 2° B y 2° A vs 3° B, con 1° A y 1° B directos a semifinales. Página 8, 13 parejas → **9 clasificadas** (no 8), una previa antes de cuartos. Página 35, 40 parejas → **27 clasificadas**, once preliminares antes de octavos.
- **Fórmula hallada (hipótesis consistente con las 35 láminas):** para N parejas (6..40), G=floor(N/3), grupos de 4 = N mod 3, grupos de 3 = G - grupos de 4. Clasificadas Q=2×(grupos de 3)+3×(grupos de 4). Base B=potencia de dos inmediatamente inferior o igual a Q (4,8,16). Previas=P=Q-B; si P>0, pases directos a la ronda de B=Q-2P; si P=0 no hay ronda previa. Eliminatorias totales Q-1 partidos. Esta fórmula representa el conteo, **no resuelve el sembrado**.
- **PENDIENTE deportivo CRÍTICO:** quién recibe pases directos y cómo se determinan cruces en casos desparejos. Página 4, 9 parejas → tres grupos de 3 y seis clasificadas: el PDF da pase directo a 1° A y 1° B, mientras 1° C disputa la preliminar. La lámina no explica por qué se favorecen esos dos primeros. Antes de implementar, Martín debe definir si hay sorteo, prioridad de siembra o determinación administrativa y cómo evitar comparaciones injustas entre zonas de 3 y 4.
- **Lo que el PDF NO define:** puntuación, desempate dentro de cada grupo, modo de resolver los puestos 2°/3° de una zona de 4, asignación imparcial de pases, gestión de W.O./partidos no disputados, confirmación de la llave. Es un patrón de *eliminatorias*, no reglamento deportivo completo.
- **Recomendación técnica, PENDIENTE DE AUTORIZACIÓN:** reutilizar `planGroupSizes` y `buildGroupFixture` existentes; construir motor de llaves puramente a partir de Q, ubicaciones deportivas y decisiones explícitas para pases, con tests para 6..40. **No implementar todavía.** Reservas reales y turnos fijos intactos.

## Simulador de llaves integrado al Admin — 10/11/2026

- **Estado confirmado en GitHub `main`:** solicitud nueva del usuario para que Martín pruebe el simulador interactivo antes de aprobar el reglamento. Se incorporó `admin/simulador-llaves.html` (HTML/CSS/JS autónomos, sin Supabase) y un botón «🧩 Ver simulador de llaves · Vista previa» en la cabecera de la sección Torneos de `admin/index.html`, abriendo otra pestaña con `target="_blank" rel="noopener noreferrer"`. Estilo del acceso aislado en `css/admin-torneos.css` con adaptación móvil. No se añadió enlace al sitio público principal.
- **Funcionalidad del prototipo:** selector de 6 a 40 parejas, distribución 3/4, clasificadas, partidos preliminares, pases directos, llaves hasta final e imprimir/guardar PDF. Cruces específicos de 6–14 registrados en el archivo; 15–40 se visualizan **como propuestas ilustrativas**, no como reglamento aprobado. Los desempates y la elección deportiva de pases directos siguen PENDIENTES con Martín.
- **Protección de producción:** comparador de GitHub desde commit `533f0dcb...` hasta `f5fcd1fe...` detectó **exactamente tres archivos**: `admin/index.html`, `admin/simulador-llaves.html`, `css/admin-torneos.css`. No se modificaron scripts de reservas, motor deportivo, SQL, Supabase, fixtures ni datos reales. No hay peticiones HTTP del simulador ni inicialización de Supabase; la página no ejecuta acciones productivas.
- **Seguridad importante:** como el sitio se sirve como HTML estático por Pages, el enlace directo `/admin/simulador-llaves.html` **no requiere login**, aun si solo el Admin muestra el botón. No hay datos privados en la página; no afirmar que esté protegida por autenticación. Antes de exigir privacidad real, definir protección en servidor/perímetro de Cloudflare. Solo vista previa para revisión deportiva, no reglamento oficial.
- **Comprobaciones:** validación local del motor autónomo para las 35 cantidades (6..40) y chequeos estáticos de presencia de botón, ruta, pestaña aislada, independencia de Supabase y CSS responsive, todos correctos. No se corrió el conjunto completo `node --test tests/*.test.js` del repositorio por falta de clon en el entorno; **Cloudflare no pudo verificarse por HTTP** desde aquí, usuario debe comprobar URL en navegador real. En la laptop, próximo paso recomendado tras `git status --short`: `git pull --ff-only` estando en `main`.

## Validación real del simulador y criterio de clasificación — 10/11/2026

- **CONFIRMADO POR EL USUARIO en navegador real:** el acceso al simulador desde **Admin → Torneos** aparece y el simulador se ve perfectamente. Esta observación valida la apertura/presentación real en Cloudflare; **no** equivale a prueba exhaustiva de cada llave ni a aprobación deportiva de Martín.
- **DEFINICIÓN DE DISEÑO reiterada por el usuario:** las parejas avanzan a las eliminatorias según su **posición en la tabla de su grupo**, no de manera arbitraria ni por cuál de los cruces internos ganaron. Orden de desempate indicado: **puntos → diferencia de sets → diferencia de games → enfrentamiento entre sí (si se enfrentaron) → decisión o sorteo del organizador**. Si el empate afecta el cupo o el sembrado, la clasificación debe quedar pendiente de resolución, no escoger silenciosamente una pareja.
- **EN SUSPENSO hasta aprobación deportiva de Martín:** cupos por grupo y llaves definitivas de 7, 8 y otros tamaños; criterios para adjudicar pases directos de ronda cuando hay varios candidatos; detalles de empates múltiples y orden en grupos de cuatro. La llave mostrada en el simulador es **demostrativa**, y los cruces de 15–40 son ilustrativos.
- **Futuro sujeto a autorización de Martín:** pulir textos, quitar lenguaje de prototipo y preparar una presentación formal y profesional compartible con jugadores inscriptos. **No realizar aún estos cambios ni añadir acceso al sitio público.** El simulador sigue sin conexión a Supabase y sin capacidad de escritura.
- **Seguridad/preservación:** por esta confirmación no se modificaron `admin/index.html`, simulador, CSS, JS, SQL, Supabase, reservas, turnos fijos ni torneos. Solo documentación de continuidad.

## Referencia WPC Rafaela — no descartar (10/11/2026)

- **Decisión del usuario:** NO descartar WPC Rafaela como referencia deportiva/visual para Boulevard Pádel. Mantener su tabla de posiciones y publicación de torneos como material de comparación futura, especialmente estadísticas de sets y games, porcentajes y STB (súper tie-break).
- **Estado:** referencia pendiente de análisis con Martín; NO copiar automáticamente sus reglas de puntuación, desempates o contabilización de STB. Confirmar su significado exacto y reglamento antes de cualquier adopción.
- **Protección:** esto no reabre cambios funcionales; reservas, torneos, SQL y frontend siguen intactos.

## Cómo retomar en el próximo chat

Mensaje sugerido: **«JP, retomamos Boulevard Pádel. Leé ESTADO_ACTUAL.md en GitHub y la última bitácora. SQL89 ya está instalado en el único Supabase; verificá main/Cloudflare y conservá las reservas y turnos fijos intactos.»**

- Repositorio: `boulevardpadelvila/boulevard-padel`.
- **Rama única GitHub y laptop: `main` (10/11/2026).** Las tres ramas remotas fueron eliminadas; el usuario informó la eliminación local de `desarrollo/torneos-20261102` y había eliminado la rama P89. La salida de `git branch -a` previa mostró solo esa rama local antigua y `main`/`origin/main`, por lo que la limpieza de ramas quedó completada.
- PR de Liga a `main`: **#19 FUSIONADO (10/11/2026)**; rama local P89 borrada con `git branch -d` y remota con `git push origin --delete`, ambas confirmadas.
- Proyecto productivo: `https://boulevard-padel.pages.dev/`.
- Supabase de producción: proyecto `boulevard-padel`. **Solo diagnósticos SELECT sin autorización adicional**. No ejecutar ni guardar SQL borrador.
- Instrucción permanente: trabajar en pasos pequeños, con resultados verificables; avisar el comando exacto para laptop cuando corresponda, y esperar su salida antes de avanzar a la siguiente instrucción manual.

## Estado actual definitivo (leer primero; reemplaza avisos históricos posteriores)

- **Decisión del usuario (10/11/2026):** UN solo proyecto Supabase, sin ramas ni staging; autorizó implementar Liga y publicar con cuidado absoluto de no alterar reservas/turnero. Los torneos de prueba pueden eliminarse solo si se necesita; **no se eliminó ninguno**.
- **Base productiva SQL89 INSTALADA:** migración `20261110121714 bp_sql89_liga_semifinales_final_y_desempate` aplicada con éxito. Existen tablas de semifinales/final y desempates; ambas vacías hasta iniciar fase final. **No volver a ejecutar el SQL89**.
- **Respaldo interno privado:** migración `20261110121529 bp_sql89_private_safety_snapshots`, esquema `bp_p89_safety`; roles anon/authenticated sin acceso. Contiene instantáneas de 8 tablas previas y 4 definiciones de funciones. No es un respaldo externo ni recuperación PITR.
- **Integridad confirmada tras migración:** `reservations` 35/35, `fixed_turn_requests` 4/4, `blockouts` 39/39, `weekly_hours` 7/7, `bp_league_matches` 66/66, torneos 4/4, parejas 38/38, settings 1/1. Comparación por ID y contenido JSONB: 0 filas eliminadas, nuevas o alteradas en todas esas tablas. Función `get_available_slots(date)` operativa: 9 horarios disponibles los días 11/11 y 14/11; se mantuvieron los triggers de reservas y turnos fijos. Cero bloqueos inválidos ni reservas superpuestas a bloqueos activos.
- **Frontend FUSIONADO en `main`:** PR #19 merged 10/11/2026, commit `91a67f96a8c1d08871a0d890f01b270e08a6e15d`. Se comprobó `index.html` y `admin/index.html` de `main` con scripts P89. **Cloudflare Pages no verificable por HTTP desde este entorno** (sin resolución DNS); revisar visualmente el sitio y el Admin. El usuario debe sincronizar `main` en su laptop, después se puede borrar la rama de GitHub de desarrollo.
- **Test sintético CI validado:** 226/226 JavaScript, 3/3 Chromium móvil, PostgreSQL 17 con RLS, carreras, empate y no-regresión de reservas. Se mantiene un solo proyecto, sin staging.
- Protocolo actualizado: `docs/P89_DESPLIEGUE_CONTROLADO.md`. Si se encuentran referencias antiguas a «NO instalar SQL89» más abajo, **son anotaciones HISTÓRICAS previas a la autorización y aplicación efectiva**.

## Verificación real del usuario · 10/11/2026

- Laptop en `main`, `git pull --ff-only` exitoso hasta `728b6ff` sin conflictos.
- Cloudflare sirve `/js/admin-liga-final89-ui.js`: el usuario ejecutó `curl -fsSL ... | grep -F 'bp_league_prepare_final_manual89'` y confirmó la línea del RPC.
- Turnero público: el usuario abrió el sábado 14/11/2026 y confirmó que aparecen perfectamente los horarios disponibles. **No creó reservas, no canceló turnos ni editó registros.**
- Admin: el usuario ingresó a Torneos y Campeonatos, seleccionó la Liga y confirmó que todo se ve correctamente (parejas, partidos y posiciones). No modificó resultados ni generó semifinales.
- SQL89 instalado, PR #19 fusionado y frontend servido por Cloudflare; **verificación visual/read-only aprobada**. La creación/cancelación de reservas y el flujo completo de fase final con sesión de Martín siguen sin una prueba manual en producción; no afirmar que esos flujos ya fueron ejercitados.
- Próximo paso acordado: eliminar la rama de Git **local y remota** `desarrollo/liga-fase-final-20261109` de manera ordenada, sin borrar historial fusionado; mantener `main` como única rama de trabajo. No borrar el respaldo privado `bp_p89_safety`.

## Limpieza de ramas Git (10/11/2026)

- **Confirmado**: el usuario ejecutó `git branch -d desarrollo/liga-fase-final-20261109` (eliminada localmente; apuntaba a `5bc110d`) y `git push origin --delete desarrollo/liga-fase-final-20261109` (borrada en GitHub). La búsqueda posterior en GitHub confirmó que esa rama ya no existe.
- **Ramas Git históricas retiradas de GitHub tras auditoría:** `desarrollo/eliminatorias-generalizadas-20261107` y `desarrollo/torneos-20261102`. `search_branches` posterior confirmó únicamente `main`. Los commits antiguos no se fusionaron sobre producción; la funcionalidad válida ya existe en `main` y el helper experimental está archivado. El único proyecto Supabase permanece intacto.
- **Auditoría cerrada sobre contenidos principales:** `desarrollo/torneos-20261102` tiene exactamente el mismo `sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql` y `tests/torneos-eliminacion70.test.js` que `main`, y el Admin actual conserva los RPC de eliminación. `desarrollo/eliminatorias-generalizadas-20261107` aportaba un helper experimental `analyzeKnockoutGroups` ausente en `main`; se archivó su código literal en `docs/ARCHIVO_ELIMINATORIAS_GENERALIZADAS_20261107.md` sin activarlo. No fusionar versiones antiguas: pueden romper lógica vigente. Las ramas antiguas pueden retirarse ordenadamente.
- Próximo control: sincronizar `main` de la laptop con la bitácora de cierre y comprobar referencias locales mediante `git branch -a`. Si todavía existen ramas locales antiguas, verificar primero antes de borrarlas. No tocar reservas, horarios o turnos fijos.

## Estado más reciente · Auditoría Apertura 2027 y presentación del podio (10/11/2026)

- **SQL SOLO LECTURA, sin mutaciones:** torneo `Apertura 2027` con 5 parejas aprobadas, una rueda, **10 cruces únicos en 5 Fechas**, todos disputados. Tres partidos regulares llegaron al súper tie-break; un súper tie-break suma un set, no games. Suma de puntos oficiales **23** (20 por 10 ganadores y 3 por derrotas 2–1). Sin empates absolutos, 0 decisiones manuales de desempate.
- **Comparación independiente SQL vs reglas del motor:** posiciones 1–5: puntos `6,6,5,3,3`; diferencia de sets `+4,+2,+1,-3,-4`; diferencia de games `+12,-2,-1,+3,-12`. Los empates a 6 y 3 puntos se resuelven correctamente por diferencia de sets antes de games. Cuatro partidos jugados por pareja; las cinco métricas de orden son Pts, diferencia de sets, sets a favor, diferencia de games y games a favor. La tabla refleja los marcadores.
- **Fase final real:** semifinales 1° vs 3° y 2° vs 4° disputadas; final 7–5, 5–7, 7–5. RPC pública sanitizada `bp_public_league_final89` confirmó los dos finalistas, campeón y subcampeón; torneo `status=completed`, `is_published=true` según consulta posterior. No se modificaron resultados ni estado por el asistente.
- **P90 visual en `main`:** `js/torneos-liga-final89-public.js` y `css/torneos-liga-final89.css` ahora reutilizan tarjetas oro/plata y trofeos vectoriales del estilo Eliminatorias; `js/admin-liga-final89-ui.js` y `css/admin-liga-final89-ui.css` incorporan las mismas tarjetas, de dos columnas también en celular. Exclusivamente lectura, sin nuevas RPC, tablas, cambios de reglas o turnero.
- **Ajuste posterior confirmado por capturas del usuario:** podio correcto en Admin y público. En el Admin, las tarjetas de SF1/SF2/Final se veían estrechas en el primer sector por el `repeat(auto-fit, minmax(min(100%, 270px), 1fr))`. Se corrigió **solo** `css/admin-liga-final89-ui.css` a tres columnas iguales (`repeat(3, minmax(0, 1fr))`) con fallback de una columna hasta 900px; el podio sigue de ancho completo. Test contractual agregado en `tests/torneos-liga-final89-admin.test.js`. **Pendiente verificación visual y suite Node posteriores al ajuste.**
- **Pruebas añadidas/actualizadas:** `tests/torneos-liga-apertura2027-auditoria.test.js` con marcadores **anonimizados** y comparación de clasificación, validación de sets, 10 cruces, semifinales y final; pruebas DOM público, Admin y Chromium móvil ajustadas al nuevo podio. **Prueba funcional aislada real del motor JS y render público DOM: aprobada** (cinco métricas exactas vs SQL, cruces, campeón/subcampeón, SVG dorado/plateado solo con cierre oficial). Workflow P89 restringido a cambios de Liga en `main`. **Suite completa Node y Chromium posteriores a P90 aún sin resultado confirmado:** ejecutar en laptop `node --test tests/*.test.js` tras sincronizar. No afirmar CI verde nuevo hasta confirmarlo.
- **Protección:** reservas, solicitudes fijas, calendarios y datos del turnero no se leyeron ni modificaron en esta auditoría; no se creó proyecto ni rama, no se aplicó SQL de escritura. El histórico de seguridad de P89 sigue vigente y separado.

## Objetivo que se está desarrollando

**Parche 89: fase final de la modalidad Liga.** Al terminar TODOS los partidos de la fase regular, clasificar los cuatro mejores según las cinco métricas acordadas (puntos 2/1/0, diferencia de sets, sets a favor, diferencia de games, games a favor). Un empate absoluto que afecte el top 4 requiere resolución administrativa, sin desempate arbitrario. Semifinales **1° vs 3°** y **2° vs 4°**; final entre ganadores; **sin partido por tercer puesto**. Semifinales/final: dos o tres sets normales, sin súper tie-break. Campeón y subcampeón solo desde la final jugada y el cierre oficial, NO desde la tabla regular.

## Estado verificado

- Última sincronización local reportada: `git pull --ff-only` avanzó `e0c6d0a..5bc110d` correctamente, sin conflictos. Las modificaciones y documentación posteriores de producción todavía NO están sincronizadas en la laptop.
- Laptop: 201/201 verificados previamente; CI tiene ahora **226/226 JavaScript** y **3/3 Chromium móvil aislado**, falta sincronizar nuevo commit.
- GitHub Actions: run **42812958161**, tres jobs SUCCESS: **226/226 JavaScript**, **3/3 Chromium móvil**, PostgreSQL 17 aislado (paridad 35/4/39, concurrencia, empate manual, roles reales anon/authenticated y RLS, 12 parejas/66 partidos).
- SQL consolidado: `sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql` (2A+2B+2C+2F desempate, con guardia de fixture reforzada). **BORRADOR; NO INSTALAR NI GUARDAR EN SUPABASE SQL EDITOR**.
- Esquema y smoke test temporal: `tests/fixtures/p89_postgres_bootstrap.sql` y `tests/fixtures/p89_postgres_smoke.sql`. PostgreSQL 17 **sintético, efímero**, no es copia de Supabase.
- En Supabase de producción, la Liga «SUMA 14 - Temporada 2027» sigue con **12 parejas aprobadas, 66 partidos regulares, 1 disputado**, inscripciones cerradas, NO publicada, sin tabla de fase final P89 (último SELECT 09/11).
- Tabla de partidos regulares `bp_league_matches`: NO reescribir, vaciar ni borrar. No alterar programaciones actuales. Los demás formatos de torneo y las reservas reales deben permanecer intactos.

## Trabajo hecho en SQL 89

1. Tabla `bp_league_final_matches` separada de la fase regular, RLS Admin, dos semifinales y una final.
2. RPC Admin para generar fase final, programar/postergar/reprogramar 90 o 120 min, cargar marcadores, resolver finalistas.
3. Guardián de bloqueos con cuarta referencia a partido final, verificación de cancha ocupada; guardia de cierre y consulta pública sanitizada.
4. Previsualización y eliminación segura de torneo incluyen los tres encuentros finales y bloqueos, sin borrar reservas.
5. Bloqueo de altas/bajas/cambios de identidad y resultado de partidos regulares al crear fase final. El INSERT toma `FOR SHARE` del torneo para serializar contra la preparación de semifinales (`FOR UPDATE`).
6. Pruebas SQL aisladas verificaron generación, cruces, agenda, superposición, marcadores, campeón, cierre, permisos básicos, y eliminación con reserva independiente conservada.

## Admin fase final (nuevo en rama de desarrollo)

- `js/admin-liga82.js` continúa administrando la fase regular y ahora notifica su carga mediante `bp:league-loaded`.
- `js/admin-liga-final89-ui.js`: botón de generación de semifinales (con confirmación), tarjetas de SF1/SF2/final, programación 90/120 minutos, postergación, carga de resultados normales y campeón/subcampeón SOLO al cerrar oficialmente el torneo.
- `admin/index.html` + `css/admin-liga-final89-ui.css`: responsive móvil y modales independientes; no se añadió menú nuevo.
- No operar esta interfaz en producción antes de instalar la migración definitiva con autorización expresa. El Admin actual no se modificó en `main`.
- Tests: `tests/torneos-liga-final89-admin.test.js` (8 nuevos), **209/209 CI OK**.

## Público P89 y protección de turnero (nuevo en desarrollo)

- Módulo independiente `js/torneos-liga-final89-public.js`: muestra SF1/SF2/final, fechas, parciales y campeón/subcampeón solo si `bp_public_league_final89` devuelve ganador oficial de final y ambos estados completed. No revela teléfonos.
- `js/torneos-public.js` obtiene `bp_public_league_final89` por RPC; `index.html` carga JS y CSS sólo dentro del bloque de torneos.
- `js/admin-liga82.js` desactiva corrección de resultados regulares luego de crear semifinales, mediante evento `bp:league-final-state` emitido por el módulo final.
- **GitHub Actions run 42743654250**: 221/221 tests OK; PostgreSQL 17 smoke, prueba de dos sesiones y 12 parejas/66 partidos/11 Fechas OK. Ver logs para afirmaciones de CI.
- **Supabase productivo (SELECT únicamente):** 35 registros en `reservations`, 4 en `fixed_turn_requests`, 39 en `blockouts`, 7 en `weekly_hours` (instantánea de auditoría, NO prueba histórica de ausencia de cambios). Ninguna escritura productiva.
- **Diff `main` vs rama P89:** 33 archivos, ninguno de turnero, reservas, turnos fijos ni horarios semanales. EL SQL P89 modifica las restricciones/triggers de `blockouts` cuando SE INSTALE; todavía es BORRADOR y NO está instalado. No confundir estado de rama con publicación.

## Auditoría P89 del 10/11/2026

- `SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql` se envolvió en **una única transacción BEGIN/COMMIT** con `SET LOCAL lock_timeout='5s'` y `statement_timeout='90s'`; probado en PostgreSQL 17 temporal. Si una instrucción falla antes de COMMIT, la transacción se revierte. **Sigue BORRADOR; NO EJECUTAR en Supabase**.
- Prueba de navegador `tests/torneos-liga-final89-browser.test.cjs`: Chromium real a 390×844, 2/2 aprobadas con módulos reales, DOM de ensayo y Supabase simulado. La tarjeta pública es plegable y se probó apertura, marcadores y proclamación oficial. El Admin simuló generación, programación de 120 min y carga de marcador. **No equivale a probar autenticación/SQL en producción**.
- Auditado en Supabase con SELECT solamente: `reservations` 35, `fixed_turn_requests` 4, `blockouts` 39, `bp_league_matches` 66 (1 jugado), tabla P89 inexistente. De los bloqueos activos de torneos, 0 inconsistencias de horario y 0 referencias a partidos sin programación. En GitHub, comparación contra `main` sin archivos del turnero/turnos fijos modificados.
- Advisors de seguridad muestran avisos previos en 2 vistas públicas y RPC SECURITY DEFINER existentes; la RPC `create_admin_booking_flexible` verifica `auth.uid()` e `is_admin()` internamente. Revisar como mantenimiento aparte; **no cambiar funciones de reservas como parte de SQL89**.
- PR #19 sigue abierto como DRAFT. No se tocó `main`, Cloudflare ni la BD productiva.

## Ensayo de paridad con esquema real (10/11/2026)

- Se consultaron en **modo lectura** restricciones FK/CHECK/EXCLUDE, enums y disparadores de Supabase para las tablas afectadas o relacionadas con P89. Se creó `tests/fixtures/p89_live_schema_parity.sql` con **réplica sintética de las restricciones principales** (no es un volcado real ni una réplica completa de Supabase). Incluye exclusión GiST de reservas superpuestas, FK de reservas a turnos fijos y de bloqueos a partidos; 35 reservas, 4 turnos fijos y 39 bloqueos antiguos **ficticios**.
- `tests/fixtures/p89_live_schema_postcheck.sql` verifica después de instalar SQL89 en PostgreSQL 17 descartable: **35 reservas, 4 vínculos fijos y 39 bloqueos íntegros**, protección de bloqueos antiguos frente a modificaciones/borrados y rechazo de nuevas reservas superpuestas. Los otros smoke tests siguen probando programación, resultados, borrado y clasificación.
- **Confirmación de CI:** run **42805545210**: 222 JavaScript, 2 Chromium y trabajo SQL completo **SUCCESS**. El primer intento con la paridad detectó que el *fixture de prueba* de concurrencia omitía nombres obligatorios para las parejas; se corrigió el fixture, no se cambió una regla deportiva ni un dato productivo.
- **Supabase:** `list_branches` devolvió cero ramas de prueba; no se creó ningún proyecto externo ni se copiaron datos personales. Falta la validación completa de autenticación y de un esquema exacto en staging antes del despliegue.
- **Entorno productivo INTACTO.** No instalar SQL89 ni fusionar PR #19 todavía.

## Revisión de permisos previa a publicación (10/11/2026)

- Se consultaron **en modo lectura** los permisos reales de `bp_admin_tournament_delete_preview(uuid)` y `bp_admin_delete_tournament_safely(uuid,text)`: anon sin EXECUTE, authenticated con EXECUTE, checks internos de Admin. Las dos RPC de trigger `bp_league_finish_guard` y `bp_tournament_blockout_integrity_guard` no permiten ejecución directa por anon/authenticated.
- En el SQL89 **BORRADOR** se añadieron `REVOKE ALL FROM PUBLIC,anon,authenticated` y `GRANT EXECUTE TO authenticated` para las dos RPC de borrado, preservando explícitamente permisos actuales en cualquier instalación futura.
- Se agregaron test estático y verificación de ACL por SQL en la base efímera. GitHub Actions **42808877516**: **223 JS, 2 Chromium, PostgreSQL 17 OK**. `main` y Supabase productivo intactos.
- Pendiente auténtica validación E2E contra staging y un procedimiento de respaldo/recuperación verificable. **No publicar aún**.

## Empate absoluto resuelto EN DESARROLLO (10/11/2026)

- `bp_league_prepare_final_manual89(uuid,uuid[],text)` (SECURITY DEFINER, AUTH y admin activo) permite elegir el 1°–4° SOLO entre parejas con igualdad exacta de **puntos, diferencia de sets, sets a favor, diferencia de games y games a favor**. El orden de las no empatadas nunca se modifica. También cubre el empate de 4° con 5°, con selección de cupo.
- `bp_league_final_tiebreak_decisions89` guarda cuatro IDs, motivo de 10–300 caracteres, `auth.uid()` y fecha; RLS solo Admin. La decisión queda dentro de la misma transacción que crea dos semifinales y una final. Sin escritura a fixture regular.
- Admin: `admin/index.html`, `js/admin-liga-final89-ui.js`, CSS correspondiente muestran cuatro selectores restringidos a las parejas realmente igualadas y campo de motivo, únicamente tras completar resultados regulares con empate absoluto.
- `tests/fixtures/p89_postgres_manual_tiebreak.sql` modela cinco parejas con empate absoluto en 10 partidos; valida rechazo automático, bloqueo a no admins, duplicados y motivo corto, resolución manual, auditoría y conservación de resultados. `tests/torneos-liga-final89-browser.test.cjs` incluye ahora una tercera prueba con el puesto 5° elegido en lugar del 4° por decisión documentada. **CI 42811132379: 225 JS + 3 Chromium + SQL SUCCESS.**
- **No se instaló ni desplegó en producción.** PR #19 DRAFT. Falta staging autenticado/copia exacta + plan de respaldo y publicación.

## Prevuelo + roles PostgreSQL + plan de despliegue (10/11/2026)

- Consulta `sql/SQL_89_PREVUELO_SOLO_LECTURA.sql`, únicamente SELECT de catálogos/privilegios: **22 de 22 controles OK en Supabase productivo** a 10/11/2026. Confirmó dependencias, tres triggers críticos, exclusión GiST de reservas, permisos admin, existencia de turnos fijos y ausencia de P89 instalado. Repetir justo antes de aplicar SQL; si algo cambia, detener.
- `tests/fixtures/p89_postgres_auth_roles.sql`: prueba con `SET ROLE authenticated` y `SET ROLE anon` (NO login GoTrue). Authenticated Admin genera 3 partidos y los lee por RLS; Authenticated no Admin rechazado; anon no ejecuta RPC Admin ni lee tabla privada, sí consume la RPC sanitizada. **PostgreSQL 17 efímero OK**.
- `tests/torneos-liga-final89-prevuelo.test.js`: control estático que impide que el prevuelo contenga INSERT/UPDATE/DELETE/ALTER/GRANT/REVOKE. CI **226 JS, 3 Chromium, SQL OK** run **42812958161**.
- Procedimiento de publicación y recuperación: `docs/P89_DESPLIEGUE_CONTROLADO.md` con puertas de aprobación, comprobaciones de turnero, backups, abortos y coordinación entre SQL/Frontend. No se ha realizado **respaldo restaurado** ni prueba E2E completa con login real.
- **Límite:** staging real en Supabase puede generar costo; no se creó una rama ni proyecto, ni se incurrió en cargos. Requiere costo conocido y aprobación explícita antes de usarlo.
- **Producción no modificada, PR #19 DRAFT.**

## Pendientes prioritarios

1. **Concurrencia:** protegido y probado en PostgreSQL temporal el INSERT de un partido regular simultáneo a generar semifinales. **Comprobado por lectura** que `bp_reservation_blockout_guard` usa el mismo `pg_advisory_xact_lock(...,72119)` que la programación de partidos (bloqueo de cancha compartido). Faltan ensayos adicionales de corrección de marcadores/reglas de cierre y posibles interbloqueos entre RPC.
2. **Paridad ampliada de restricciones en CI aprobada** con 35 reservas/4 fijos/39 bloqueos sintéticos; aún faltan dependencias/triggers de toda la base real, pruebas E2E autenticadas y despliegue en staging. No presentar el ensayo como certificación de producción.
3. **Admin fase final integrado EN DESARROLLO:** `js/admin-liga-final89-ui.js` + modales en `admin/index.html`. **Chromium móvil con datos ficticios: 1 test PASS** (generar, programar y cargar resultado); falta prueba completa del portal autenticado contra un Supabase clon/staging. No instalar todavía.
4. **Público integrado EN DESARROLLO:** `js/torneos-liga-final89-public.js`, `css/torneos-liga-final89.css`, `index.html` y `js/torneos-public.js` consumen exclusivamente `bp_public_league_final89`; cuadro y marcadores, campeón/subcampeón únicamente al terminar y cerrar Liga; **8 tests DOM nuevos**. No publicado.
5. **Probado en PostgreSQL temporal** 12 parejas / 66 encuentros / 11 Fechas y resolución manual de 5 parejas totalmente empatadas por 4 puestos. El motivo y el usuario se registran; solo se permutan parejas empatadas en cinco métricas. Pendientes: validación auténtica de login/RPC/turnero en staging y seguridad completa del esquema productivo. **Aplicar SQL productivo, fusionar PR o publicar SOLO con verificación y consentimiento de despliegue.**

## Próximo paso técnico concreto

**Módulo Torneos FINALIZADO por conformidad del usuario (10/11/2026).** No hay acciones funcionales pendientes dentro del alcance aprobado. La corrección final de tres columnas en el Admin fue confirmada visualmente en producción. La última suite informada fue 230/230 antes del CSS final; nueva ejecución completa tras CSS no confirmada y no bloquea el cierre visual. Al retomar el proyecto por otro motivo, sincronizar `main` con la documentación. Preservar turnero, reservas y turnos fijos.

## Regla de mantenimiento de este archivo

Tras cada etapa importante comprobada: actualizar SOLO este resumen (fecha, confirmaciones, commit/pruebas, próximo paso) y registrar el detalle histórico en `BITACORA_DESARROLLO.md`. Conservar una única fuente de historial; no abrir bitácoras duplicadas. No guardar contraseñas, tokens, nombres de clientes ni datos personales sensibles.
