-- P89: pruebas de integración sobre PostgreSQL 17 EFÍMERO. Nunca producción.
SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.test_admin','on',false);
SELECT set_config('app.test_delete_allowed','off',false);

INSERT INTO public.courts(id,active)
VALUES ('30000000-0000-0000-0000-000000000001',true);
INSERT INTO public.bp_tournaments(id,name,format,status,is_published)
VALUES ('00000000-0000-0000-0000-000000000101','Liga de ensayo P89','league','in_progress',true);
INSERT INTO public.bp_tournament_pairs(id,tournament_id,status,player1_name,player2_name)
SELECT id,'00000000-0000-0000-0000-000000000101'::uuid,'approved',tag,'Jugador B'
FROM (VALUES
 ('00000000-0000-0000-0000-000000000001'::uuid,'Pareja 1'),
 ('00000000-0000-0000-0000-000000000002'::uuid,'Pareja 2'),
 ('00000000-0000-0000-0000-000000000003'::uuid,'Pareja 3'),
 ('00000000-0000-0000-0000-000000000004'::uuid,'Pareja 4')
) AS p(id,tag);
-- Fixture completo (4 parejas, 6 encuentros); orden inequívoco P1,P2,P3,P4.
INSERT INTO public.bp_league_matches(tournament_id,pair1_id,pair2_id,
  match_number,round_number,leg,match_status,sets,sets_pair1,sets_pair2,winner_pair_id)
SELECT '00000000-0000-0000-0000-000000000101'::uuid,p1,p2,n,round_no,1,
  'played','[[6,0],[6,0]]'::jsonb,2,0,p1
FROM (VALUES
 (1,1,'00000000-0000-0000-0000-000000000001'::uuid,'00000000-0000-0000-0000-000000000002'::uuid),
 (2,1,'00000000-0000-0000-0000-000000000001'::uuid,'00000000-0000-0000-0000-000000000003'::uuid),
 (3,1,'00000000-0000-0000-0000-000000000001'::uuid,'00000000-0000-0000-0000-000000000004'::uuid),
 (4,2,'00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000003'::uuid),
 (5,2,'00000000-0000-0000-0000-000000000002'::uuid,'00000000-0000-0000-0000-000000000004'::uuid),
 (6,3,'00000000-0000-0000-0000-000000000003'::uuid,'00000000-0000-0000-0000-000000000004'::uuid)
) AS m(n,round_no,p1,p2);

-- Reserva independiente para verificar que no se pierde al borrar la Liga.
INSERT INTO public.reservations(court_id,starts_at,ends_at,status)
VALUES ('30000000-0000-0000-0000-000000000001',
  '2027-01-02 17:00+00','2027-01-02 18:30+00','confirmed');

DO $test$
DECLARE
 t uuid:='00000000-0000-0000-0000-000000000101';
 p1 uuid:='00000000-0000-0000-0000-000000000001';
 p2 uuid:='00000000-0000-0000-0000-000000000002';
 p3 uuid:='00000000-0000-0000-0000-000000000003';
 p4 uuid:='00000000-0000-0000-0000-000000000004';
 sf1 public.bp_league_final_matches%ROWTYPE;
 sf2 public.bp_league_final_matches%ROWTYPE;
 fin public.bp_league_final_matches%ROWTYPE;
 j jsonb;
 n integer;
