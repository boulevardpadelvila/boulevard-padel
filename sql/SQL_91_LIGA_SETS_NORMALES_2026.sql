-- Boulevard Pádel · Liga 2026: todos los encuentros son al mejor de tres SETS NORMALES.
-- Nueva RPC: la histórica sigue disponible por compatibilidad.
BEGIN;
CREATE OR REPLACE FUNCTION public.bp_league_save_result2026(p_match_id uuid,p_sets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;v_m public.bp_league_matches%ROWTYPE;
 v_num int;v_i int;v_a int;v_b int;v_high int;v_low int;
 v_s1 int:=0;v_s2 int:=0;v_winner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo el administrador puede guardar resultados de Liga.' USING ERRCODE='42501';
 END IF;
 SELECT t.* INTO v_t FROM public.bp_tournaments t
 JOIN public.bp_league_matches m ON m.tournament_id=t.id
 WHERE m.id=p_match_id FOR UPDATE OF t;
 IF NOT FOUND OR v_t.format<>'league' OR v_t.rules_version<>2026
    OR v_t.status NOT IN('in_progress','registration_closed') THEN
   RAISE EXCEPTION 'La Liga no admite resultados en este estado.' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_m FROM public.bp_league_matches m WHERE m.id=p_match_id FOR UPDATE;
 IF v_m.round_number IS NULL THEN
   RAISE EXCEPTION 'Primero asigná la Fecha al partido.' USING ERRCODE='23514';
 END IF;
 IF p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
   RAISE EXCEPTION 'Ingresá dos o tres sets normales.' USING ERRCODE='23514';
 END IF;
 v_num:=jsonb_array_length(p_sets);
 IF v_num NOT IN(2,3) THEN RAISE EXCEPTION 'Se requieren dos o tres sets.' USING ERRCODE='23514'; END IF;
 FOR v_i IN 0..(v_num-1) LOOP
   IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2
       OR jsonb_typeof(p_sets->v_i->0)<>'number' OR jsonb_typeof(p_sets->v_i->1)<>'number'
       OR (p_sets->v_i->>0)!~'^[0-9]{1,2}$' OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$' THEN
     RAISE EXCEPTION 'Marcador del set inválido.' USING ERRCODE='23514';
   END IF;
   v_a:=(p_sets->v_i->>0)::int;v_b:=(p_sets->v_i->>1)::int;
   v_high:=greatest(v_a,v_b);v_low:=least(v_a,v_b);
   IF v_a=v_b OR NOT ((v_high=6 AND v_low<=4) OR(v_high=7 AND v_low IN(5,6)))
      OR v_s1=2 OR v_s2=2 THEN
     RAISE EXCEPTION 'Todos los sets de Liga deben ser normales: 6-0 a 6-4, 7-5 o 7-6.' USING ERRCODE='23514';
   END IF;
   IF v_a>v_b THEN v_s1:=v_s1+1;ELSE v_s2:=v_s2+1;END IF;
 END LOOP;
 IF greatest(v_s1,v_s2)<>2 OR (v_num=3 AND (v_s1+v_s2)<>3)
  OR (v_num=2 AND least(v_s1,v_s2)<>0) THEN
   RAISE EXCEPTION 'El partido debe resolverse al mejor de tres sets normales.' USING ERRCODE='23514';
 END IF;
 v_winner:=CASE WHEN v_s1=2 THEN v_m.pair1_id ELSE v_m.pair2_id END;
 UPDATE public.bp_league_matches m SET sets=p_sets,sets_pair1=v_s1,sets_pair2=v_s2,
    winner_pair_id=v_winner,match_status='played',updated_at=now()
 WHERE m.id=p_match_id;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,
    'sets_pair1',v_s1,'sets_pair2',v_s2,'format','three_sets');
END $fn$;
REVOKE ALL ON FUNCTION public.bp_league_save_result2026(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_save_result2026(uuid,jsonb) TO authenticated;
COMMIT;