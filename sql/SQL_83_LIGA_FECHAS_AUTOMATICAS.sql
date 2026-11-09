-- Boulevard Pádel · SQL 83 · Fechas automáticas de Liga
-- Preparada 09/11/2026. NO INSTALADA: requiere aprobación explícita previa.
-- Migración definitiva para guardar en GitHub; NO ejecutar ni guardar en SQL Editor.
-- No borra partidos, no modifica parejas, horarios, reservas ni bloqueos.
-- Una sola rueda: 12 parejas = 11 Fechas con 6 partidos cada una, 66 en total.
-- Una pareja juega a lo sumo una vez por Fecha deportiva.
-- Conservar controles de autorización/RLS de SQL 82.

CREATE OR REPLACE FUNCTION public.bp_league_generate_fixture(
 p_tournament_id uuid, p_legs integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_ids uuid[];
 v_size integer;
 v_count integer;
 v_round integer;
 v_leg integer;
 v_i integer;
 v_pair1 uuid;
 v_pair2 uuid;
 v_slot integer;
 v_inserted integer:=0;
 v_matches integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo un administrador activo puede generar una Liga.' USING ERRCODE='42501';
 END IF;
 IF p_legs IS DISTINCT FROM 1 THEN
   RAISE EXCEPTION 'La modalidad Liga se juega por ahora a una sola rueda.' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_t FROM public.bp_tournaments
 WHERE id=p_tournament_id FOR UPDATE;
 IF NOT FOUND OR v_t.format<>'league' THEN
   RAISE EXCEPTION 'La competencia no es una Liga.' USING ERRCODE='23514';
 END IF;

 IF EXISTS(SELECT 1 FROM public.bp_league_settings WHERE tournament_id=p_tournament_id)
    OR EXISTS(SELECT 1 FROM public.bp_league_matches WHERE tournament_id=p_tournament_id) THEN
   RAISE EXCEPTION 'El fixture ya existe. No se regenera para conservar resultados y programación.' USING ERRCODE='23514';
 END IF;
 SELECT array_agg(id ORDER BY draw_key),count(*)
 INTO v_ids,v_count FROM (
   SELECT id,random() AS draw_key FROM public.bp_tournament_pairs
   WHERE tournament_id=p_tournament_id AND status='approved'
 ) AS draw;
 IF EXISTS(SELECT 1 FROM public.bp_tournament_pairs
     WHERE tournament_id=p_tournament_id AND status='pending') THEN
   RAISE EXCEPTION 'Resolvé todas las solicitudes pendientes antes de generar la Liga.' USING ERRCODE='23514';
 END IF;
 IF v_count<2 OR v_count>64 THEN
   RAISE EXCEPTION 'Una Liga admite entre 2 y 64 parejas aprobadas.' USING ERRCODE='23514';
 END IF;
 IF NOT (v_t.status IN ('registration_closed','in_progress')
    OR (v_t.status='registration_open' AND v_t.max_pairs=v_count)) THEN
   RAISE EXCEPTION 'Cerrá las inscripciones o completá el cupo aprobado para sortear.' USING ERRCODE='23514';
 END IF;
 IF v_t.status='registration_open' AND v_t.max_pairs=v_count THEN
   UPDATE public.bp_tournaments SET status='registration_closed',updated_at=now()
   WHERE id=p_tournament_id;
 END IF;
 IF v_count%2=1 THEN v_ids:=array_append(v_ids,NULL::uuid); END IF;
 v_size:=array_length(v_ids,1);
 INSERT INTO public.bp_league_settings(tournament_id,legs)
 VALUES (p_tournament_id,p_legs);
 -- El sorteo crea TODOS los cruces de una rueda y distribuye automáticamente
 -- los partidos en Fechas competitivas; ningún día ni hora se asigna aquí.
 -- Martín programa posteriormente el día y la hora de cada cruce.
 FOR v_round IN 1..(v_size-1) LOOP
   FOR v_i IN 1..(v_size/2) LOOP
     v_pair1:=v_ids[v_i];
     v_pair2:=v_ids[v_size-v_i+1];
     IF v_pair1 IS NOT NULL AND v_pair2 IS NOT NULL THEN
       v_inserted:=v_inserted+1;
       INSERT INTO public.bp_league_matches(
         tournament_id,leg,round_number,match_number,pair1_id,pair2_id
       ) VALUES (
         p_tournament_id,1,v_round,v_inserted,
         CASE WHEN v_round%2=0 THEN v_pair2 ELSE v_pair1 END,
         CASE WHEN v_round%2=0 THEN v_pair1 ELSE v_pair2 END
       );
     END IF;
   END LOOP;
   v_ids:=ARRAY[v_ids[1]] || ARRAY[v_ids[v_size]] || v_ids[2:v_size-1];
 END LOOP;
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'legs',1,
   'pairs',v_count,'matches',v_inserted,'rounds_assigned',v_size-1);
END;
$league$;

