-- RPC 2026 debe aceptar el tercer set normal, rechazar STB y bloquear anónimos.
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',false);
SELECT public.bp_league_save_result2026('cccccccc-cccc-4ccc-cccc-cccccccccccc',
 '[[6,3],[3,6],[6,4]]'::jsonb);
DO $$ BEGIN
 IF (SELECT sets_pair1 FROM public.bp_league_matches WHERE id='cccccccc-cccc-4ccc-cccc-cccccccccccc')<>2
    OR (SELECT sets_pair2 FROM public.bp_league_matches WHERE id='cccccccc-cccc-4ccc-cccc-cccccccccccc')<>1 THEN
   RAISE EXCEPTION 'Resultado 2-1 no guardado';END IF;
 BEGIN
   PERFORM public.bp_league_save_result2026('cccccccc-cccc-4ccc-cccc-cccccccccccc',
    '[[6,3],[3,6],[10,8]]'::jsonb);
   RAISE EXCEPTION 'Se permitió STB en Liga';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','',false);
DO $$ BEGIN
 BEGIN
   PERFORM public.bp_league_save_result2026('cccccccc-cccc-4ccc-cccc-cccccccccccc',
    '[[6,3],[6,3]]'::jsonb);
   RAISE EXCEPTION 'Se permitió operación anónima';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.reservations)<>1 OR
 (SELECT count(*) FROM public.fixed_turn_requests)<>1 OR
 (SELECT count(*) FROM public.blockouts)<>1 THEN
 RAISE EXCEPTION 'Datos del turnero modificados';END IF;
END $$;
SELECT 'SQL91 OK: normales sí, STB no, permisos y turnero intacto' AS resultado;