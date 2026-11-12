-- Boulevard Pádel · SQL93 · Guardián de horarios KO26 (BORRADOR).
-- APLICAR SOLO después de pruebas de PostgreSQL 17 y control de datos reales.
-- Amplía la vinculación a partidos generalizados sin alterar bloqueos existentes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';

ALTER TABLE public.blockouts ADD COLUMN tournament_ko26_match_id uuid;
ALTER TABLE public.blockouts
 ADD CONSTRAINT blockouts_tournament_ko26_match_id_fkey
 FOREIGN KEY(tournament_ko26_match_id) REFERENCES public.bp_ko26_matches(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX bp_ko26_blockout_unique ON public.blockouts(tournament_ko26_match_id)
 WHERE tournament_ko26_match_id IS NOT NULL;

ALTER TABLE public.blockouts DROP CONSTRAINT bp_blockout_one_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_one_match
 CHECK(num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
 tournament_league_match_id,tournament_league_final_match_id,tournament_ko26_match_id)<=1);
ALTER TABLE public.blockouts DROP CONSTRAINT bp_blockout_tournament_type_valid;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_tournament_type_valid
 CHECK(num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
 tournament_league_match_id,tournament_league_final_match_id,tournament_ko26_match_id)=0
 OR block_type='tournament'::public.block_type);
ALTER TABLE public.blockouts DROP CONSTRAINT bp_tournament_blockout_requires_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_tournament_blockout_requires_match
 CHECK(block_type<>'tournament'::public.block_type
 OR num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
 tournament_league_match_id,tournament_league_final_match_id,tournament_ko26_match_id)=1);

