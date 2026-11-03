-- SQL 65 | Boulevard Pádel | Cuadro de siete clasificados.
-- DEFINITIVA: guardar en SQL Editor; ejecutar UNA SOLA VEZ.
-- Sólo crea objetos de torneos. No cambia reservas, bloqueos ni turnero.
CREATE TABLE IF NOT EXISTS public.bp_tournament_knockout_brackets (
  tournament_id uuid PRIMARY KEY REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
  direct_semifinal_pair_id uuid NOT NULL,
  quarterfinals jsonb NOT NULL,
  choice_mode text NOT NULL CHECK (choice_mode IN ('automatic','manual')),
  result_revision timestamptz NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bp_ko_bye_pair_fk FOREIGN KEY (direct_semifinal_pair_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE CASCADE,
  CONSTRAINT bp_ko_quarters_shape CHECK (jsonb_typeof(quarterfinals)='array' AND jsonb_array_length(quarterfinals)=3)
);
ALTER TABLE public.bp_tournament_knockout_brackets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_tournament_knockout_brackets FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bp_tournament_knockout_brackets TO authenticated;
DO $policy$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bp_tournament_knockout_brackets' AND policyname='bp_ko_admin_read') THEN
    CREATE POLICY bp_ko_admin_read ON public.bp_tournament_knockout_brackets FOR SELECT TO authenticated USING ((SELECT public.bp_tournament_is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bp_tournament_knockout_brackets' AND policyname='bp_ko_admin_insert') THEN
    CREATE POLICY bp_ko_admin_insert ON public.bp_tournament_knockout_brackets FOR INSERT TO authenticated WITH CHECK ((SELECT public.bp_tournament_is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bp_tournament_knockout_brackets' AND policyname='bp_ko_admin_update') THEN
    CREATE POLICY bp_ko_admin_update ON public.bp_tournament_knockout_brackets FOR UPDATE TO authenticated USING ((SELECT public.bp_tournament_is_admin())) WITH CHECK ((SELECT public.bp_tournament_is_admin()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bp_tournament_knockout_brackets' AND policyname='bp_ko_admin_delete') THEN
    CREATE POLICY bp_ko_admin_delete ON public.bp_tournament_knockout_brackets FOR DELETE TO authenticated USING ((SELECT public.bp_tournament_is_admin()));
  END IF;
END $policy$;

CREATE OR REPLACE FUNCTION public.bp_knockout_validate_seven_bracket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_group_sizes bigint[];
  v_groups bigint;
  v_matches bigint;
  v_played bigint;
  v_results bigint;
  v_latest timestamptz;
  v_qualifiers uuid[];
  v_participants uuid[];
  v_all uuid[];
  v_unique bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo un administrador activo puede confirmar el cuadro.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_t FROM public.bp_tournaments WHERE id=NEW.tournament_id FOR UPDATE;
  IF NOT FOUND OR v_t.format <> 'groups_knockout' OR v_t.status <> 'registration_closed'
     OR v_t.groups_published_at IS NULL OR v_t.fixture_published_at IS NULL THEN
    RAISE EXCEPTION 'Primero cerrá inscripciones, publicá grupos y fixture antes del cuadro final.' USING ERRCODE='23514';
  END IF;
  SELECT array_agg(members ORDER BY members),count(*) INTO v_group_sizes,v_groups
  FROM (SELECT count(gp.pair_id) AS members FROM public.bp_tournament_groups g
    LEFT JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id
    WHERE g.tournament_id=NEW.tournament_id GROUP BY g.id) counted;
  IF v_groups <> 3 OR v_group_sizes IS DISTINCT FROM ARRAY[3::bigint,3::bigint,4::bigint] THEN
    RAISE EXCEPTION 'Este cuadro corresponde a dos grupos de tres y uno de cuatro parejas.' USING ERRCODE='23514';
  END IF;
  SELECT count(*),count(*) FILTER (WHERE match_status='played') INTO v_matches,v_played
  FROM public.bp_tournament_group_matches WHERE tournament_id=NEW.tournament_id;
  SELECT count(*),date_trunc('milliseconds',max(updated_at)) INTO v_results,v_latest
  FROM public.bp_tournament_match_results WHERE tournament_id=NEW.tournament_id;
  IF v_matches <> 10 OR v_played <> 10 OR v_results <> 10 THEN
    RAISE EXCEPTION 'Se necesitan los diez resultados de grupos para formar eliminatorias.' USING ERRCODE='23514';
  END IF;
  IF v_latest IS DISTINCT FROM NEW.result_revision THEN
    RAISE EXCEPTION 'Los resultados cambiaron. Actualizá el cuadro antes de confirmarlo.' USING ERRCODE='23514';
  END IF;
  WITH stats AS (
    SELECT gp.group_id,gp.pair_id,count(r.match_id) AS played,
      coalesce(sum(CASE WHEN r.winner_pair_id=gp.pair_id THEN 3 ELSE 0 END),0)::integer AS points,
      coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id THEN r.sets_pair1 ELSE r.sets_pair2 END),0)::integer AS sf,
      coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id THEN r.sets_pair2 ELSE r.sets_pair1 END),0)::integer AS sa
    FROM public.bp_tournament_group_pairs gp
    LEFT JOIN public.bp_tournament_match_results r ON r.group_id=gp.group_id
      AND gp.pair_id IN (r.resolved_pair1_id,r.resolved_pair2_id)
    WHERE gp.tournament_id=NEW.tournament_id GROUP BY gp.group_id,gp.pair_id
  ), ranked AS (
    SELECT s.*,row_number() OVER(PARTITION BY group_id ORDER BY points DESC,(sf-sa) DESC,sf DESC,pair_id) AS pos,
      count(*) OVER(PARTITION BY group_id,points,(sf-sa),sf) AS tied,
      count(*) OVER(PARTITION BY group_id) AS group_size
    FROM stats s
  )
  SELECT array_agg(pair_id) INTO v_qualifiers FROM ranked
  WHERE pos <= CASE WHEN group_size=3 THEN 2 ELSE 3 END AND tied=1 AND played=2;
  IF coalesce(array_length(v_qualifiers,1),0)<>7 THEN
    RAISE EXCEPTION 'Hay posiciones empatadas o marcadores inconsistentes: falta resolver la clasificación.' USING ERRCODE='23514';
  END IF;
  IF jsonb_typeof(NEW.quarterfinals)<>'array' OR jsonb_array_length(NEW.quarterfinals)<>3
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.quarterfinals) q(slot)
      WHERE jsonb_typeof(slot)<>'array' OR jsonb_array_length(slot)<>2) THEN
    RAISE EXCEPTION 'Se necesitan tres cuartos de final con dos parejas cada uno.' USING ERRCODE='23514';
  END IF;
  BEGIN
    SELECT array_agg(v.value::uuid) INTO v_participants
    FROM jsonb_array_elements(NEW.quarterfinals) q(slot)
    CROSS JOIN LATERAL jsonb_array_elements_text(q.slot) v(value);
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Identificadores inválidos de parejas.' USING ERRCODE='23514';
  END;
  v_all:=array_append(v_participants,NEW.direct_semifinal_pair_id);
  SELECT count(DISTINCT id) INTO v_unique FROM unnest(v_all) q(id);
  IF coalesce(array_length(v_all,1),0)<>7 OR v_unique<>7
    OR NOT(v_all @> v_qualifiers AND v_qualifiers @> v_all) THEN
    RAISE EXCEPTION 'Usá exactamente las siete parejas clasificadas, sin repetir ninguna.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS bp_knockout_validate_seven_bracket_trg ON public.bp_tournament_knockout_brackets;
CREATE TRIGGER bp_knockout_validate_seven_bracket_trg
BEFORE INSERT OR UPDATE ON public.bp_tournament_knockout_brackets
FOR EACH ROW EXECUTE FUNCTION public.bp_knockout_validate_seven_bracket();
COMMENT ON TABLE public.bp_tournament_knockout_brackets IS
 'Cuadro de 7 clasificados: elección de pase directo y 3 cuartos. No reserva cancha.';
