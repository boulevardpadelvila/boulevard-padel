-- SQL94: esquema FICTICIO para PostgreSQL 17 DESECHABLE.
-- ¡NUNCA ejecutar en la base de datos de Boulevard Pádel!
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.t94_probe (
 id integer PRIMARY KEY,
 called boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT, INSERT, UPDATE ON TABLE public.t94_probe TO anon, authenticated;

DO $stub$
DECLARE name text;
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
    EXECUTE format(
      'CREATE FUNCTION public.%I() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '''' AS %L',
      name,
      'BEGIN NEW.called = true; RETURN NEW; END;'
    );
  END LOOP;
END;
$stub$;

CREATE TRIGGER t94_probe_insert
BEFORE INSERT ON public.t94_probe FOR EACH ROW
EXECUTE FUNCTION public.bp_guard_group_fixture_publication();

CREATE FUNCTION public.rls_auto_enable()
RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER AS
$body$ BEGIN NULL; END; $body$;

CREATE FUNCTION public.generate_booking_code()
RETURNS text LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 'BP-PRUEBA'::text $body$;

CREATE FUNCTION public.create_admin_booking_flexible(
  p_full_name text, p_phone text, p_starts_at timestamptz,
  p_duration_minutes integer, p_notes text DEFAULT NULL
) RETURNS text LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 'ADMIN'::text $body$;

CREATE FUNCTION public.update_admin_booking_flexible(
  p_reservation_id uuid, p_full_name text, p_phone text,
  p_starts_at timestamptz, p_duration_minutes integer,
  p_notes text DEFAULT NULL
) RETURNS text LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 'ADMIN'::text $body$;

CREATE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS
$body$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $body$;
CREATE TRIGGER t94_probe_update
BEFORE UPDATE ON public.t94_probe FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Stubs de RPC que necesitan las páginas públicas, incluso desde localhost.
CREATE FUNCTION public.get_booking_config()
RETURNS integer LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 1 $body$;
CREATE FUNCTION public.get_available_slots_flexible(date, integer)
RETURNS integer LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 1 $body$;
CREATE FUNCTION public.get_booking_by_code(text)
RETURNS integer LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 1 $body$;
CREATE FUNCTION public.cancel_booking_by_code(text)
RETURNS integer LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT 1 $body$;
CREATE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT false $body$;
CREATE FUNCTION public.bp_tournament_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT false $body$;
CREATE FUNCTION public.bp_public_tournament_followup(uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER
AS $body$ SELECT '{}'::jsonb $body$;

DO $precheck$
BEGIN
  IF NOT has_function_privilege('anon','public.bp_guard_group_fixture_publication()','EXECUTE') THEN
    RAISE EXCEPTION 'Bootstrap no reproduce el EXECUTE público original';
  END IF;
  IF NOT has_function_privilege('anon','public.create_admin_booking_flexible(text,text,timestamptz,integer,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Bootstrap no reproduce RPC Admin originalmente expuesta';
  END IF;
END;
$precheck$;
