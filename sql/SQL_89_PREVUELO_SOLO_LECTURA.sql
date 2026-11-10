-- Boulevard Pádel · P89 · PREVUELO DE INSTALACIÓN (SOLO LECTURA)
-- Esta consulta ejecuta únicamente SELECT sobre catálogos de PostgreSQL.
-- NO instala SQL89, NO modifica reservas, turnos fijos, partidos ni bloqueos.
-- Validada contra Supabase productivo el 10/11/2026: 22/22 controles OK.
-- Las cifras de registros cambian; no fijar conteos de usuarios o reservas.
WITH checks AS (
 SELECT 'Tabla de torneos' AS control,
        to_regclass('public.bp_tournaments') IS NOT NULL AS ok
 UNION ALL SELECT 'Fixture regular',
        to_regclass('public.bp_league_matches') IS NOT NULL
 UNION ALL SELECT 'Parejas',
        to_regclass('public.bp_tournament_pairs') IS NOT NULL
 UNION ALL SELECT 'Reservas',
        to_regclass('public.reservations') IS NOT NULL
 UNION ALL SELECT 'Turnos fijos',
        to_regclass('public.fixed_turn_requests') IS NOT NULL
 UNION ALL SELECT 'Bloqueos',
        to_regclass('public.blockouts') IS NOT NULL
 UNION ALL SELECT 'Control transaccional borrado',
        to_regclass('bp_revision_private.operation_access') IS NOT NULL
 UNION ALL SELECT 'P89 no instalado (tabla de finales)',
        to_regclass('public.bp_league_final_matches') IS NULL
 UNION ALL SELECT 'P89 no instalado (decisiones de empate)',
        to_regclass('public.bp_league_final_tiebreak_decisions89') IS NULL
 UNION ALL SELECT 'RPC admin de validación',
        to_regprocedure('public.bp_tournament_is_admin()') IS NOT NULL
 UNION ALL SELECT 'RPC borrado controlado',
        to_regprocedure('public.bp_admin_delete_tournament_safely(uuid,text)') IS NOT NULL
 UNION ALL SELECT 'RPC vista previa de borrado',
        to_regprocedure('public.bp_admin_tournament_delete_preview(uuid)') IS NOT NULL
 UNION ALL SELECT 'RPC guardia de reserva',
        to_regprocedure('public.bp_reservation_blockout_guard()') IS NOT NULL
 UNION ALL SELECT 'Disparador de reservas/bloqueos',
    EXISTS(SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid=to_regclass('public.reservations')
        AND t.tgname='bp_reservation_blockout_guard_trg'
        AND NOT t.tgisinternal AND t.tgenabled IN('O','A'))
 UNION ALL SELECT 'Disparador de integridad de bloqueos',
    EXISTS(SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid=to_regclass('public.blockouts')
        AND t.tgname='bp_tournament_blockout_integrity_trg'
        AND NOT t.tgisinternal AND t.tgenabled IN('O','A'))
 UNION ALL SELECT 'Disparador de cierre de Liga',
    EXISTS(SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid=to_regclass('public.bp_tournaments')
        AND t.tgname='bp_league_finish_ready'
        AND NOT t.tgisinternal AND t.tgenabled IN('O','A'))
 UNION ALL SELECT 'CHECK de vínculos de bloqueo',
    EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.blockouts')
        AND conname='bp_blockout_one_match')
 UNION ALL SELECT 'CHECK bloqueo de torneo',
    EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.blockouts')
        AND conname='bp_tournament_blockout_requires_match')
 UNION ALL SELECT 'CHECK tipo bloqueo vinculado',
    EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.blockouts')
        AND conname='bp_blockout_tournament_type_valid')
 UNION ALL SELECT 'Restricción exclusión reservas',
    EXISTS(SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.reservations')
        AND conname='reservations_no_overlap' AND contype='x')
 UNION ALL SELECT 'RPC Admin sin EXECUTE para anon',
    NOT has_function_privilege('anon',
      'public.bp_admin_delete_tournament_safely(uuid,text)','EXECUTE')
    AND NOT has_function_privilege('anon',
      'public.bp_admin_tournament_delete_preview(uuid)','EXECUTE')
 UNION ALL SELECT 'RPC Admin con EXECUTE para authenticated',
    has_function_privilege('authenticated',
      'public.bp_admin_delete_tournament_safely(uuid,text)','EXECUTE')
    AND has_function_privilege('authenticated',
      'public.bp_admin_tournament_delete_preview(uuid)','EXECUTE')
)
SELECT control, CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS estado
FROM checks
UNION ALL
SELECT 'RESULTADO GENERAL',
  CASE WHEN bool_and(ok) THEN 'OK' ELSE 'DETENER INSTALACIÓN' END
FROM checks
ORDER BY control;
