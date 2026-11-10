-- Boulevard Pádel · P89 · Roles PostgreSQL reales, base descartable.
-- Simula contexto JWT con app.test_uid; NO es autenticación GoTrue.
-- Verifica privilegios y RLS usando SET ROLE authenticated / anon.
INSERT INTO public.bp_tournaments(id,name,format,status,is_published)
VALUES ('70000000-0000-0000-0000-000000000101',
        'Liga ficticia con roles','league','in_progress',true);
INSERT INTO public.bp_tournament_pairs
  (id,tournament_id,status,player1_name,player2_name)
SELECT ('70000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       '70000000-0000-0000-0000-000000000101'::uuid,
       'approved','Jugadora '||i,'Jugador '||i
FROM generate_series(1,4) AS i;

-- Fixture circular de 4 parejas, 6 partidos todos jugados.
INSERT INTO public.bp_league_matches(
  tournament_id,pair1_id,pair2_id,match_number,round_number,leg,
  match_status,sets,sets_pair1,sets_pair2,winner_pair_id)
SELECT '70000000-0000-0000-0000-000000000101'::uuid,
  ('70000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
  ('70000000-0000-0000-0000-'||lpad(j::text,12,'0'))::uuid,
  i*10+j,1,1,'played','[[6,2],[6,3]]'::jsonb,2,0,
  ('70000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid
FROM generate_series(1,4) i CROSS JOIN generate_series(1,4) j
WHERE i<j;

SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.test_admin','off',false);

SET ROLE authenticated;
DO $test$
DECLARE
  t uuid:='70000000-0000-0000-0000-000000000101';
  v_count int;
BEGIN
  IF auth.uid() IS NULL OR
      NOT has_function_privilege(current_user,
        'public.bp_league_prepare_final89(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'El contexto autenticado de ensayo no está habilitado';
  END IF;
  BEGIN
    PERFORM public.bp_league_prepare_final89(t);
    RAISE EXCEPTION 'ERROR: authenticated sin Admin generó semifinales'
      USING ERRCODE='22000';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO v_count
    FROM public.bp_league_final_matches WHERE tournament_id=t;
  IF v_count<>0 THEN
    RAISE EXCEPTION 'RLS: usuario sin Admin pudo leer fase final';
  END IF;
END;
$test$;
RESET ROLE;

SELECT set_config('app.test_admin','on',false);
SET ROLE authenticated;
DO $test$
DECLARE
  t uuid:='70000000-0000-0000-0000-000000000101';
  v_result jsonb;
  v_count int;
BEGIN
  v_result:=public.bp_league_prepare_final89(t);
  IF v_result->>'created'<>'true' THEN
    RAISE EXCEPTION 'Authenticated Admin no generó semifinales';
  END IF;
  SELECT count(*) INTO v_count
    FROM public.bp_league_final_matches WHERE tournament_id=t;
  IF v_count<>3 THEN
    RAISE EXCEPTION 'RLS: Auth Admin no ve los 3 partidos, vio %',v_count;
  END IF;
  IF NOT has_function_privilege(current_user,
    'public.bp_admin_delete_tournament_safely(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Se perdió permiso autenticado para RPC de borrado';
  END IF;
  RAISE NOTICE 'P89 ROLES: authenticated Admin crea y lee 3 finales; RLS OK';
END;
$test$;
RESET ROLE;

SET ROLE anon;
DO $test$
DECLARE
  t uuid:='70000000-0000-0000-0000-000000000101';
  v_result jsonb;
BEGIN
  IF has_function_privilege(current_user,
    'public.bp_league_prepare_final89(uuid)','EXECUTE')
    OR has_table_privilege(current_user,
      'public.bp_league_final_matches','SELECT') THEN
    RAISE EXCEPTION 'anon tiene permisos internos que no le corresponden';
  END IF;
  BEGIN
    PERFORM public.bp_league_prepare_final89(t);
    RAISE EXCEPTION 'ERROR: anon pudo invocar generación de semifinales'
      USING ERRCODE='22000';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  v_result:=public.bp_public_league_final89(t);
  IF v_result IS NULL OR
    jsonb_array_length(coalesce(v_result->'matches','[]'::jsonb))<>3 THEN
    RAISE EXCEPTION 'anon no pudo consultar la fase final publicada';
  END IF;
  IF v_result::text ~* 'contact_phone|customer_phone|email' THEN
    RAISE EXCEPTION 'El endpoint público expuso datos de contacto';
  END IF;
  RAISE NOTICE 'P89 ROLES: anon solo lectura pública sanitizada; RPC Admin prohibida';
END;
$test$;
RESET ROLE;

-- No se borra ningún dato de otras pruebas: la BD del runner se destruye.
