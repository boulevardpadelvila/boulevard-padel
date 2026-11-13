-- Tres operaciones: programar, impedir colisión y postergar; sin tocar reservas/fijos.
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
DO $$ DECLARE v_match uuid;v_start timestamptz;v_report jsonb;v_block uuid;
BEGIN
 SELECT m.id INTO v_match FROM public.bp_tournament_bracket_matches2026 m
 WHERE m.tournament_id='00000000-0000-4000-8000-000000000006' ORDER BY m.stage,m.slot LIMIT 1;
 v_start:=((current_date+3)::timestamp+interval '18 hours') AT TIME ZONE 'America/Argentina/Cordoba';
 PERFORM public.bp_tournament_schedule_bracket_match2026(v_match,v_start,90,NULL);
 SELECT s.blockout_id INTO v_block FROM public.bp_tournament_bracket_schedule2026 s WHERE s.match_id=v_match;
 IF v_block IS NULL OR (SELECT count(*) FROM public.blockouts WHERE id=v_block AND active)<>1 THEN
   RAISE EXCEPTION 'No se creó bloqueo de turno';END IF;
 -- Reprogramar debe conservar el mismo bloqueo.
 PERFORM public.bp_tournament_schedule_bracket_match2026(v_match,v_start+interval '30 minutes',120,NULL);
 IF (SELECT blockout_id FROM public.bp_tournament_bracket_schedule2026 WHERE match_id=v_match)<>v_block THEN
   RAISE EXCEPTION 'Se duplicó bloqueo';END IF;
 -- Una segunda eliminatoria no puede ocupar la misma cancha ni solaparse.
 BEGIN
   PERFORM public.bp_tournament_schedule_bracket_match2026(
    (SELECT m.id FROM public.bp_tournament_bracket_matches2026 m
     WHERE m.tournament_id='00000000-0000-4000-8000-000000000006' AND m.id<>v_match ORDER BY m.stage,m.slot LIMIT 1),
    v_start+interval '60 minutes',90,NULL);
   RAISE EXCEPTION 'Se permitió superposición de partidos';
 EXCEPTION WHEN check_violation THEN NULL; END;
 v_report:=public.bp_tournament_bracket_report2026('00000000-0000-4000-8000-000000000006');
 IF v_report IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_report->'matches') m
 WHERE m->>'schedule_status'='scheduled') THEN RAISE EXCEPTION 'Reporte no informa programación';END IF;
 PERFORM public.bp_tournament_schedule_bracket_match2026(v_match,NULL,NULL,NULL);
 IF EXISTS(SELECT 1 FROM public.blockouts WHERE id=v_block) OR
    (SELECT schedule_status FROM public.bp_tournament_bracket_schedule2026 WHERE match_id=v_match)<>'postponed' THEN
   RAISE EXCEPTION 'Postergación no liberó cancha';END IF;
 -- Reservas ficticias intactas y sin modificaciones en turnos fijos.
 IF (SELECT count(*) FROM public.reservations)<>1 OR (SELECT count(*) FROM public.fixed_turn_requests)<>1 OR
    (SELECT count(*) FROM public.blockouts)<>1 THEN RAISE EXCEPTION 'Datos turnero alterados';END IF;
END $$;
-- Comprobar que el bloqueo eliminado no reaparece al borrar el torneo.
SELECT set_config('request.jwt.claim.sub','',false);
DO $$BEGIN
 BEGIN
   PERFORM public.bp_tournament_schedule_bracket_match2026(
      (SELECT id FROM public.bp_tournament_bracket_matches2026 LIMIT 1),now()+interval '2 days',90,NULL);
   RAISE EXCEPTION 'Acceso anónimo admitido';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'SQL92 OK: programación, conflicto, postergación, privacidad y reservas intactas' AS resultado;