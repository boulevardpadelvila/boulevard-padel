-- P89: resolución de empate ABSOLUTO de Liga, PostgreSQL 17 efímero.
-- Datos inventados, nunca Supabase de producción.
SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.test_admin','on',false);
INSERT INTO public.bp_tournaments(id,name,format,status,is_published)
VALUES ('60000000-0000-0000-0000-000000000101',
        'Liga de empate sintético','league','in_progress',false);
INSERT INTO public.bp_tournament_pairs
  (id,tournament_id,status,player1_name,player2_name)
SELECT ('60000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       '60000000-0000-0000-0000-000000000101'::uuid,
       'approved','Pareja '||i,'Jugador '||i
FROM generate_series(1,5) i;

-- Torneo circular de 5 parejas, 10 partidos: cada una gana dos y pierde
-- dos con sets idénticos: las cinco quedan empatadas en las cinco métricas.
INSERT INTO public.bp_league_matches(
  tournament_id,pair1_id,pair2_id,match_number,round_number,leg,
  match_status,sets,sets_pair1,sets_pair2,winner_pair_id
)
SELECT '60000000-0000-0000-0000-000000000101'::uuid,
  ('60000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
  ('60000000-0000-0000-0000-'||lpad(j::text,12,'0'))::uuid,
  (i-1)*5+j,1,1,'played',
  CASE WHEN (j-i) IN(1,2) THEN '[[6,0],[6,0]]'::jsonb
       ELSE '[[0,6],[0,6]]'::jsonb END,
  CASE WHEN (j-i) IN(1,2) THEN 2 ELSE 0 END,
  CASE WHEN (j-i) IN(1,2) THEN 0 ELSE 2 END,
  ('60000000-0000-0000-0000-'||
   lpad((CASE WHEN (j-i) IN(1,2) THEN i ELSE j END)::text,12,'0'))::uuid
FROM generate_series(1,5) i CROSS JOIN generate_series(1,5) j
WHERE i<j;

-- Corrección de orientación del torneo circular: reglas 1→2/3, 2→3/4,
-- 3→4/5, 4→5/1, 5→1/2. Los encuentros con diferencia 3 o 4
-- pertenecen al segundo jugador como ganador. 
-- El set-data ya lo reproduce: cada pareja gana exactamente dos encuentros.

DO $test$
DECLARE
  t uuid:='60000000-0000-0000-0000-000000000101';
  selected uuid[];
  answer jsonb;
  n integer;
BEGIN
  SELECT ARRAY[
    '60000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000002'::uuid,
    '60000000-0000-0000-0000-000000000003'::uuid,
    '60000000-0000-0000-0000-000000000005'::uuid
  ] INTO selected;

  IF (SELECT count(*) FROM public.bp_league_matches WHERE tournament_id=t)<>10
    THEN RAISE EXCEPTION 'Fixture circular incompleto'; END IF;

  IF NOT has_function_privilege('authenticated',
    'public.bp_league_prepare_final_manual89(uuid,uuid[],text)','EXECUTE')
    OR has_function_privilege('anon',
    'public.bp_league_prepare_final_manual89(uuid,uuid[],text)','EXECUTE')
    OR has_table_privilege('anon',
    'public.bp_league_final_tiebreak_decisions89','SELECT')
    OR NOT has_table_privilege('authenticated',
    'public.bp_league_final_tiebreak_decisions89','SELECT')
  THEN RAISE EXCEPTION 'ACL de desempate incorrecta'; END IF;

  BEGIN
    PERFORM public.bp_league_prepare_final89(t);
    RAISE EXCEPTION 'ERROR: el método automático inventó un desempate';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM set_config('app.test_admin','off',false);
  BEGIN
    PERFORM public.bp_league_prepare_final_manual89(t,selected,'Sorteo administrado');
    RAISE EXCEPTION 'ERROR: no administrador generó semifinales';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('app.test_admin','on',false);

  BEGIN
    PERFORM public.bp_league_prepare_final_manual89(
      t,ARRAY[selected[1],selected[1],selected[3],selected[4]],
      'Decisión duplicada');
    RAISE EXCEPTION 'ERROR: permitió cuatro puestos con pareja duplicada';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    PERFORM public.bp_league_prepare_final_manual89(t,selected,'corto');
    RAISE EXCEPTION 'ERROR: permite un motivo de menos de diez caracteres';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  answer:=public.bp_league_prepare_final_manual89(
    t,selected,'Sorteo presencial realizado por administrador tras igualdad absoluta');
  IF answer->>'manual_tiebreak'<>'true'
    OR answer->'qualifiers'->>3 <> selected[4]::text THEN
    RAISE EXCEPTION 'Desempate no guardó decisión de Martín';
  END IF;

  SELECT count(*) INTO n FROM public.bp_league_final_matches
    WHERE tournament_id=t;
  IF n<>3 THEN RAISE EXCEPTION 'El desempate no creó los tres partidos finales'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.bp_league_final_matches
    WHERE tournament_id=t AND stage='semifinal' AND slot=2
      AND pair1_id=selected[2] AND pair2_id=selected[4]
  ) THEN RAISE EXCEPTION 'El cruce de semifinal 2 no respeta la decisión'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.bp_league_final_tiebreak_decisions89
    WHERE tournament_id=t AND qualifier_ids=selected
      AND decided_by='10000000-0000-0000-0000-000000000001'::uuid
      AND char_length(reason)>=10
  ) THEN RAISE EXCEPTION 'Auditoría de desempate no se registró'; END IF;
  IF (SELECT count(*) FROM public.bp_league_matches WHERE tournament_id=t)<>10
    THEN RAISE EXCEPTION 'Se alteró la fase regular'; END IF;

  BEGIN
    PERFORM public.bp_league_prepare_final_manual89(
      t,selected,'Intento de doble resolución');
    RAISE EXCEPTION 'ERROR: permitió segunda resolución';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'P89 EMPATE ABSOLUTO OK: Martín decide cuatro puestos, auditoría guardada y 10 resultados intactos';
END;
$test$;