BEGIN
  IF has_table_privilege('anon','public.bp_league_final_matches','SELECT')
  OR NOT has_table_privilege('authenticated','public.bp_league_final_matches','SELECT')
  OR has_function_privilege('anon','public.bp_league_prepare_final89(uuid)','EXECUTE')
  OR has_function_privilege('anon','public.bp_league_final_save_result89(uuid,jsonb)','EXECUTE')
  OR has_function_privilege('anon','public.bp_admin_tournament_delete_preview(uuid)','EXECUTE')
  OR has_function_privilege('anon','public.bp_admin_delete_tournament_safely(uuid,text)','EXECUTE')
  OR NOT has_function_privilege('authenticated','public.bp_admin_tournament_delete_preview(uuid)','EXECUTE')
  OR NOT has_function_privilege('authenticated','public.bp_admin_delete_tournament_safely(uuid,text)','EXECUTE')
  OR NOT has_function_privilege('anon','public.bp_public_league_final89(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Permisos de roles incorrectos';
  END IF;

  PERFORM set_config('app.test_admin','off',false);
  BEGIN
    PERFORM public.bp_league_prepare_final89(t);
    RAISE EXCEPTION 'ERROR: un no-admin generó semifinales';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('app.test_admin','on',false);

  j:=public.bp_league_prepare_final89(t);
  IF j->>'created'<>'true' THEN RAISE EXCEPTION 'No se generaron las semifinales'; END IF;
  SELECT * INTO sf1 FROM public.bp_league_final_matches
    WHERE tournament_id=t AND stage='semifinal' AND slot=1;
  SELECT * INTO sf2 FROM public.bp_league_final_matches
    WHERE tournament_id=t AND stage='semifinal' AND slot=2;
  SELECT * INTO fin FROM public.bp_league_final_matches
    WHERE tournament_id=t AND stage='final' AND slot=1;
  IF sf1.pair1_id<>p1 OR sf1.pair2_id<>p3
    OR sf2.pair1_id<>p2 OR sf2.pair2_id<>p4
    OR fin.pair1_id IS NOT NULL OR fin.pair2_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cruces 1-3 / 2-4 y final no coinciden';
  END IF;

  BEGIN
    UPDATE public.bp_tournaments SET status='completed' WHERE id=t;
    RAISE EXCEPTION 'ERROR: cierre prematuro permitido';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.bp_league_matches(tournament_id,pair1_id,pair2_id,match_number)
    VALUES (t,p1,p2,7);
    RAISE EXCEPTION 'ERROR: alta irregular tras semifinales';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.bp_league_matches SET sets='[[6,1],[6,1]]'::jsonb
    WHERE tournament_id=t AND match_number=1;
    RAISE EXCEPTION 'ERROR: modificación resultado regular';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.bp_league_matches SET pair2_id=p4
    WHERE tournament_id=t AND match_number=1;
    RAISE EXCEPTION 'ERROR: modificación de fixture regular';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.bp_league_prepare_final89(t);
    RAISE EXCEPTION 'ERROR: se generaron semifinales duplicadas';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Programar semifinales y final antes de conocer los finalistas.
  PERFORM public.bp_league_final_schedule89(sf1.id,'2027-01-02 09:00+00',90,'Cancha 1');
  BEGIN
    PERFORM public.bp_league_final_schedule89(sf2.id,'2027-01-02 09:30+00',90,'Cancha 1');
    RAISE EXCEPTION 'ERROR: superposición de partidos permitida';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM public.bp_league_final_schedule89(sf2.id,'2027-01-02 11:00+00',120,'Cancha 1');
  BEGIN
    PERFORM public.bp_league_final_schedule89(fin.id,'2027-01-02 17:30+00',90,'Cancha 1');
    RAISE EXCEPTION 'ERROR: superposición con reserva permitida';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM public.bp_league_final_schedule89(fin.id,'2027-01-02 14:00+00',90,'Cancha 1');
  SELECT count(*) INTO n FROM public.blockouts
    WHERE tournament_league_final_match_id IS NOT NULL AND active;
  IF n<>3 THEN RAISE EXCEPTION 'Se esperaban tres bloqueos activos, hay %',n; END IF;

  -- Postergar / reprogramar y no dejar bloqueos huérfanos.
  PERFORM public.bp_league_final_schedule89(sf2.id,NULL,NULL,NULL);
  SELECT count(*) INTO n FROM public.blockouts WHERE tournament_league_final_match_id=sf2.id;
  IF n<>0 THEN RAISE EXCEPTION 'Postergación no liberó bloqueo'; END IF;
  PERFORM public.bp_league_final_schedule89(sf2.id,'2027-01-02 11:00+00',120,'Cancha 1');

  -- La final puede estar programada, pero no puede jugarse sin dos ganadores.
  BEGIN
    PERFORM public.bp_league_final_save_result89(fin.id,'[[6,1],[6,2]]'::jsonb);
    RAISE EXCEPTION 'ERROR: final sin semifinales permitida';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  PERFORM public.bp_league_final_save_result89(sf1.id,'[[6,2],[6,3]]'::jsonb);
  SELECT * INTO fin FROM public.bp_league_final_matches WHERE id=fin.id;
  IF fin.pair1_id IS NOT NULL OR fin.pair2_id IS NOT NULL THEN
    RAISE EXCEPTION 'La final no puede tener un solo participante';
  END IF;
  PERFORM public.bp_league_final_save_result89(sf2.id,'[[6,1],[4,6],[6,3]]'::jsonb);
  SELECT * INTO fin FROM public.bp_league_final_matches WHERE id=fin.id;
  IF fin.pair1_id<>p1 OR fin.pair2_id<>p2 OR fin.schedule_status<>'scheduled' THEN
    RAISE EXCEPTION 'Finalistas equivocados o se perdió la programación final';
  END IF;
  PERFORM public.bp_league_final_save_result89(fin.id,'[[6,1],[4,6],[7,5]]'::jsonb);
  UPDATE public.bp_tournaments SET status='completed' WHERE id=t;

  j:=public.bp_public_league_final89(t);
  IF j->>'champion_pair_id'<>p1::text
    OR j->>'runner_up_pair_id'<>p2::text
    OR jsonb_array_length(j->'matches')<>3
    OR j::text LIKE '%contact_phone%' THEN
    RAISE EXCEPTION 'Publicación de final/campeón incorrecta';
  END IF;
  SELECT count(*) INTO n FROM public.bp_league_matches WHERE tournament_id=t;
  IF n<>6 THEN RAISE EXCEPTION 'Se alteraron los seis partidos regulares'; END IF;
  RAISE NOTICE 'P89: generación, permisos, clasificación, bloqueos, resultados, cierre y lectura pública: OK';

  j:=public.bp_admin_tournament_delete_preview(t);
  IF (j->>'league_matches')::int<>6 OR
     (j->>'league_final_matches')::int<>3 OR
     (j->>'linked_blockouts')::int<>3 THEN
    RAISE EXCEPTION 'Vista previa de borrado incorrecta: %',j;
  END IF;
  PERFORM set_config('app.test_delete_allowed','on',false);
  j:=public.bp_admin_delete_tournament_safely(t,'Liga de ensayo P89');
  IF j->>'deleted'<>'true' THEN RAISE EXCEPTION 'No se completó borrado'; END IF;
  IF EXISTS(SELECT 1 FROM public.bp_tournaments WHERE id=t) OR
    EXISTS(SELECT 1 FROM public.bp_league_final_matches WHERE tournament_id=t) OR
    EXISTS(SELECT 1 FROM public.bp_league_matches WHERE tournament_id=t) THEN
    RAISE EXCEPTION 'Borrado no eliminó exclusivamente la Liga de ensayo';
  END IF;
  SELECT count(*) INTO n FROM public.reservations WHERE status='confirmed'
    AND court_id='30000000-0000-0000-0000-000000000001'::uuid;
  IF n<>1 THEN RAISE EXCEPTION 'Borrado alteró las reservas independientes'; END IF;
  RAISE NOTICE 'P89: vista previa y eliminación íntegra sin reservas afectadas: OK';
END;
$test$;

-- Prueba de función pública como rol anónimo real, en sesión nueva de permisos.
SET ROLE anon;
SELECT CASE WHEN public.bp_public_league_final89(
  '00000000-0000-0000-0000-000000000101'::uuid) IS NULL
THEN 'P89: RPC pública como anon: OK' ELSE 'ERROR' END AS public_check;
RESET ROLE;
