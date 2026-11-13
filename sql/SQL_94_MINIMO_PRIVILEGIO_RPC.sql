-- SQL94 · Boulevard Pádel · Reducción de permisos SQL (13/11/2026)
-- No modifica datos, tablas, vistas, políticas RLS, turnero ni fechas.
-- El origen localhost es compatible: los permisos dependen del rol JWT (anon o authenticated),
-- NO de la URL del navegador. Los RPC públicos intencionales quedan intactos.
--
-- Previo a ejecutar: revisar en CI con PostgreSQL 17 descartable.
-- Se aplica una vez en Supabase y se verifica por consultas solo-lectura.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Detener la migración si cambió la forma de alguno de los 15 disparadores esperados.
DO $preflight$
DECLARE
  v_expected text[] := ARRAY[
    'bp_guard_group_fixture_publication',
    'bp_guard_published_fixture_matches',
    'bp_guard_published_group_rows',
    'bp_guard_published_roster',
    'bp_guard_published_tournament',
    'bp_guard_started_group_match',
    'bp_guard_started_group_roster',
    'bp_guard_started_group_structure',
    'bp_knockout_validate_seven_bracket',
    'bp_ko_freeze_started_bracket',
    'bp_ko_match_schedule_sync',
    'bp_ko_seed_matches',
    'bp_pairs_enforce_capacity',
    'bp_reservation_blockout_guard',
    'bp_tournaments_guard_capacity'
  ];
  v_found integer;
BEGIN
  SELECT count(*) INTO v_found
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = ANY(v_expected)
    AND p.prorettype = 'pg_catalog.trigger'::regtype
    AND pg_get_function_identity_arguments(p.oid) = ''
    AND p.prosecdef IS TRUE;

  IF v_found <> cardinality(v_expected) THEN
    RAISE EXCEPTION 'SQL94 abortada: % disparadores válidos, se esperaban %.',
      v_found, cardinality(v_expected);
  END IF;
END;
$preflight$;

-- 15 trigger functions internos: nunca RPC públicos directos.
-- El motor de PostgreSQL los sigue ejecutando a través de sus TRIGGER ya creados.
REVOKE EXECUTE ON FUNCTION public.bp_guard_group_fixture_publication() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_group_fixture_publication() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_published_fixture_matches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_published_fixture_matches() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_published_group_rows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_published_group_rows() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_published_roster() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_published_roster() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_published_tournament() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_published_tournament() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_started_group_match() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_started_group_match() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_started_group_roster() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_started_group_roster() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_guard_started_group_structure() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_guard_started_group_structure() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_knockout_validate_seven_bracket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_knockout_validate_seven_bracket() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_ko_freeze_started_bracket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko_freeze_started_bracket() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_ko_match_schedule_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko_match_schedule_sync() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_ko_seed_matches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko_seed_matches() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_pairs_enforce_capacity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_pairs_enforce_capacity() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_reservation_blockout_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_reservation_blockout_guard() TO service_role;
REVOKE EXECUTE ON FUNCTION public.bp_tournaments_guard_capacity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournaments_guard_capacity() TO service_role;

-- Disparador de eventos DDL: no corresponde que lo invoque el navegador.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- Generador interno: lo invocan funciones SECURITY DEFINER y servicios internos;
-- no hace falta ofrecerlo como RPC público a usuarios anónimos o autenticados.
REVOKE EXECUTE ON FUNCTION public.generate_booking_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_booking_code() TO service_role;

-- Funciones exclusivas del Admin: sin acceso directo del rol anónimo.
-- La aplicación local mantiene acceso normal al iniciar sesión como administrador.
REVOKE EXECUTE ON FUNCTION public.create_admin_booking_flexible(
  text, text, timestamptz, integer, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_booking_flexible(
  text, text, timestamptz, integer, text
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_admin_booking_flexible(
  uuid, text, text, timestamptz, integer, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_admin_booking_flexible(
  uuid, text, text, timestamptz, integer, text
) TO authenticated, service_role;

-- Trigger invoker de timestamp: uso exclusivamente de NEW y now(), que
-- se resuelve desde pg_catalog incluso con search_path vacío.
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- No tocar las dos vistas públicas de Torneos: convertirlas a
-- security_invoker directamente sin RLS de lectura rompería el fixture.
-- Tampoco tocar create_booking_flexible (service_role), disponibilidad, por
-- código, RLS is_admin / bp_tournament_is_admin ni los RPC públicos de torneos.
COMMIT;
