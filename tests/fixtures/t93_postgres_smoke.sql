-- SQL93: en PostgreSQL 17 descartable, DESPUÉS del ensayo SQL90.
-- El bootstrap de SQL90 no contiene el trigger histórico: lo simulamos aquí.
CREATE TRIGGER bp_tournaments_sizes_3_4_guard_trg
BEFORE UPDATE OF groups_published_at ON public.bp_tournaments
FOR EACH ROW EXECUTE FUNCTION public.bp_tournament_validate_group_sizes_3_4();

DO $test$
DECLARE
  v_n int;
  v_t uuid;
  v_a uuid;
  v_target uuid;
  v_moved uuid;
  v_num int;
  v_caught boolean;
BEGIN
  -- Todas las distribuciones oficiales 6..40 deben poder publicar sus grupos.
  FOR v_n IN 6..40 LOOP
    v_t:=('00000000-0000-4000-8000-'||lpad(v_n::text,12,'0'))::uuid;
    UPDATE public.bp_tournaments SET groups_published_at=NULL WHERE id=v_t;
    UPDATE public.bp_tournaments SET groups_published_at=now() WHERE id=v_t;
    IF (SELECT groups_published_at IS NULL FROM public.bp_tournaments WHERE id=v_t) THEN
      RAISE EXCEPTION 'No publicó grupos válidos con % parejas.',v_n;
    END IF;
  END LOOP;

  -- Al mover una pareja de A(4) a B(3), 7 pasa a A3/B4: DEBE rechazar.
  -- Con 10 y 11 también se impide que una zona posterior tenga 4 primero.
  FOREACH v_n IN ARRAY ARRAY[7,10,11,14,40] LOOP
    v_t:=('00000000-0000-4000-8000-'||lpad(v_n::text,12,'0'))::uuid;
    UPDATE public.bp_tournaments SET groups_published_at=NULL WHERE id=v_t;
    SELECT id INTO v_a FROM public.bp_tournament_groups
      WHERE tournament_id=v_t AND group_number=1;
    SELECT id INTO v_target FROM public.bp_tournament_groups
      WHERE tournament_id=v_t AND group_number=CASE
        WHEN v_n=11 THEN 3 WHEN v_n=14 THEN 3 ELSE 2 END;
    SELECT pair_id INTO v_moved FROM public.bp_tournament_group_pairs
      WHERE tournament_id=v_t AND group_id=v_a ORDER BY pair_id LIMIT 1;
    UPDATE public.bp_tournament_group_pairs
      SET group_id=v_target WHERE tournament_id=v_t AND pair_id=v_moved;

    v_caught:=false;
    BEGIN
      UPDATE public.bp_tournaments SET groups_published_at=now() WHERE id=v_t;
    EXCEPTION WHEN check_violation THEN
      v_caught:=true;
      IF SQLERRM NOT LIKE '%grupos de 4 parejas deben ser los primeros%' THEN
        RAISE EXCEPTION 'Rechazo inesperado para %: %',v_n,SQLERRM;
      END IF;
    END;
    IF NOT v_caught OR (SELECT groups_published_at IS NOT NULL
       FROM public.bp_tournaments WHERE id=v_t) THEN
      RAISE EXCEPTION 'Se publicó una distribución de % parejas con zonas de cuatro fuera de orden',v_n;
    END IF;
  END LOOP;

  -- Incluso si se alteran los números de zona (B/C sin A), debe rechazarse.
  v_t:='00000000-0000-4000-8000-000000000006'::uuid;
  UPDATE public.bp_tournaments SET groups_published_at=NULL WHERE id=v_t;
  UPDATE public.bp_tournament_groups
     SET group_number=group_number+10 WHERE tournament_id=v_t;
  v_caught:=false;
  BEGIN
    UPDATE public.bp_tournaments SET groups_published_at=now() WHERE id=v_t;
  EXCEPTION WHEN check_violation THEN
    v_caught:=true;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'Aceptó grupos sin numeración desde A';
  END IF;

  -- La transición a privado se permite (revisión controlada del Admin).
  v_t:='00000000-0000-4000-8000-000000000008'::uuid;
  UPDATE public.bp_tournaments SET groups_published_at=NULL WHERE id=v_t;
  IF (SELECT groups_published_at IS NOT NULL FROM public.bp_tournaments WHERE id=v_t) THEN
    RAISE EXCEPTION 'No permitió retirar la publicación de grupos';
  END IF;

  IF (SELECT count(*) FROM public.reservations)<>1 OR
     (SELECT count(*) FROM public.fixed_turn_requests)<>1 OR
     (SELECT count(*) FROM public.blockouts)<>1 THEN
    RAISE EXCEPTION 'Se modificaron datos ficticios del turnero';
  END IF;
END;
$test$;

SELECT 'SQL93 OK: 35 publicaciones válidas, 5 órdenes invertidos rechazados, numeración y reservas preservadas.' AS resultado;
