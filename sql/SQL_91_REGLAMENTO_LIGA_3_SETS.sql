-- Boulevard Pádel · SQL 91 · Liga: tercer set normal desde el 12/11/2026
-- PREPARADA, NO APLICADA: requiere suite aprobada y revisión previa.
-- Históricos con STB permanecen íntegros: NO suman sus puntos como games.
-- No cambia datos, tablas, roles, reservas, turnos fijos ni bloqueos.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';

CREATE OR REPLACE FUNCTION public.bp_league_save_result(p_match_id uuid, p_sets jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_m public.bp_league_matches%ROWTYPE;
 v_t public.bp_tournaments%ROWTYPE;
 v_num integer;
 v_i integer;
 v_a integer;
 v_b integer;
 v_high integer;
 v_low integer;
 v_s1 integer:=0;
 v_s2 integer:=0;
 v_winner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_league_matches WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido inexistente.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=v_m.tournament_id;
 IF v_t.format<>'league' OR v_t.status NOT IN ('in_progress','registration_closed') THEN
   RAISE EXCEPTION 'La Liga no admite resultados en este estado.' USING ERRCODE='23514';
 END IF;
 IF v_m.round_number IS NULL THEN
   RAISE EXCEPTION 'Asigná primero la Fecha del partido.' USING ERRCODE='23514';
 END IF;
 IF p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
   RAISE EXCEPTION 'Ingresá dos o tres sets normales.' USING ERRCODE='23514';
 END IF;
 v_num:=jsonb_array_length(p_sets);
 IF v_num NOT IN (2,3) THEN RAISE EXCEPTION 'Se requieren dos o tres sets.' USING ERRCODE='23514'; END IF;
 FOR v_i IN 0..(v_num-1) LOOP
   IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2
     OR jsonb_typeof(p_sets->v_i->0)<>'number'
     OR jsonb_typeof(p_sets->v_i->1)<>'number'
     OR (p_sets->v_i->>0)!~'^[0-9]{1,2}$'
     OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$' THEN
     RAISE EXCEPTION 'Marcador inválido.' USING ERRCODE='23514';
   END IF;
   v_a:=(p_sets->v_i->>0)::integer;
   v_b:=(p_sets->v_i->>1)::integer;
   v_high:=greatest(v_a,v_b);
   v_low:=least(v_a,v_b);
   IF v_a=v_b OR (v_i<2 AND NOT(
     (v_high=6 AND v_low<=4) OR (v_high=7 AND v_low IN(5,6))))
     OR (v_i=2 AND NOT(
       (v_high=6 AND v_low<=4) OR (v_high=7 AND v_low IN(5,6)))) THEN
     RAISE EXCEPTION 'Set inválido: usá 6-0 a 6-4, 7-5 o 7-6; tercer set normal.' USING ERRCODE='23514';
   END IF;
   IF v_s1=2 OR v_s2=2 THEN
     RAISE EXCEPTION 'El partido ya estaba definido: no corresponde otro set.' USING ERRCODE='23514';
   END IF;
   IF v_a>v_b THEN v_s1:=v_s1+1; ELSE v_s2:=v_s2+1; END IF;
 END LOOP;
 IF greatest(v_s1,v_s2)<>2 OR (v_num=3 AND (v_s1+v_s2)<>3)
   OR (v_num=2 AND least(v_s1,v_s2)<>0) THEN
   RAISE EXCEPTION 'El partido debe resolverse al mejor de tres con tercer set normal en 1-1.' USING ERRCODE='23514';
 END IF;
 v_winner:=CASE WHEN v_s1=2 THEN v_m.pair1_id ELSE v_m.pair2_id END;
 UPDATE public.bp_league_matches SET
   sets=p_sets, sets_pair1=v_s1, sets_pair2=v_s2,
   winner_pair_id=v_winner, match_status='played',updated_at=now()
 WHERE id=p_match_id;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,
   'sets_pair1',v_s1,'sets_pair2',v_s2);
END;
$function$