CREATE OR REPLACE FUNCTION public.bp_league_assign_round(
 p_match_id uuid,p_round integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_m public.bp_league_matches%ROWTYPE;
 v_t public.bp_tournaments%ROWTYPE;
 v_p1_count integer;
 v_p2_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo el administrador puede organizar Fechas.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_league_matches WHERE id=p_match_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido inexistente.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_t FROM public.bp_tournaments
 WHERE id=v_m.tournament_id FOR UPDATE;
 SELECT * INTO v_m FROM public.bp_league_matches
 WHERE id=p_match_id FOR UPDATE;
 IF v_t.format<>'league' OR v_t.status='completed' THEN
   RAISE EXCEPTION 'No se pueden editar Fechas de una competencia finalizada.' USING ERRCODE='23514';
 END IF;
 IF v_m.match_status='played' THEN
   RAISE EXCEPTION 'Un partido disputado no puede cambiar de Fecha.' USING ERRCODE='23514';
 END IF;
 IF p_round IS NULL THEN
   IF v_m.schedule_status='scheduled' THEN
     RAISE EXCEPTION 'Primero postergá el partido antes de quitar su Fecha.' USING ERRCODE='23514';
   END IF;
 ELSE
   IF p_round<1 OR p_round>999 THEN
     RAISE EXCEPTION 'Indicá una Fecha entre 1 y 999.' USING ERRCODE='23514';
   END IF;
   SELECT
     count(*) FILTER (WHERE pair1_id=v_m.pair1_id OR pair2_id=v_m.pair1_id),
     count(*) FILTER (WHERE pair1_id=v_m.pair2_id OR pair2_id=v_m.pair2_id)
   INTO v_p1_count,v_p2_count
   FROM public.bp_league_matches
   WHERE tournament_id=v_m.tournament_id
     AND round_number=p_round AND id<>p_match_id;
   IF v_p1_count>=1 OR v_p2_count>=1 THEN
     RAISE EXCEPTION 'Cada pareja puede jugar un solo partido por Fecha en Liga.' USING ERRCODE='23514';
   END IF;
 END IF;
 UPDATE public.bp_league_matches
 SET round_number=p_round,updated_at=now() WHERE id=p_match_id;
 RETURN jsonb_build_object('match_id',p_match_id,'round_number',p_round);
END;
$league$;

-- Recuperación conservadora del fixture anterior (sin borrar ni resorte ar parejas).
-- Sólo organiza fixtures completos, sin ninguna Fecha, resultado ni programación.
-- La secuencia match_number fue creada agrupada por ronda desde SQL 82.
DO $backfill$
DECLARE
  v_item record;
  v_pairs integer;
  v_per_round integer;
  v_expected integer;
  v_rounds integer;
BEGIN
  FOR v_item IN
    SELECT m.tournament_id,
      count(*)::integer AS matches,
      count(*) FILTER (WHERE m.round_number IS NULL)::integer AS without_round,
      count(*) FILTER (WHERE m.schedule_status <> 'unscheduled'
        OR m.scheduled_at IS NOT NULL)::integer AS with_schedule,
      count(*) FILTER (WHERE m.match_status <> 'pending')::integer AS with_result,
      min(m.match_number) AS first_number,
      max(m.match_number) AS last_number
    FROM public.bp_league_matches m
    JOIN public.bp_tournaments t ON t.id=m.tournament_id AND t.format='league'
    GROUP BY m.tournament_id
  LOOP
    SELECT count(*)::integer INTO v_pairs
      FROM public.bp_tournament_pairs
      WHERE tournament_id=v_item.tournament_id AND status='approved';
    v_per_round:=v_pairs/2; -- división entera: 12 -> 6, 11 -> 5
    v_expected:=(v_pairs*(v_pairs-1))/2;
    v_rounds:=CASE WHEN v_pairs%2=0 THEN v_pairs-1 ELSE v_pairs END;
    IF v_pairs NOT BETWEEN 2 AND 64 OR
      v_item.matches<>v_expected OR
      v_item.without_round<>v_item.matches OR
      v_item.with_schedule<>0 OR v_item.with_result<>0 OR
      v_item.first_number<>1 OR v_item.last_number<>v_expected THEN
      RAISE NOTICE 'Fixture Liga % conservado sin cambios: revisión manual requerida.',
        v_item.tournament_id;
      CONTINUE;
    END IF;
    -- Validar antes de escribir: nadie debe repetir rival en una Fecha.
    IF EXISTS(
      SELECT 1 FROM (
        SELECT (m.match_number-1)/v_per_round+1 AS round_no,m.pair1_id AS pair_id
        FROM public.bp_league_matches m
        WHERE m.tournament_id=v_item.tournament_id
        UNION ALL
        SELECT (m.match_number-1)/v_per_round+1,m.pair2_id
        FROM public.bp_league_matches m
        WHERE m.tournament_id=v_item.tournament_id
      ) AS rounds
      GROUP BY round_no,pair_id HAVING count(*)>1
    ) THEN
      RAISE EXCEPTION 'Fixture Liga % no tiene cruces válidos por Fecha; no se modificó.',
        v_item.tournament_id;
    END IF;
    UPDATE public.bp_league_matches m
      SET round_number=(m.match_number-1)/v_per_round+1,updated_at=now()
      WHERE m.tournament_id=v_item.tournament_id AND m.round_number IS NULL;
    RAISE NOTICE 'Liga % organizada en % Fechas de hasta % partidos.',
      v_item.tournament_id,v_rounds,v_per_round;
  END LOOP;
END;
$backfill$;

NOTIFY pgrst, 'reload schema';