-- Reemplazo conservador de la función vigente: mantiene íntegros todos los
-- casos antiguos; agrega solo la quinta referencia de partido generalizado.
CREATE OR REPLACE FUNCTION public.bp_tournament_blockout_integrity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_match record;
BEGIN
  IF TG_OP='DELETE' AND (
    EXISTS (SELECT 1 FROM public.bp_tournament_group_matches m
      WHERE m.id=OLD.tournament_group_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id))
    OR EXISTS (SELECT 1 FROM public.bp_tournament_knockout_matches m
      WHERE m.id=OLD.tournament_knockout_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id))
    OR EXISTS (SELECT 1 FROM public.bp_league_matches m
      WHERE m.id=OLD.tournament_league_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id))
    OR EXISTS (SELECT 1 FROM public.bp_league_final_matches m
      WHERE m.id=OLD.tournament_league_final_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id))
    OR EXISTS (SELECT 1 FROM public.bp_ko26_matches m
      WHERE m.id=OLD.tournament_ko26_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id))
  ) THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' THEN
    IF OLD.active AND num_nonnulls(OLD.tournament_group_match_id,
      OLD.tournament_knockout_match_id,OLD.tournament_league_match_id,
      OLD.tournament_league_final_match_id,OLD.tournament_ko26_match_id)>0 THEN
      RAISE EXCEPTION 'No se puede borrar un bloqueo activo de partido.'
        USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND (
    (OLD.tournament_group_match_id IS NOT NULL AND
      NEW.tournament_group_match_id IS DISTINCT FROM OLD.tournament_group_match_id)
    OR (OLD.tournament_knockout_match_id IS NOT NULL AND
      NEW.tournament_knockout_match_id IS DISTINCT FROM OLD.tournament_knockout_match_id)
    OR (OLD.tournament_league_match_id IS NOT NULL AND
      NEW.tournament_league_match_id IS DISTINCT FROM OLD.tournament_league_match_id)
    OR (OLD.tournament_league_final_match_id IS NOT NULL AND
      NEW.tournament_league_final_match_id IS DISTINCT FROM OLD.tournament_league_final_match_id)
    OR (OLD.tournament_ko26_match_id IS NOT NULL AND
      NEW.tournament_ko26_match_id IS DISTINCT FROM OLD.tournament_ko26_match_id)
  ) THEN
    RAISE EXCEPTION 'No se puede desvincular el bloqueo de su partido.'
      USING ERRCODE='23514';
  END IF;
  IF NEW.block_type='tournament'::public.block_type THEN
    IF num_nonnulls(NEW.tournament_group_match_id,
      NEW.tournament_knockout_match_id,NEW.tournament_league_match_id,
      NEW.tournament_league_final_match_id,NEW.tournament_ko26_match_id)<>1 THEN
      RAISE EXCEPTION 'El bloqueo de torneo debe pertenecer a un solo partido.'
        USING ERRCODE='23514';
    END IF;
    IF NEW.tournament_group_match_id IS NOT NULL THEN
      SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
        FROM public.bp_tournament_group_matches m WHERE m.id=NEW.tournament_group_match_id;
    ELSIF NEW.tournament_knockout_match_id IS NOT NULL THEN
      SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
        FROM public.bp_tournament_knockout_matches m WHERE m.id=NEW.tournament_knockout_match_id;
    ELSIF NEW.tournament_league_match_id IS NOT NULL THEN
      SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
        FROM public.bp_league_matches m WHERE m.id=NEW.tournament_league_match_id;
    ELSIF NEW.tournament_ko26_match_id IS NOT NULL THEN
      SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
        FROM public.bp_ko26_matches m WHERE m.id=NEW.tournament_ko26_match_id;
    ELSE
      SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
        FROM public.bp_league_final_matches m WHERE m.id=NEW.tournament_league_final_match_id;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El bloqueo de torneo debe corresponder a un partido.'
        USING ERRCODE='23514';
    END IF;
    IF v_match.schedule_status='scheduled' THEN
      IF NOT NEW.active OR NEW.starts_at IS DISTINCT FROM v_match.scheduled_at
        OR NEW.ends_at IS DISTINCT FROM v_match.scheduled_ends_at THEN
        RAISE EXCEPTION 'El bloqueo debe coincidir con la programación del partido.'
          USING ERRCODE='23514';
      END IF;
    ELSIF NEW.active THEN
      RAISE EXCEPTION 'Un partido sin programar no puede ocupar la cancha.'
        USING ERRCODE='23514';
    END IF;
  ELSIF num_nonnulls(NEW.tournament_group_match_id,
    NEW.tournament_knockout_match_id,NEW.tournament_league_match_id,
    NEW.tournament_league_final_match_id,NEW.tournament_ko26_match_id)>0 THEN
    RAISE EXCEPTION 'Los bloqueos de partidos deben ser del tipo torneo.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.bp_ko26_schedule(
 p_match_id uuid,p_start timestamptz,p_duration_minutes integer,
 p_action text DEFAULT 'schedule'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $ko26schedule$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_m public.bp_ko26_matches%ROWTYPE;
 v_court uuid;v_block uuid;v_end timestamptz;v_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false)
 THEN RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501'; END IF;
 SELECT t.* INTO v_t FROM public.bp_tournaments t
 JOIN public.bp_ko26_matches m ON m.tournament_id=t.id
 WHERE m.id=p_match_id FOR UPDATE OF t;
 IF NOT FOUND OR v_t.status='completed'
 THEN RAISE EXCEPTION 'Torneo inexistente o cerrado.' USING ERRCODE='23514'; END IF;
 SELECT * INTO v_m FROM public.bp_ko26_matches WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND OR v_m.match_status<>'pending'
 THEN RAISE EXCEPTION 'No se puede programar un partido ya disputado.'
  USING ERRCODE='23514'; END IF;
 IF p_action NOT IN('schedule','postpone','clear') OR p_action IS NULL
 THEN RAISE EXCEPTION 'Acción de programación inválida.' USING ERRCODE='22023'; END IF;
 IF p_action='postpone' AND v_m.schedule_status<>'scheduled'
 THEN RAISE EXCEPTION 'El partido no estaba programado.' USING ERRCODE='23514'; END IF;
 IF p_action='schedule' THEN
   IF p_start IS NULL OR p_start<=now() OR p_duration_minutes NOT IN(90,120)
   THEN RAISE EXCEPTION 'Indicá fecha futura y duración 90 o 120 minutos.'
    USING ERRCODE='23514'; END IF;
   v_end:=p_start+make_interval(mins=>p_duration_minutes);
   SELECT c.id INTO v_court FROM public.courts c
     WHERE c.active ORDER BY c.created_at LIMIT 1;
   IF v_court IS NULL THEN RAISE EXCEPTION 'No hay cancha activa.'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(v_court::text,72119));
   SELECT id INTO v_block FROM public.blockouts
    WHERE tournament_ko26_match_id=p_match_id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.reservations r
      WHERE r.court_id=v_court AND r.status<>'cancelled'
      AND r.starts_at<v_end AND r.ends_at>p_start)
   THEN RAISE EXCEPTION 'Existe una reserva vigente en ese horario.'
    USING ERRCODE='23514'; END IF;
   IF EXISTS(SELECT 1 FROM public.blockouts b WHERE b.court_id=v_court
      AND b.active AND b.id IS DISTINCT FROM v_block
      AND b.starts_at<v_end AND b.ends_at>p_start)
   THEN RAISE EXCEPTION 'La cancha ya está bloqueada en ese horario.'
    USING ERRCODE='23514'; END IF;
   UPDATE public.bp_ko26_matches SET schedule_status='scheduled',
     scheduled_at=p_start,scheduled_ends_at=v_end,updated_at=now()
   WHERE id=p_match_id;
   IF v_block IS NULL THEN
     INSERT INTO public.blockouts(
       court_id,starts_at,ends_at,active,block_type,reason,
       tournament_ko26_match_id,created_by)
     VALUES(v_court,p_start,v_end,true,'tournament'::public.block_type,
       'Partido de eliminatorias',p_match_id,auth.uid());
   ELSE
     UPDATE public.blockouts SET court_id=v_court,starts_at=p_start,ends_at=v_end,
       active=true,block_type='tournament'::public.block_type,
       reason='Partido de eliminatorias' WHERE id=v_block;
   END IF;
   v_status:='scheduled';
 ELSE
   UPDATE public.bp_ko26_matches SET schedule_status=CASE WHEN p_action='postpone'
     THEN 'postponed' ELSE 'unscheduled' END,
     scheduled_at=NULL,scheduled_ends_at=NULL,updated_at=now()
   WHERE id=p_match_id;
   UPDATE public.blockouts SET active=false
    WHERE tournament_ko26_match_id=p_match_id AND active;
   v_status:=CASE WHEN p_action='postpone' THEN 'postponed' ELSE 'unscheduled' END;
 END IF;
 RETURN jsonb_build_object('match_id',p_match_id,'schedule_status',v_status,
   'scheduled_at',CASE WHEN v_status='scheduled' THEN p_start ELSE NULL END);
END;
$ko26schedule$;
REVOKE ALL ON FUNCTION public.bp_ko26_schedule(uuid,timestamptz,integer,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko26_schedule(uuid,timestamptz,integer,text)
 TO authenticated;
COMMIT;
