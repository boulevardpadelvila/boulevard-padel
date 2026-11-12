-- Ensayo DB de seis parejas ficticias. Solo PostgreSQL descartable CI.
SELECT public.bp_ko26_prepare(
 '00000000-0000-4000-8000-000000000100'::uuid,
 '{"pairs":6,"qualifiers":4,"base":4,"preCount":0,"rounds":[
 {"stage":"preliminary","matches":[]},
 {"stage":"semifinal","matches":[
  {"code":"R1-1","pair":["1° A","2° B"]},
  {"code":"R1-2","pair":["2° A","1° B"]}
 ]},
 {"stage":"final","matches":[
  {"code":"R2-1","pair":["Ganador R1-1","Ganador R1-2"]}
 ]}
 ]}'::jsonb,
 '[
 {"group":1,"rank":1,"pair_id":"00000000-0000-4000-8000-000000000001"},
 {"group":1,"rank":2,"pair_id":"00000000-0000-4000-8000-000000000002"},
 {"group":2,"rank":1,"pair_id":"00000000-0000-4000-8000-000000000004"},
 {"group":2,"rank":2,"pair_id":"00000000-0000-4000-8000-000000000005"}
 ]'::jsonb,
 NULL
);
DO $smoke$
DECLARE v_a uuid;v_b uuid;v_f uuid;v_public jsonb;
BEGIN
 IF (SELECT count(*) FROM public.bp_ko26_matches
      WHERE tournament_id='00000000-0000-4000-8000-000000000100')<>3
 THEN RAISE EXCEPTION 'No se crearon exactamente dos semifinales y final.'; END IF;
 SELECT id INTO v_a FROM public.bp_ko26_matches WHERE code='R1-1';
 SELECT id INTO v_b FROM public.bp_ko26_matches WHERE code='R1-2';
 SELECT id INTO v_f FROM public.bp_ko26_matches WHERE code='R2-1';
 IF (SELECT pair1_id FROM public.bp_ko26_matches WHERE id=v_f) IS NOT NULL THEN
   RAISE EXCEPTION 'Final no debe tener rival todavía.'; END IF;
 PERFORM public.bp_ko26_save_result(v_a,'[[6,3],[6,4]]'::jsonb);
 IF (SELECT pair1_id FROM public.bp_ko26_matches WHERE id=v_f)
  <> '00000000-0000-4000-8000-000000000001'::uuid THEN
   RAISE EXCEPTION 'Ganador semifinal 1 no llegó a la final.'; END IF;
 PERFORM public.bp_ko26_save_result(v_b,'[[7,5],[4,6],[6,2]]'::jsonb);
 IF (SELECT pair2_id FROM public.bp_ko26_matches WHERE id=v_f)
  <> '00000000-0000-4000-8000-000000000002'::uuid THEN
   RAISE EXCEPTION 'Ganador semifinal 2 no llegó a la final.'; END IF;
 BEGIN
   PERFORM public.bp_ko26_save_result(v_f,'[[6,2],[3,6],[10,8]]'::jsonb);
   RAISE EXCEPTION 'No rechazó un súper tie-break en la final';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 PERFORM public.bp_ko26_save_result(v_f,'[[6,4],[3,6],[7,5]]'::jsonb);
 IF (SELECT winner_pair_id FROM public.bp_ko26_matches WHERE id=v_f)
  <> '00000000-0000-4000-8000-000000000001'::uuid THEN
   RAISE EXCEPTION 'Campeón incorrecto.'; END IF;
 v_public:=public.bp_public_ko26('00000000-0000-4000-8000-000000000100');
 IF jsonb_array_length(v_public->'matches')<>3
 THEN RAISE EXCEPTION 'Seguimiento público incompleto.'; END IF;
 IF v_public::text ~* '(phone|email|contact_phone)' THEN
   RAISE EXCEPTION 'Campos sensibles en seguimiento público.'; END IF;
 IF (SELECT count(*) FROM public.bp_ko26_revisions)<>3 THEN
   RAISE EXCEPTION 'No existe bitácora de resultados.'; END IF;
END
$smoke$;
DO $security$
BEGIN
 IF has_function_privilege('anon','public.bp_ko26_prepare(uuid,jsonb,jsonb,text)','EXECUTE')
 OR has_function_privilege('anon','public.bp_ko26_save_result(uuid,jsonb)','EXECUTE')
 OR NOT has_function_privilege('anon','public.bp_public_ko26(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Permisos de RPC incorrectos.'; END IF;
END
$security$;
