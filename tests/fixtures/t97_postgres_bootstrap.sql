-- SQL97: sólo en PostgreSQL 17 de CI; la base productiva ya posee esta RPC.
CREATE OR REPLACE FUNCTION public.bp_tournament_has_started_match(p_tournament_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM public.bp_tournament_group_matches m
  WHERE m.tournament_id=p_tournament_id
    AND m.match_status IN ('played','walkover')
 );
$fn$;
