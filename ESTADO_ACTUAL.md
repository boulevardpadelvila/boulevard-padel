# Boulevard Pádel — ESTADO ACTUAL / RELEVO ENTRE CHATS

> Fuente breve de continuidad. Leer este archivo PRIMERO al iniciar otro chat, después consultar el final de `BITACORA_DESARROLLO.md` y los archivos reales de la rama. No sustituye el código ni las pruebas.
>
> Actualizado: 10/11/2026 (hora argentina). Última etapa: SQL89 atómico + pruebas reales de Chromium aislado; CI 222 JS + 2 Chromium + PostgreSQL 17 OK. Consultar HEAD para SHA actualizado.

## Cómo retomar en el próximo chat

Mensaje sugerido: **«JP, retomamos Boulevard Pádel. Leé ESTADO_ACTUAL.md en GitHub, verificá la rama y la última bitácora, y seguí desde el próximo paso. No modifiques producción.»**

- Repositorio: `boulevardpadelvila/boulevard-padel`.
- Rama activa: `desarrollo/liga-fase-final-20261109`.
- PR de la rama a `main`: **#19 (DRAFT / no fusionar)**.
- Proyecto productivo: `https://boulevard-padel.pages.dev/`.
- Supabase de producción: proyecto `boulevard-padel`. **Solo diagnósticos SELECT sin autorización adicional**. No ejecutar ni guardar SQL borrador.
- Instrucción permanente: trabajar en pasos pequeños, con resultados verificables; avisar el comando exacto para laptop cuando corresponda, y esperar su salida antes de avanzar a la siguiente instrucción manual.

## Objetivo que se está desarrollando

**Parche 89: fase final de la modalidad Liga.** Al terminar TODOS los partidos de la fase regular, clasificar los cuatro mejores según las cinco métricas acordadas (puntos 2/1/0, diferencia de sets, sets a favor, diferencia de games, games a favor). Un empate absoluto que afecte el top 4 requiere resolución administrativa, sin desempate arbitrario. Semifinales **1° vs 3°** y **2° vs 4°**; final entre ganadores; **sin partido por tercer puesto**. Semifinales/final: dos o tres sets normales, sin súper tie-break. Campeón y subcampeón solo desde la final jugada y el cierre oficial, NO desde la tabla regular.

## Estado verificado

- Última sincronización local reportada: `git pull --ff-only` avanzó `7f40652..86fca66` correctamente, sin conflictos. Cambios posteriores requieren nuevo pull.
- Laptop: 201/201 verificados previamente; los cambios posteriores elevan la suite a **222/222 en GitHub Actions**, más **2/2 pruebas reales en Chromium móvil aislado**. Falta sincronizar y ejecutar localmente si se desea.
- GitHub Actions: run **42803713743**, tres jobs en SUCCESS: **222/222 JavaScript**, **2/2 Chromium móvil** (Admin/publicación con cliente Supabase simulado) y **PostgreSQL 17 aislado** (migración atómica, smoke, concurrencia, temporada 12 parejas/66 partidos).
- SQL consolidado: `sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql` (2A+2B+2C, con guardia de fixture reforzada). **BORRADOR; NO INSTALAR NI GUARDAR EN SUPABASE SQL EDITOR**.
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

## Pendientes prioritarios

1. **Concurrencia:** protegido y probado en PostgreSQL temporal el INSERT de un partido regular simultáneo a generar semifinales. **Comprobado por lectura** que `bp_reservation_blockout_guard` usa el mismo `pg_advisory_xact_lock(...,72119)` que la programación de partidos (bloqueo de cancha compartido). Faltan ensayos adicionales de corrección de marcadores/reglas de cierre y posibles interbloqueos entre RPC.
2. Revisar diferencias entre **esquema simulado** del CI y Supabase real, privilegios/triggers/operaciones de borrado. No presentar el smoke test como certificación de producción.
3. **Admin fase final integrado EN DESARROLLO:** `js/admin-liga-final89-ui.js` + modales en `admin/index.html`. **Chromium móvil con datos ficticios: 1 test PASS** (generar, programar y cargar resultado); falta prueba completa del portal autenticado contra un Supabase clon/staging. No instalar todavía.
4. **Público integrado EN DESARROLLO:** `js/torneos-liga-final89-public.js`, `css/torneos-liga-final89.css`, `index.html` y `js/torneos-public.js` consumen exclusivamente `bp_public_league_final89`; cuadro y marcadores, campeón/subcampeón únicamente al terminar y cerrar Liga; **8 tests DOM nuevos**. No publicado.
5. **Probado en PostgreSQL temporal** 12 parejas / 66 encuentros / 11 Fechas: top 4 y semifinales correctas, fixture regular intacto. Pendientes: empate absoluto/criterio de intervención, pruebas reales de interfaz y seguridad completa del esquema productivo; preparar migración definitiva revisada. **Aplicar en Supabase productivo, fusionar PR o publicar SOLO tras verificar seguridad y consentimiento de publicación.**

## Próximo paso técnico concreto

**Siguiente etapa: validar migración SQL89 contra copia completa del esquema y comprobar login Admin/RPC/Reserva real en entorno de staging; después preparar una instalación con respaldo, verificación post-migración y publicación controlada.** Chromium aislado ya prueba los módulos, pero NO es una prueba integral contra Supabase. No ejecutar SQL de mutación en producción sin esa validación; PR #19 sigue DRAFT.

## Regla de mantenimiento de este archivo

Tras cada etapa importante comprobada: actualizar SOLO este resumen (fecha, confirmaciones, commit/pruebas, próximo paso) y registrar el detalle histórico en `BITACORA_DESARROLLO.md`. Conservar una única fuente de historial; no abrir bitácoras duplicadas. No guardar contraseñas, tokens, nombres de clientes ni datos personales sensibles.
