-- P89 · Prueba de paridad posterior a la migración en BD DESCARTABLE.
-- Todos los registros son ficticios. No conecta a Supabase producción.
DO $checks$
DECLARE
  legacy_block uuid;
  v_message text;
BEGIN
 IF (SELECT count(*) FROM public.reservations
      WHERE court_id='e0000000-0000-0000-0000-000000000001')<>35
 OR (SELECT count(*) FROM public.fixed_turn_requests)<>4
 OR (SELECT count(*) FROM public.blockouts
      WHERE court_id='e0000000-0000-0000-0000-000000000001')<>39 THEN
   RAISE EXCEPTION 'Migración P89 alteró las reservas, fijos o bloqueos anteriores';
 END IF;
 IF (SELECT count(*) FROM public.reservations WHERE source='fixed')<>4
 OR (SELECT count(*) FROM public.reservations
     WHERE fixed_turn_request_id IS NOT NULL)<>4 THEN
   RAISE EXCEPTION 'Se perdió un vínculo de reserva a turno fijo';
 END IF;
 IF (SELECT count(*) FROM public.blockouts
       WHERE tournament_group_match_id IS NOT NULL AND active)<>35
 OR (SELECT count(*) FROM public.blockouts
       WHERE block_type='manual' AND NOT active)<>4 THEN
   RAISE EXCEPTION 'Se perdieron bloqueos antiguos de torneos o manuales';
 END IF;
 SELECT b.id INTO legacy_block FROM public.blockouts b
 WHERE b.tournament_group_match_id IS NOT NULL AND b.active LIMIT 1;

 BEGIN
   UPDATE public.blockouts
     SET starts_at=starts_at+interval '5 minutes'
     WHERE id=legacy_block;
   RAISE EXCEPTION 'El bloqueo antiguo fue desincronizado sin rechazo';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 BEGIN
   DELETE FROM public.blockouts WHERE id=legacy_block;
   RAISE EXCEPTION 'Un bloqueo activo anterior se eliminó sin autorización';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 BEGIN
   INSERT INTO public.reservations(court_id,starts_at,ends_at,status)
   SELECT b.court_id,b.starts_at,b.ends_at,'confirmed'
   FROM public.blockouts b WHERE b.id=legacy_block;
   RAISE EXCEPTION 'El turnero permitió reservar sobre un bloqueo anterior';
 EXCEPTION WHEN raise_exception THEN
   GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
   IF v_message<>'El horario seleccionado está bloqueado' THEN RAISE; END IF;
 END;

 IF (SELECT count(*) FROM public.reservations
      WHERE court_id='e0000000-0000-0000-0000-000000000001')<>35 THEN
   RAISE EXCEPTION 'La prueba de rechazo de reserva dejó filas nuevas';
 END IF;
 RAISE NOTICE 'P89 PARIDAD POST-MIGRACION OK: 35 reservas, 4 fijos, 39 bloqueos intactos';
END;
$checks$;
