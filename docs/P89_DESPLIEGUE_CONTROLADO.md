# Boulevard Pádel · Parche 89 · Procedimiento de instalación controlada

**Estado:** PREPARACIÓN — no ejecutar aún en producción.  
**Rama:** `desarrollo/liga-fase-final-20261109` · PR #19 **DRAFT**.  
**Última revisión:** 10/11/2026.

## Regla central

La publicación de la fase final de Liga **no puede comprometer el turnero**.
Nunca borrar, recrear, mover ni limpiar automáticamente los datos de `reservations`,
`fixed_turn_requests`, `blockouts`, `weekly_hours` o los 66 partidos regulares
del torneo ya existente.

## 1. Puertas de aprobación — TODAS necesarias

- [x] Suite JavaScript en GitHub Actions y motor de Liga, 12 parejas/66 partidos.
- [x] Pruebas de Chromium móvil con Admin y público utilizando datos ficticios.
- [x] PostgreSQL 17 efímero: fase final, programaciones 90/120 min,
      concurrencia, empate absoluto administrado y no regresión 35/4/39.
- [x] Prueba de permisos en PostgreSQL **con SET ROLE authenticated y anon**;
      verifica Admin, no Admin, RLS y RPC pública, pero NO login real de Supabase Auth.
- [x] Prevuelo de catálogos de Supabase productivo **22/22 OK**, solo SELECT,
      ejecutado 10/11/2026 y guardado en `sql/SQL_89_PREVUELO_SOLO_LECTURA.sql`.
- [ ] **Staging verdadero**: esquema íntegro, autenticación y sesión Admin válidas,
      operaciones de programación y lectura pública; sin datos personales de clientes.
- [ ] Validar plan de backup y **restauración practicable** del esquema y datos
      afectados, sin perder reservas que entren después de obtener el respaldo.
- [ ] Autorización expresa del usuario para instalar SQL89 y fusionar/publicar.
- [ ] Confirmar cualquier costo de staging/ramas de Supabase **antes de crearlas**.

## 2. Orden recomendado cuando existan staging, respaldo y autorización

1. Ejecutar `sql/SQL_89_PREVUELO_SOLO_LECTURA.sql`: `RESULTADO GENERAL = OK`.
   Si devuelve REVISAR, **detenerse**; buscar el cambio de esquema.
2. Tomar inventario de conteos (sin datos personales en logs): reservas por
   estado y origen, turnos fijos por estado, bloqueos por tipo y estado,
   `bp_league_matches` por torneo y estado; verificar que coincidan con el
   inventario posterior. Las cifras 35/4/39/66 son una instantánea antigua,
   **no un número inmutable**.
3. Verificar un respaldo recuperable con la infraestructura correspondiente
   y ensayar la recuperación **fuera de producción**. No basta con un export
   del esquema si se pretende recuperar datos.
4. Instalar SQL89 en una sola transacción en staging. El borrador tiene
   `BEGIN/COMMIT`, `lock_timeout='5s'`, `statement_timeout='90s'`.
   Evitar horas activas del turnero por las modificaciones de `blockouts`.
5. Iniciar sesión como Admin de prueba. Verificar generar semifinales,
   resolver empate, programar 90/120, colisión con reserva, postergación,
   resultado a tres sets, cierre y consulta pública.
6. Verificar como visitante anónimo: la RPC pública devuelve solo torneo
   publicado y ningún teléfono; RPC Admin no ejecutables.
7. Repetir el inventario. Comprobar que las reservas reales y los turnos
   fijos conservaron IDs, estados, vínculos y horarios, y que no hay bloqueos
   huérfanos.
8. **Solo luego de aprobar esos controles**, autorizar ejecución controlada
   de migración en producción. Verificar primero base y backend. Publicar
   frontend desde `main` tras esa confirmación, no antes.
9. Probar nuevamente reservas normales, turnos fijos, Admin, Liga y público
   en producción; comprobar errores y devolver PR #19 a cerrado/fusionado
   únicamente si todo está confirmado.

## 3. Condiciones de aborto y recuperación

- **Falla de lock timeout o un error antes de COMMIT:** la transacción
  se revierte; no forzar la migración ni deshabilitar restricciones.
- **Pruebas de reserva/fijo o cambios inesperados en sus registros:** detener
  publicación, analizar diferencia y no aceptar el PR hasta corregir.
- **SQL ya confirmado (COMMIT):** no confiar en revertir el commit Git para
  deshacer la base de datos; eso NO revierte funciones, tablas o triggers.
  Se necesita un procedimiento de recuperación específico, probado y
  coordinado para no sobrescribir nuevas reservas recibidas entretanto.
- **Interfaz no publicada pero esquema P89 instalado:** no ejecutar SQL
  de limpieza destructiva; mantener cierre de Liga restringido y terminar
  verificación/puesta en servicio cuando se resuelva el problema.
- Mantener el servidor público viejo operativo hasta confirmar el nuevo
  en `main`; comprobar también la página pública de reservas.

## 4. Estado actual y limitaciones

No existe una rama staging de Supabase creada para P89 en este trabajo.
Las pruebas PostgreSQL reproducen las restricciones principales, **pero no
reemplazan el esquema íntegro, GoTrue ni PostgREST**. No se realizó aún una
restauración completa verificada. No publicar bajo la única evidencia de
tests sintéticos.

**Control de cambios:** registrar toda aprobación e instalación real en
`BITACORA_DESARROLLO.md` y resumir estado en `ESTADO_ACTUAL.md`.