CREATE OR REPLACE FUNCTION public.bp_league_prepare_final89(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- 3er set normal suma games; STB histórico no.
  WITH per_pair AS (
    SELECT m.pair1_id AS pair_id,
      CASE WHEN m.winner_pair_id=m.pair1_id THEN 2
           WHEN m.sets_pair1=1 THEN 1 ELSE 0 END AS points,
      m.sets_pair1::int AS sf,m.sets_pair2::int AS sc,
      (((m.sets->0->>0)::int+(m.sets->1->>0)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>0)::int ELSE 0 END) AS gf,
      (((m.sets->0->>1)::int+(m.sets->1->>1)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>1)::int ELSE 0 END) AS gc
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
    UNION ALL
    SELECT m.pair2_id,
      CASE WHEN m.winner_pair_id=m.pair2_id THEN 2
           WHEN m.sets_pair2=1 THEN 1 ELSE 0 END,
      m.sets_pair2::int,m.sets_pair1::int,
      (((m.sets->0->>1)::int+(m.sets->1->>1)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>1)::int ELSE 0 END),
      (((m.sets->0->>0)::int+(m.sets->1->>0)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>0)::int ELSE 0 END)
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
$function$


CREATE OR REPLACE FUNCTION public.bp_league_prepare_final_manual89(p_tournament_id uuid, p_qualifiers uuid[], p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_approved integer;
  v_unique integer;
  v_invalid integer;
  v_valid boolean;
  v_tie boolean;
  v_regular integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
  END IF;
  IF p_qualifiers IS NULL OR array_ndims(p_qualifiers)<>1
    OR cardinality(p_qualifiers)<>4
    OR NULLIF(btrim(p_reason),'') IS NULL
    OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 300 THEN
    RAISE EXCEPTION 'Elegí cuatro puestos y explicá el desempate (10 a 300 caracteres).'
      USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_t FROM public.bp_tournaments t
    WHERE t.id=p_tournament_id FOR UPDATE;
  IF NOT FOUND OR v_t.format<>'league' THEN
    RAISE EXCEPTION 'Liga inexistente.' USING ERRCODE='P0002';
  END IF;
  IF v_t.status NOT IN('registration_closed','in_progress') THEN
    RAISE EXCEPTION 'Estado de Liga no habilitado para semifinales.'
      USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.bp_league_final_matches
            WHERE tournament_id=p_tournament_id) THEN
    RAISE EXCEPTION 'Las semifinales ya fueron generadas.'
      USING ERRCODE='23514';
  END IF;

  -- Mismo orden de bloqueo que el generador normal: torneo y luego partidos.
  PERFORM 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id FOR SHARE;
  SELECT count(*) INTO v_regular FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id;
  IF v_regular=0 OR EXISTS(
    SELECT 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id AND match_status<>'played'
  ) THEN
    RAISE EXCEPTION 'Completá la fase regular antes de definir el desempate.'
      USING ERRCODE='23514';
  END IF;

  -- RANK() usa exactamente los cinco criterios de Liga. Cada candidato
  -- solo puede ocupar uno de los puestos cubiertos por su grupo empatado.
  -- Esto evita promocionar una pareja con peor clasificación.
  WITH per_pair AS (
    SELECT m.pair1_id AS pair_id,
      CASE WHEN m.winner_pair_id=m.pair1_id THEN 2
           WHEN m.sets_pair1=1 THEN 1 ELSE 0 END AS points,
      m.sets_pair1::int AS sf,m.sets_pair2::int AS sc,
      (((m.sets->0->>0)::int+(m.sets->1->>0)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>0)::int ELSE 0 END) AS gf,
      (((m.sets->0->>1)::int+(m.sets->1->>1)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>1)::int ELSE 0 END) AS gc
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
    UNION ALL
    SELECT m.pair2_id,
      CASE WHEN m.winner_pair_id=m.pair2_id THEN 2
           WHEN m.sets_pair2=1 THEN 1 ELSE 0 END,
      m.sets_pair2::int,m.sets_pair1::int,
      (((m.sets->0->>1)::int+(m.sets->1->>1)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>1)::int ELSE 0 END),
      (((m.sets->0->>0)::int+(m.sets->1->>0)::int)+CASE WHEN jsonb_array_length(m.sets)=3 AND
        greatest((m.sets->2->>0)::int,(m.sets->2->>1)::int)<=7
        THEN (m.sets->2->>0)::int ELSE 0 END)
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
  ), ranked AS (
    SELECT pair_id,
      rank() OVER(ORDER BY points DESC,sd DESC,sf DESC,
                 gd DESC,gf DESC)::int AS first_seed,
      count(*) OVER(PARTITION BY points,sd,sf,gd,gf)::int AS group_size
    FROM totals
  ), picked AS (
    SELECT q.pair_id,q.seed,r.first_seed,r.group_size
    FROM unnest(p_qualifiers) WITH ORDINALITY AS q(pair_id,seed)
    LEFT JOIN ranked r ON r.pair_id=q.pair_id
  )
  SELECT (SELECT count(*) FROM ranked),
    (SELECT count(DISTINCT pair_id) FROM picked),
    (SELECT count(*) FROM picked WHERE first_seed IS NULL),
    (SELECT bool_and(
      first_seed<=seed AND first_seed+group_size-1>=seed
    ) FROM picked),
    (SELECT coalesce(bool_or(group_size>1),false)
      FROM ranked WHERE first_seed<=4)
  INTO v_approved,v_unique,v_invalid,v_valid,v_tie;

  IF v_approved<4 OR NOT v_tie OR v_unique<>4 OR v_invalid<>0
    OR NOT COALESCE(v_valid,false) THEN
    RAISE EXCEPTION 'La decisión solo puede ordenar parejas realmente empatadas por las cinco métricas.'
      USING ERRCODE='23514';
  END IF;

  INSERT INTO public.bp_league_final_tiebreak_decisions89
    (tournament_id,qualifier_ids,reason,decided_by)
  VALUES(p_tournament_id,p_qualifiers,btrim(p_reason),auth.uid());

  INSERT INTO public.bp_league_final_matches
    (tournament_id,stage,slot,pair1_id,pair2_id)
  VALUES(p_tournament_id,'semifinal',1,p_qualifiers[1],p_qualifiers[3]),
        (p_tournament_id,'semifinal',2,p_qualifiers[2],p_qualifiers[4]),
        (p_tournament_id,'final',1,NULL,NULL);
  RETURN jsonb_build_object(
    'created',true,'manual_tiebreak',true,'qualifiers',p_qualifiers,
    'semifinal1',jsonb_build_array(p_qualifiers[1],p_qualifiers[3]),
    'semifinal2',jsonb_build_array(p_qualifiers[2],p_qualifiers[4])
  );
END;
$function$


COMMIT;
