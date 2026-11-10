# Boulevard Pádel — ESTADO ACTUAL / RELEVO ENTRE CHATS

> Fuente breve de continuidad. Leer este archivo PRIMERO al iniciar otro chat, después consultar el final de `BITACORA_DESARROLLO.md` y los archivos reales de la rama. No sustituye el código ni las pruebas.
>
> Actualizado: 09/11/2026 (hora argentina). Última etapa confirmada: panel Admin P89, CI 209 OK. Consultar HEAD para SHA actualizado.

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

- Última sincronización local reportada: `git pull --ff-only` avanzó `2593bba..7204777` correctamente, sin conflictos. Los cambios posteriores del Admin aún deben sincronizarse.
- Laptop: `node --test tests/*.test.js` **201/201 OK** confirmadas previamente por el usuario. La nueva rama tiene 8 tests adicionales; CI confirmó **209/209**; falta sincronizar y repetir localmente.
- GitHub Actions: run **42741224876**: **209/209 tests JS OK**, y **SQL89 PostgreSQL 17 aislado SUCCESS**, incluida carrera INSERT durante generación de semifinales. Anteriores: 42738603478 y 42739721099.
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

## Pendientes prioritarios

1. **Concurrencia:** protegido y probado en PostgreSQL temporal el INSERT de un partido regular simultáneo a generar semifinales. **Comprobado por lectura** que `bp_reservation_blockout_guard` usa el mismo `pg_advisory_xact_lock(...,72119)` que la programación de partidos (bloqueo de cancha compartido). Faltan ensayos adicionales de corrección de marcadores/reglas de cierre y posibles interbloqueos entre RPC.
2. Revisar diferencias entre **esquema simulado** del CI y Supabase real, privilegios/triggers/operaciones de borrado. No presentar el smoke test como certificación de producción.
3. **Admin fase final integrado EN DESARROLLO:** `js/admin-liga-final89-ui.js` + panel y modales de `admin/index.html`, con CSS móvil dedicado y RPC finales. **Faltan pruebas funcionales de navegador**, instalación autorizada de SQL y verificación con esquema productivo, no usar todavía en producción.
4. Render público de cuadro, resultados, campeón/subcampeón desde `bp_public_league_final89`, sin datos de contacto.
5. Probar escenarios de 12 parejas/66 encuentros/11 Fechas, empates y seguridad; preparar migración definitiva revisada. **Aplicar en Supabase productivo, fusionar PR o publicar SOLO con autorización expresa y luego de revisión.**

## Próximo paso técnico concreto

**Siguiente etapa: pantalla pública de Liga para semifinales, final, resultados y campeón/subcampeón, a partir de `bp_public_league_final89` (RPC sanitizada);** seguir las pruebas de concurrencia/compatibilidad y probar el Admin en un navegador aislado. No ejecutar SQL de mutación en producción. Mantener PR #19 como DRAFT.

## Regla de mantenimiento de este archivo

Tras cada etapa importante comprobada: actualizar SOLO este resumen (fecha, confirmaciones, commit/pruebas, próximo paso) y registrar el detalle histórico en `BITACORA_DESARROLLO.md`. Conservar una única fuente de historial; no abrir bitácoras duplicadas. No guardar contraseñas, tokens, nombres de clientes ni datos personales sensibles.
