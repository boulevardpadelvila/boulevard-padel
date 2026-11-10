-- Boulevard Pádel · Parche 89 · ETAPA 2A: BASE TÉCNICA EN BORRADOR.
-- 09/11/2026 · SOLO RAMA DE DESARROLLO.
-- NO INSTALAR EN SUPABASE. NO EJECUTAR NI GUARDAR EN SQL EDITOR.
-- No es la migración definitiva: faltan RPC de programación y resultados,
-- bloqueo de cancha, publicación, guardias de finalización y borrado integral.
-- El fixture de la fase regular bp_league_matches NO se reescribe ni se mezcla
-- con los tres partidos definitivos de Liga.
--
-- Aprobado: top 4 por criterios actuales y sin desempate arbitrario.
-- SF1 = 1º vs 3º; SF2 = 2º vs 4º; final = ganadores.
-- SF y F: mejor de tres sets NORMALES; sin STB ni tercer puesto.

CREATE TABLE public.bp_league_final_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL
    REFERENCES public.bp_tournaments(id) ON DELETE RESTRICT,
  stage text NOT NULL CHECK(stage IN ('semifinal','final')),
  slot smallint NOT NULL,
  pair1_id uuid,
  pair2_id uuid,
  schedule_status text NOT NULL DEFAULT 'unscheduled'
    CHECK(schedule_status IN ('unscheduled','scheduled','postponed')),
  scheduled_at timestamptz,
  scheduled_ends_at timestamptz,
  court_label text,
  match_status text NOT NULL DEFAULT 'pending'
    CHECK(match_status IN ('pending','played')),
  sets jsonb,
  sets_pair1 smallint,
  sets_pair2 smallint,
  winner_pair_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bp_lf_stage_slot CHECK(
    (stage='semifinal' AND slot IN (1,2))
    OR (stage='final' AND slot=1)
  ),
  CONSTRAINT bp_lf_unique_match UNIQUE(tournament_id,stage,slot),
  CONSTRAINT bp_lf_pair1_fk FOREIGN KEY(pair1_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
  CONSTRAINT bp_lf_pair2_fk FOREIGN KEY(pair2_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
  CONSTRAINT bp_lf_participants CHECK(
    (pair1_id IS NULL AND pair2_id IS NULL AND stage='final')
    OR (pair1_id IS NOT NULL AND pair2_id IS NOT NULL
      AND pair1_id<>pair2_id)
  ),
  CONSTRAINT bp_lf_schedule_valid CHECK(
    (schedule_status='scheduled' AND scheduled_at IS NOT NULL
      AND scheduled_ends_at IS NOT NULL
      AND scheduled_ends_at-scheduled_at IN (interval '90 minutes', interval '120 minutes'))
    OR (schedule_status<>'scheduled'
      AND scheduled_at IS NULL AND scheduled_ends_at IS NULL)
  ),
  CONSTRAINT bp_lf_score_valid CHECK(
    (match_status='pending' AND sets IS NULL AND sets_pair1 IS NULL
      AND sets_pair2 IS NULL AND winner_pair_id IS NULL)
    OR (match_status='played' AND pair1_id IS NOT NULL
      AND pair2_id IS NOT NULL AND sets IS NOT NULL
      AND sets_pair1 IS NOT NULL AND sets_pair2 IS NOT NULL
      AND winner_pair_id IN(pair1_id,pair2_id))
  )
);

CREATE INDEX bp_lf_by_tournament
  ON public.bp_league_final_matches(tournament_id,stage,slot);
ALTER TABLE public.bp_league_final_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_league_final_matches FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bp_league_final_matches TO authenticated;
CREATE POLICY bp_lf_admin_read
  ON public.bp_league_final_matches FOR SELECT TO authenticated
  USING ((SELECT public.bp_tournament_is_admin()));
-- Sin permisos ni políticas INSERT/UPDATE/DELETE para usuarios;
-- escrituras futuras solo por funciones administrativas auditadas.

-- Generación determinista. No crea programación ni resultados.
-- Bloquea el torneo y las filas de Liga durante la comprobación.
CREATE OR REPLACE FUNCTION public.bp_league_prepare_final89(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_qualifiers uuid[];
  v_tied boolean;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id FOR UPDATE;
  IF NOT FOUND OR v_t.format<>'league' THEN
    RAISE EXCEPTION 'Liga inexistente.' USING ERRCODE='P0002';
  END IF;
  IF v_t.status NOT IN('registration_closed','in_progress') THEN
    RAISE EXCEPTION 'La Liga no admite generar semifinales en este estado.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id) THEN
    RAISE EXCEPTION 'La fase final ya existe; no se vuelve a generar.' USING ERRCODE='23514';
  END IF;
  -- Evitar que resultados concurrentes cambien mientras se lee la tabla.
  PERFORM 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id FOR SHARE;
  SELECT count(*) INTO v_count FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id;
  IF v_count=0 OR EXISTS(
    SELECT 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id AND match_status<>'played'
  ) THEN
    RAISE EXCEPTION 'Completá la fase regular antes de generar semifinales.'
      USING ERRCODE='23514';
  END IF;

  -- Puntuación Liga: 2 victoria; 1 derrota 2-1; 0 derrota 2-0.
  -- Sets y games idénticos a js/torneos-liga-motor.js:
  -- solo los dos sets normales suman games, NO el STB.
  WITH per_pair AS (
    SELECT m.pair1_id AS pair_id,
      CASE WHEN m.winner_pair_id=m.pair1_id THEN 2
           WHEN m.sets_pair1=1 THEN 1 ELSE 0 END AS points,
      m.sets_pair1::int AS sf,m.sets_pair2::int AS sc,
      ((m.sets->0->>0)::int+(m.sets->1->>0)::int) AS gf,
      ((m.sets->0->>1)::int+(m.sets->1->>1)::int) AS gc
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
    UNION ALL
    SELECT m.pair2_id,
      CASE WHEN m.winner_pair_id=m.pair2_id THEN 2
           WHEN m.sets_pair2=1 THEN 1 ELSE 0 END,
      m.sets_pair2::int,m.sets_pair1::int,
      ((m.sets->0->>1)::int+(m.sets->1->>1)::int),
      ((m.sets->0->>0)::int+(m.sets->1->>0)::int)
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
  ), totals AS (
    SELECT p.id AS pair_id,
      coalesce(sum(s.points),0)::int AS points,
      (coalesce(sum(s.sf),0)-coalesce(sum(s.sc),0))::int AS sd,
      coalesce(sum(s.sf),0)::int AS sf,
      (coalesce(sum(s.gf),0)-coalesce(sum(s.gc),0))::int AS gd,
      coalesce(sum(s.gf),0)::int AS gf
    FROM public.bp_tournament_pairs p
    LEFT JOIN per_pair s ON s.pair_id=p.id
    WHERE p.tournament_id=p_tournament_id AND p.status='approved'
    GROUP BY p.id
  ), ranking AS (
    SELECT pair_id,
      row_number() OVER (ORDER BY points DESC,sd DESC,sf DESC,
                        gd DESC,gf DESC,pair_id)::int AS pos,
      count(*) OVER(PARTITION BY points,sd,sf,gd,gf)::int AS same_metrics
    FROM totals
  )
  SELECT array_agg(pair_id ORDER BY pos),bool_or(same_metrics>1)
    INTO v_qualifiers,v_tied FROM ranking WHERE pos<=4;

  IF coalesce(array_length(v_qualifiers,1),0)<>4 THEN
    RAISE EXCEPTION 'Se necesitan cuatro clasificadas para semifinales.' USING ERRCODE='23514';
  END IF;
  IF coalesce(v_tied,false) THEN
    RAISE EXCEPTION 'Empate absoluto que afecta los cuatro puestos: Martín debe resolverlo.'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO public.bp_league_final_matches(tournament_id,stage,slot,pair1_id,pair2_id)
  VALUES (p_tournament_id,'semifinal',1,v_qualifiers[1],v_qualifiers[3]),
         (p_tournament_id,'semifinal',2,v_qualifiers[2],v_qualifiers[4]),
         (p_tournament_id,'final',1,NULL,NULL);
  RETURN jsonb_build_object(
    'created',true,'qualifiers',v_qualifiers,
    'semifinal1',jsonb_build_array(v_qualifiers[1],v_qualifiers[3]),
    'semifinal2',jsonb_build_array(v_qualifiers[2],v_qualifiers[4]),
    'final','ganador SF1 vs ganador SF2'
  );
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_league_prepare_final89(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_prepare_final89(uuid)
  TO authenticated;

-- ETAPA 2A NO ES INSTALABLE: faltan integraciones obligatorias antes
-- de que una Liga pueda generar/editar/cerrar partidos en producción.
