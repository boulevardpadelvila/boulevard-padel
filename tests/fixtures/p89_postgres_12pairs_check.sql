-- P89: verificar clasificación de Liga artificial con 12 parejas y 66 partidos.
-- Nunca ejecutar contra Supabase productivo: SOLO PostgreSQL temporal en CI.
SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.test_admin','on',false);
DO $p89$
DECLARE
  t uuid:='20000000-0000-0000-0000-000000000101';
  v_count int;
  v_rounds int;
  v_result jsonb;
BEGIN
  SELECT count(*),count(DISTINCT round_number) INTO v_count,v_rounds
  FROM public.bp_league_matches WHERE tournament_id=t;
  IF v_count<>66 OR v_rounds<>11 THEN
    RAISE EXCEPTION 'Fixture 12 parejas erróneo: % juegos / % fechas',v_count,v_rounds;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bp_league_matches
      WHERE tournament_id=t AND match_status<>'played'
  ) THEN
    RAISE EXCEPTION 'Quedaron partidos de Liga sin resultados';
  END IF;
  v_result:=public.bp_league_prepare_final89(t);
  IF (v_result->'qualifiers'->>0)<> '20000000-0000-0000-0000-000000000001' OR
     (v_result->'qualifiers'->>1)<> '20000000-0000-0000-0000-000000000002' OR
     (v_result->'qualifiers'->>2)<> '20000000-0000-0000-0000-000000000003' OR
     (v_result->'qualifiers'->>3)<> '20000000-0000-0000-0000-000000000004' THEN
    RAISE EXCEPTION 'Clasificación 12 parejas inesperada: %',v_result;
  END IF;
  IF (SELECT pair1_id FROM public.bp_league_final_matches
      WHERE tournament_id=t AND stage='semifinal' AND slot=1)<>
        '20000000-0000-0000-0000-000000000001'::uuid OR
     (SELECT pair2_id FROM public.bp_league_final_matches
      WHERE tournament_id=t AND stage='semifinal' AND slot=1)<>
        '20000000-0000-0000-0000-000000000003'::uuid OR
     (SELECT pair1_id FROM public.bp_league_final_matches
      WHERE tournament_id=t AND stage='semifinal' AND slot=2)<>
        '20000000-0000-0000-0000-000000000002'::uuid OR
     (SELECT pair2_id FROM public.bp_league_final_matches
      WHERE tournament_id=t AND stage='semifinal' AND slot=2)<>
        '20000000-0000-0000-0000-000000000004'::uuid THEN
    RAISE EXCEPTION 'Cruces semifinales de Liga de 12 incorrectos';
  END IF;
  SELECT count(*) INTO v_count FROM public.bp_league_matches WHERE tournament_id=t;
  IF v_count<>66 THEN RAISE EXCEPTION 'Se alteró el fixture regular de 66 partidos'; END IF;
  RAISE NOTICE 'P89 12 PAREJAS OK: 66 partidos, 11 fechas, 1°-3° y 2°-4°, fase regular conservada';
END $p89$;
