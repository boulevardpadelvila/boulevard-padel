# Boulevard Pádel · Parche 89 · Instalación y verificación

**Estado actualizado:** SQL 89 INSTALADO en el único Supabase productivo el 10/11/2026.  
**Decisión del cliente:** un solo proyecto, sin ramas ni staging. Se autorizaron cambios de Liga, con prohibición de alterar reservas, turnos fijos y turnero ya operativo.  
**Frontend:** pendiente de confirmar publicación de `main` y acceso real a Cloudflare Pages (actualizar al verificar).

## Migraciones efectivas en Supabase

- `20261110121529` — `bp_sql89_private_safety_snapshots`. Respaldo privado dentro de **la misma base**.
- `20261110121714` — `bp_sql89_liga_semifinales_final_y_desempate`. Aplica la lógica de semifinales, final, programación, resultados, cierre, lectura pública y desempate manual con auditoría.
- SQL exacto utilizado: `sql/SQL_89_LIGA_FASE_FINAL_CONSOLIDADO_BORRADOR.sql` (fuente histórica probada; **NO volver a ejecutarlo**). Se instaló como migración Supabase. La denominación `BORRADOR` es previa a la autorización final.
- No se eliminaron torneos de prueba.

## Respaldo privado (mismo proyecto, no rama)

Esquema: `bp_p89_safety`. Restringido: roles `anon` y `authenticated` **sin USAGE** y todas las tablas con RLS. Contiene instantáneas de `reservations`, `fixed_turn_requests`, `blockouts`, `weekly_hours`, `bp_league_matches`, `bp_tournaments`, `bp_tournament_pairs`, `bp_league_settings`, más las definiciones de cuatro RPC y tres restricciones previas.

Comprobación de registros *antes/después* de migrar (10/11/2026):

| Tabla | Respaldo | Producción | Eliminados | Nuevos | Alterados |
|---|---:|---:|---:|---:|---:|
| `reservations` | 35 | 35 | 0 | 0 | 0 |
| `fixed_turn_requests` | 4 | 4 | 0 | 0 | 0 |
| `blockouts` | 39 | 39 | 0 | 0 | 0 |
| `weekly_hours` | 7 | 7 | 0 | 0 | 0 |
| `bp_league_matches` | 66 | 66 | 0 | 0 | 0 |
| `bp_tournaments` | 4 | 4 | 0 | 0 | 0 |
| `bp_tournament_pairs` | 38 | 38 | 0 | 0 | 0 |
| `bp_league_settings` | 1 | 1 | 0 | 0 | 0 |

La comparación se realizó por ID y por valor JSONB de **cada fila completa**; en `blockouts` se excluyó únicamente la nueva columna vacía para partidos finales. Ningún dato original fue cambiado.

**Importante:** este respaldo es una copia interna que protege frente a errores lógicos acotados, **no equivale a una copia externa/PITR** frente a una pérdida total de la base. Nunca restaurar tablas enteras a ciegas: se podrían pisar reservas nuevas o ediciones legítimas posteriores. Debe recuperarse de manera selectiva y verificada.

## Comprobaciones posteriores a la instalación

- La función existente `get_available_slots(date)` sigue respondiendo: 9 horarios para el 11/11/2026 y 9 para el 14/11/2026, una cancha; prueba de solo lectura, no se creó ninguna reserva.
- Conservados triggers `bp_reservation_blockout_guard_trg`, `bp_validate_fixed_period_trg` y guardia de bloqueos.
- Cero bloqueos de torneo inválidos, cero reservas superpuestas a bloqueos activos.
- RLS y privilegios correctos: `anon` no genera semifinales ni lee tabla privada; `authenticated` puede invocar RPC, su lógica interna comprueba admin activo; lectura pública autorizada.
- Las tablas `bp_league_final_matches` y `bp_league_final_tiebreak_decisions89` existen y están inicialmente vacías.
- Migración y pruebas sintéticas GitHub Actions (226 JS + 3 Chromium + PostgreSQL 17) aprobadas en rama de desarrollo.

## Verificación que todavía corresponde

- Confirmar `main` actualizado y que Cloudflare Pages efectivamente publicó la versión nueva; no asumir despliegue solo por fusionar GitHub.
- Validar en navegador real con Martín, especialmente Admin, inicio de sesión, y compatibilidad móvil.
- Verificar reserva pública y turno fijo existentes desde sus flujos habituales, **sin crear datos ficticios ni cancelar reservas reales**.
- Cuando la fase regular esté terminada, generar semifinales en el Admin; no hay que borrar los 66 partidos actuales.
- Conservar el respaldo privado hasta tener varias jornadas de operación confirmadas.

## Condiciones de recuperación

Si aparece una falla de reservas o turnos fijos, **detener cambios** y comprobar su causa. La reversión del frontend en GitHub **no revierte** el esquema ni las funciones de Supabase. Las definiciones anteriores de las cuatro funciones y restricciones modificadas están archivadas en `bp_p89_safety`; para restaurar debe prepararse una migración inversa específica y auditada, sin sobrescribir registros nuevos.

**Historial único:** `BITACORA_DESARROLLO.md`. **Resumen de continuidad:** `ESTADO_ACTUAL.md`.
