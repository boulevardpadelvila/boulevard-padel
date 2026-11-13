-- SQL94 · Contrapruebas en PostgreSQL 17 temporal (nunca Supabase de producción).
DO $verify$
DECLARE
  name text;
  v_oid oid;
BEGIN
  FOREACH name IN ARRAY ARRAY[
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
  ] LOOP
    v_oid := to_regprocedure(format('public.%I()',name));
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Falta trigger %',name;
    END IF;
    IF has_function_privilege('anon',v_oid,'EXECUTE')
       OR has_function_privilege('authenticated',v_oid,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION 'Disparador no restringido correctamente: %',name;
    END IF;
  END LOOP;

  IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
    OR has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE')
    OR NOT has_function_privilege('service_role','public.rls_auto_enable()','EXECUTE') THEN
     RAISE EXCEPTION 'Event trigger indebidamente expuesto';
  END IF;

  IF has_function_privilege('anon','public.generate_booking_code()','EXECUTE')
    OR has_function_privilege('authenticated','public.generate_booking_code()','EXECUTE')
    OR NOT has_function_privilege('service_role','public.generate_booking_code()','EXECUTE') THEN
     RAISE EXCEPTION 'Generador indebidamente expuesto';
  END IF;

  IF has_function_privilege('anon','public.create_admin_booking_flexible(text,text,timestamptz,integer,text)','EXECUTE')
    OR has_function_privilege('anon','public.update_admin_booking_flexible(uuid,text,text,timestamptz,integer,text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.create_admin_booking_flexible(text,text,timestamptz,integer,text)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.update_admin_booking_flexible(uuid,text,text,timestamptz,integer,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.create_admin_booking_flexible(text,text,timestamptz,integer,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.update_admin_booking_flexible(uuid,text,text,timestamptz,integer,text)','EXECUTE')
  THEN
    RAISE EXCEPTION 'Permisos incompatibles con el Admin';
  END IF;

  IF NOT has_function_privilege('anon','public.get_booking_config()','EXECUTE')
    OR NOT has_function_privilege('anon','public.get_available_slots_flexible(date,integer)','EXECUTE')
    OR NOT has_function_privilege('anon','public.get_booking_by_code(text)','EXECUTE')
    OR NOT has_function_privilege('anon','public.cancel_booking_by_code(text)','EXECUTE')
    OR NOT has_function_privilege('anon','public.bp_public_tournament_followup(uuid)','EXECUTE')
    OR NOT has_function_privilege('anon','public.is_admin()','EXECUTE')
    OR NOT has_function_privilege('anon','public.bp_tournament_is_admin()','EXECUTE')
  THEN
    RAISE EXCEPTION 'Se interrumpió una RPC pública, también afectaría localhost';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid='public.set_updated_at()'::regprocedure
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  ) THEN
    RAISE EXCEPTION 'search_path del trigger no está fijado';
  END IF;
END;
$verify$;

-- Prueba real de que se ejecuta un TRIGGER al escribir con rol anon,
-- incluso después de revocar EXECUTE directo a la función del trigger.
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.t94_probe(id) VALUES (1);
UPDATE public.t94_probe SET called=true WHERE id=1;
DO $assert$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.t94_probe WHERE id=1 AND called=true) THEN
    RAISE EXCEPTION 'El TRIGGER dejó de ejecutarse con anon';
  END IF;
END;
$assert$;
SELECT public.get_booking_config();
SELECT public.get_booking_by_code('BP-FICTICIO');
SELECT public.get_available_slots_flexible(DATE '2026-11-14',90);
SELECT public.cancel_booking_by_code('BP-FICTICIO');
SELECT public.bp_public_tournament_followup('00000000-0000-0000-0000-000000000000');
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT public.create_admin_booking_flexible('Ficticio','000',now(),90);
SELECT public.update_admin_booking_flexible('00000000-0000-0000-0000-000000000000','Ficticio','000',now(),90);
ROLLBACK;

BEGIN;
SET LOCAL ROLE service_role;
SELECT public.generate_booking_code();
ROLLBACK;
