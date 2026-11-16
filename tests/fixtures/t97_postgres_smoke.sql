-- SQL97: simular un error real de republicación sin conectar a producción.
SET client_min_messages TO warning;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
DO $t97$
DECLARE
 v_t uuid:='00000000-0000-4000-8000-000000000018'::uuid;
 v_plan jsonb;
 v_result jsonb;
 v_old_match uuid;
 v_previous_count int;
BEGIN
 IF (SELECT count(*) FROM public.bp_tournament_bracket_templates2026)<>35 THEN
   RAISE EXCEPTION 'Deben existir 35 llaves PDF protegidas';
 END IF;
 SELECT plan INTO v_plan FROM public._t90_plans WHERE n=18;
 IF v_plan->'preliminariesMatches' IS DISTINCT FROM
      (SELECT template->'preliminariesMatches' FROM public.bp_tournament_bracket_templates2026 WHERE pairs=18)
 THEN RAISE EXCEPTION 'El plan de 18 no coincide con el PDF'; END IF;
 -- Re-publicación idéntica: conserva los IDs de los partidos.
 SELECT id INTO v_old_match FROM public.bp_tournament_bracket_matches2026
   WHERE tournament_id=v_t AND stage=0 AND slot=1;
 UPDATE public.bp_tournaments SET fixture_published_at=NULL WHERE id=v_t;
 SELECT public.bp_tournament_publish_fixture2026(v_t,v_plan) INTO v_result;
 IF v_result->>'reused_existing_bracket' IS DISTINCT FROM 'true'
  OR (SELECT id FROM public.bp_tournament_bracket_matches2026
     WHERE tournament_id=v_t AND stage=0 AND slot=1)<>v_old_match THEN
   RAISE EXCEPTION 'La republicación sin cambios debe conservar los IDs';
 END IF;
 IF (SELECT count(*) FROM public.bp_tournament_bracket_revisions2026)<>0 THEN
   RAISE EXCEPTION 'Reutilizar no debe crear auditorías de reemplazo';
 END IF;
 -- Simular la llave anterior INCORRECTA que se quiere corregir.
 UPDATE public.bp_tournament_brackets2026
 SET plan=jsonb_set(v_plan,'{preliminariesMatches,0}', '["1° E","1° F"]'::jsonb)
 WHERE tournament_id=v_t;
 UPDATE public.bp_tournaments SET fixture_published_at=NULL WHERE id=v_t;
 SELECT public.bp_tournament_publish_fixture2026(v_t,v_plan) INTO v_result;
 IF (SELECT count(*) FROM public.bp_tournament_bracket_revisions2026 WHERE tournament_id=v_t)<>1
    OR (SELECT id FROM public.bp_tournament_bracket_matches2026
       WHERE tournament_id=v_t AND stage=0 AND slot=1)=v_old_match THEN
   RAISE EXCEPTION 'Debe registrarse y reemplazarse la llave vieja, sin perder participantes';
 END IF;
 IF (SELECT count(*) FROM public.bp_tournament_bracket_matches2026 WHERE tournament_id=v_t)<>11 THEN
   RAISE EXCEPTION 'El torneo de 18 debe seguir con 11 cruces eliminatorios';
 END IF;
 IF (SELECT count(*) FROM public.reservations)<>1
    OR (SELECT count(*) FROM public.fixed_turn_requests)<>1
    OR (SELECT count(*) FROM public.blockouts)<>1 THEN
   RAISE EXCEPTION 'La operación alteró el turnero';
 END IF;
 -- La llave entregada por un cliente no puede desviarse del PDF.
 UPDATE public.bp_tournaments SET fixture_published_at=NULL WHERE id=v_t;
 BEGIN
   PERFORM public.bp_tournament_publish_fixture2026(
     v_t,jsonb_set(v_plan,'{preliminariesMatches,0}', '["1° E","1° F"]'::jsonb));
   RAISE EXCEPTION 'Se aceptó una previa que no coincide con el PDF';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 -- Proteger posiciones confirmadas contra sustitución automática.
 UPDATE public.bp_tournament_brackets2026
 SET plan=jsonb_set(v_plan,'{preliminariesMatches,0}', '["1° E","1° F"]'::jsonb),
     placements='{}'::jsonb
 WHERE tournament_id=v_t;
 BEGIN
   PERFORM public.bp_tournament_publish_fixture2026(v_t,v_plan);
   RAISE EXCEPTION 'Se reemplazó una llave con posiciones existentes';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $t97$;
SELECT 'SQL97 OK: 35 plantillas; publicación, reemplazo y seguridad sin tocar reservas' AS resultado;
