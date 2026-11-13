-- SQL95: verificar la migración con roles de navegador y datos inventados.
-- Ejecutar únicamente contra PostgreSQL 17 efímero de CI.
DO $check$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_class
   WHERE oid='public.bp_public_tournament_groups'::regclass
   AND 'security_invoker=true'=ANY(reloptions)
   AND 'security_barrier=true'=ANY(reloptions)
 ) THEN RAISE EXCEPTION 'La vista de grupos perdió security_barrier o invoker'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class
   WHERE oid='public.bp_public_tournament_group_fixture'::regclass
   AND 'security_invoker=true'=ANY(reloptions)
 ) THEN RAISE EXCEPTION 'La vista de fixture no usa invoker'; END IF;
 IF has_column_privilege('anon','public.bp_tournament_pairs','contact_phone','SELECT')
 OR has_column_privilege('anon','public.bp_tournament_pairs','source','SELECT')
 OR has_table_privilege('anon','public.bp_tournament_pairs','INSERT')
 OR has_table_privilege('anon','public.bp_tournament_pairs','DELETE')
 OR has_table_privilege('anon','public.bp_tournament_pairs','UPDATE')
 THEN RAISE EXCEPTION 'Hay permisos anon innecesarios'; END IF;
END;
$check$;

BEGIN;
SET LOCAL ROLE anon;
DO $anonymous$
DECLARE
 n integer;
BEGIN
 SELECT count(*) INTO n FROM public.bp_public_tournament_groups;
 IF n <> 3 THEN RAISE EXCEPTION 'Grupos anon: esperaba 3 parejas aprobadas agrupadas visibles, devolvió %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_group_fixture;
 IF n <> 1 THEN RAISE EXCEPTION 'Fixture anon: esperaba 1 partido publicado, devolvió %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_tournament_pairs;
 IF n <> 3 THEN RAISE EXCEPTION 'Base parejas anon: esperaba 3 aprobadas agrupadas, devolvió %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_tournament_groups;
 IF n <> 2 THEN RAISE EXCEPTION 'Base grupos anon: esperaba solo 2 zonas publicadas, devolvió %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_tournament_group_matches;
 IF n <> 1 THEN RAISE EXCEPTION 'Base fixture anon: esperaba solo 1 partido realmente publicado, devolvió %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_groups
  WHERE player1_name LIKE 'PENDIENTE%' OR player1_name LIKE 'OCULTO%'
    OR player1_name LIKE 'SIN-GRUPO%' OR player1_name LIKE 'NO-PUBLICADO%';
 IF n <> 0 THEN RAISE EXCEPTION 'Fuga de participantes no aprobados o no publicados'; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_group_fixture
  WHERE pair1_player1_name LIKE 'OCULTO%' OR pair1_player1_name LIKE 'SOLO-GRUPOS%';
 IF n <> 0 THEN RAISE EXCEPTION 'Fuga de fixture no publicado'; END IF;
 -- PostgreSQL debe rechazar las columnas confidenciales incluso si el
 -- atacante consulta directamente la tabla, no solo a través de la vista.
 BEGIN
   EXECUTE 'SELECT contact_phone FROM public.bp_tournament_pairs LIMIT 1';
   RAISE EXCEPTION 'Error: anon pudo consultar teléfonos';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   EXECUTE 'SELECT source FROM public.bp_tournament_pairs LIMIT 1';
   RAISE EXCEPTION 'Error: anon pudo consultar source';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END;
$anonymous$;
ROLLBACK;

BEGIN;
SELECT set_config('t95.is_admin','yes',true);
SET LOCAL ROLE authenticated;
DO $administrator$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.bp_tournament_pairs;
 IF n <> 7 THEN RAISE EXCEPTION 'Admin autenticado perdió acceso a parejas (% de 7)',n; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_groups;
 IF n <> 3 THEN RAISE EXCEPTION 'Admin perdió vista de grupos: %',n; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_group_fixture;
 IF n <> 1 THEN RAISE EXCEPTION 'Admin perdió fixture: %',n; END IF;
 SELECT count(contact_phone) INTO n FROM public.bp_tournament_pairs;
 IF n <> 7 THEN RAISE EXCEPTION 'Admin perdió acceso autorizado a teléfonos'; END IF;
END;
$administrator$;
ROLLBACK;

-- Cambios de publicación simulados sin alterar producción: la RLS debe
-- dejar de mostrar partidos y parejas tan pronto se oculta un torneo.
BEGIN;
UPDATE public.bp_tournaments SET is_published=false
 WHERE id='00000000-0000-0000-0000-000000000101';
SET LOCAL ROLE anon;
DO $unpublish$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.bp_public_tournament_group_fixture;
 IF n <> 0 THEN RAISE EXCEPTION 'Ocultar torneo no retiró su fixture'; END IF;
 SELECT count(*) INTO n FROM public.bp_public_tournament_groups;
 IF n <> 1 THEN RAISE EXCEPTION 'Ocultar torneo no retiró parejas'; END IF;
END;
$unpublish$;
ROLLBACK;
