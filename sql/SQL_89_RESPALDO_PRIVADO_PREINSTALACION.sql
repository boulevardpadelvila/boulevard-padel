-- Boulevard Pádel · Parche 89 · RESPALDO DE SEGURIDAD PREVIO
-- Un único proyecto Supabase. Copias PRIVADAS dentro de la misma base.
-- No se modifica ni borra ninguna fila de tablas productivas.
-- Ejecutar una sola vez antes de instalar SQL 89.
CREATE SCHEMA bp_p89_safety;
REVOKE ALL ON SCHEMA bp_p89_safety FROM PUBLIC,anon,authenticated;

CREATE TABLE bp_p89_safety.reservations AS SELECT * FROM public.reservations;
CREATE TABLE bp_p89_safety.fixed_turn_requests AS SELECT * FROM public.fixed_turn_requests;
CREATE TABLE bp_p89_safety.blockouts AS SELECT * FROM public.blockouts;
CREATE TABLE bp_p89_safety.weekly_hours AS SELECT * FROM public.weekly_hours;
CREATE TABLE bp_p89_safety.bp_league_matches AS SELECT * FROM public.bp_league_matches;
CREATE TABLE bp_p89_safety.bp_tournaments AS SELECT * FROM public.bp_tournaments;
CREATE TABLE bp_p89_safety.bp_tournament_pairs AS SELECT * FROM public.bp_tournament_pairs;
CREATE TABLE bp_p89_safety.bp_league_settings AS SELECT * FROM public.bp_league_settings;

-- Las definiciones anteriores permiten revertir DDL de Liga/bloqueos si
-- hiciera falta. NO contienen los datos originales de clientes en GitHub.
CREATE TABLE bp_p89_safety.previous_functions AS
SELECT p.proname::text AS name,
       pg_get_function_identity_arguments(p.oid)::text AS arguments,
       pg_get_functiondef(p.oid) AS ddl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN(
    'bp_tournament_blockout_integrity_guard',
    'bp_league_finish_guard',
    'bp_admin_delete_tournament_safely',
    'bp_admin_tournament_delete_preview'
  );
CREATE TABLE bp_p89_safety.previous_constraints AS
SELECT con.conrelid::regclass::text AS table_name,con.conname::text AS name,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
WHERE con.conrelid='public.blockouts'::regclass
  AND con.conname IN('bp_blockout_one_match',
      'bp_tournament_blockout_requires_match','bp_blockout_tournament_type_valid');
CREATE TABLE bp_p89_safety.previous_triggers AS
SELECT c.relname::text AS table_name,t.tgname::text AS name,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE NOT t.tgisinternal
  AND c.oid IN('public.blockouts'::regclass,
               'public.bp_tournaments'::regclass,
               'public.reservations'::regclass);

-- Capas extra de seguridad si algún día se modifican los schemas expuestos.
ALTER TABLE bp_p89_safety.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.fixed_turn_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.blockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.weekly_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.bp_league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.bp_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.bp_tournament_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.bp_league_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.previous_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.previous_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_p89_safety.previous_triggers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA bp_p89_safety FROM PUBLIC,anon,authenticated;
