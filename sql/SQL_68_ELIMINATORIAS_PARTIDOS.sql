-- Boulevard Pádel · SQL 68 · fase final 7 parejas.
-- DEFINITIVA: guardar en editor SQL. No ejecutarla de nuevo si ya fue aplicada.
-- Tablas de torneo + extensión nullable al enlace de bloqueo de partido.
-- Conserva integridad y semántica del turnero y los bloqueos de grupos.
CREATE TABLE public.bp_tournament_knockout_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tournament_id uuid NOT NULL REFERENCES public.bp_tournament_knockout_brackets(tournament_id) ON DELETE CASCADE,
 stage text NOT NULL CHECK(stage IN ('quarterfinal','semifinal','final')),
 slot smallint NOT NULL,
 match_status text NOT NULL DEFAULT 'pending' CHECK(match_status IN ('pending','played')),
 schedule_status text NOT NULL DEFAULT 'unscheduled' CHECK(schedule_status IN ('unscheduled','scheduled','postponed')),
 scheduled_at timestamptz,
 scheduled_ends_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tournament_id,stage,slot),
 CHECK ((stage='quarterfinal' AND slot BETWEEN 1 AND 3)
   OR (stage='semifinal' AND slot BETWEEN 1 AND 2)
   OR (stage='final' AND slot=1)),
 CONSTRAINT bp_ko_match_schedule_valid CHECK (
   (schedule_status IN ('unscheduled','postponed') AND scheduled_at IS NULL AND scheduled_ends_at IS NULL)
   OR (schedule_status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_ends_at IS NOT NULL
       AND scheduled_ends_at-scheduled_at IN (interval '90 minutes',interval '120 minutes'))
 )
);
CREATE TABLE public.bp_tournament_knockout_results (
 match_id uuid PRIMARY KEY REFERENCES public.bp_tournament_knockout_matches(id) ON DELETE CASCADE,
 tournament_id uuid NOT NULL REFERENCES public.bp_tournament_knockout_brackets(tournament_id) ON DELETE CASCADE,
 sets jsonb NOT NULL,
 sets_pair1 smallint NOT NULL,
 sets_pair2 smallint NOT NULL,
 resolved_pair1_id uuid NOT NULL,
 resolved_pair2_id uuid NOT NULL,
 winner_pair_id uuid NOT NULL,
 created_by uuid NOT NULL,
 updated_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bp_tournament_knockout_result_revisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id uuid NOT NULL REFERENCES public.bp_tournament_knockout_matches(id) ON DELETE CASCADE,
 old_sets jsonb NOT NULL,new_sets jsonb NOT NULL,
 reason text NOT NULL,changed_by uuid NOT NULL,changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bp_tournament_knockout_schedule_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id uuid NOT NULL REFERENCES public.bp_tournament_knockout_matches(id) ON DELETE CASCADE,
 tournament_id uuid NOT NULL REFERENCES public.bp_tournament_knockout_brackets(tournament_id) ON DELETE CASCADE,
 operation text NOT NULL,old_status text NOT NULL,new_status text NOT NULL,
 old_start timestamptz,new_start timestamptz,old_end timestamptz,new_end timestamptz,
 reason text,changed_by uuid NOT NULL,changed_at timestamptz NOT NULL DEFAULT now()
);
DO $secure$
DECLARE r text;
BEGIN
 FOREACH r IN ARRAY ARRAY['bp_tournament_knockout_matches','bp_tournament_knockout_results',
  'bp_tournament_knockout_result_revisions','bp_tournament_knockout_schedule_history'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',r);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',r);
   EXECUTE format('GRANT SELECT ON public.%I TO authenticated',r);
   EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((SELECT public.bp_tournament_is_admin()))',r||'_admin_select',r);
 END LOOP;
END $secure$;

-- Integración de bloqueos de eliminación; exclusiva de torneos. Los bloqueos
-- generales y los de grupos conservan íntegramente su comportamiento anterior.
ALTER TABLE public.blockouts ADD COLUMN tournament_knockout_match_id uuid
 REFERENCES public.bp_tournament_knockout_matches(id) ON DELETE CASCADE;
ALTER TABLE public.blockouts DROP CONSTRAINT bp_blockout_tournament_type_valid;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_tournament_type_valid CHECK (
 (tournament_group_match_id IS NULL AND tournament_knockout_match_id IS NULL)
 OR block_type='tournament'::public.block_type);
ALTER TABLE public.blockouts DROP CONSTRAINT bp_tournament_blockout_requires_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_tournament_blockout_requires_match CHECK (
 block_type<>'tournament'::public.block_type
 OR num_nonnulls(tournament_group_match_id,tournament_knockout_match_id)=1);
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_one_match CHECK (
 num_nonnulls(tournament_group_match_id,tournament_knockout_match_id)<=1);
CREATE UNIQUE INDEX bp_ko_blockout_unique ON public.blockouts(tournament_knockout_match_id)
 WHERE tournament_knockout_match_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bp_tournament_blockout_integrity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $guard$
DECLARE v_match record;
BEGIN
 IF TG_OP='DELETE' THEN
   IF (OLD.tournament_group_match_id IS NOT NULL OR OLD.tournament_knockout_match_id IS NOT NULL)
      AND OLD.active THEN
     RAISE EXCEPTION 'No se puede borrar un bloqueo activo de partido.' USING ERRCODE='23514';
   END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND (
     (OLD.tournament_group_match_id IS NOT NULL AND
      NEW.tournament_group_match_id IS DISTINCT FROM OLD.tournament_group_match_id)
     OR (OLD.tournament_knockout_match_id IS NOT NULL AND
      NEW.tournament_knockout_match_id IS DISTINCT FROM OLD.tournament_knockout_match_id)) THEN
   RAISE EXCEPTION 'No se puede desvincular el bloqueo de su partido.' USING ERRCODE='23514';
 END IF;
 IF NEW.block_type='tournament'::public.block_type THEN
   IF num_nonnulls(NEW.tournament_group_match_id,NEW.tournament_knockout_match_id)<>1 THEN
     RAISE EXCEPTION 'El bloqueo de torneo debe pertenecer a un solo partido.' USING ERRCODE='23514';
   END IF;
   IF NEW.tournament_group_match_id IS NOT NULL THEN
     SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
     FROM public.bp_tournament_group_matches m WHERE m.id=NEW.tournament_group_match_id;
   ELSE
     SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
     FROM public.bp_tournament_knockout_matches m WHERE m.id=NEW.tournament_knockout_match_id;
   END IF;
   IF NOT FOUND THEN RAISE EXCEPTION 'El bloqueo de torneo debe corresponder a un partido.' USING ERRCODE='23514'; END IF;
   IF v_match.schedule_status='scheduled' THEN
     IF NOT NEW.active OR NEW.starts_at IS DISTINCT FROM v_match.scheduled_at
       OR NEW.ends_at IS DISTINCT FROM v_match.scheduled_ends_at THEN
       RAISE EXCEPTION 'El bloqueo debe coincidir con la programación del partido.' USING ERRCODE='23514';
     END IF;
   ELSIF NEW.active THEN
     RAISE EXCEPTION 'Un partido sin programar no puede ocupar la cancha.' USING ERRCODE='23514';
   END IF;
 ELSIF num_nonnulls(NEW.tournament_group_match_id,NEW.tournament_knockout_match_id)>0 THEN
   RAISE EXCEPTION 'Los bloqueos de partidos deben ser del tipo torneo.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $guard$;

-- Cada cuadro confirmado genera exactamente seis encuentros deportivos.
CREATE OR REPLACE FUNCTION public.bp_ko_seed_matches()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $seed$
BEGIN
 INSERT INTO public.bp_tournament_knockout_matches(tournament_id,stage,slot)
 VALUES
 (NEW.tournament_id,'quarterfinal',1),(NEW.tournament_id,'quarterfinal',2),
 (NEW.tournament_id,'quarterfinal',3),(NEW.tournament_id,'semifinal',1),
 (NEW.tournament_id,'semifinal',2),(NEW.tournament_id,'final',1)
 ON CONFLICT(tournament_id,stage,slot) DO NOTHING;
 RETURN NEW;
END $seed$;
CREATE TRIGGER bp_ko_seed_matches_trg AFTER INSERT ON public.bp_tournament_knockout_brackets
 FOR EACH ROW EXECUTE FUNCTION public.bp_ko_seed_matches();
INSERT INTO public.bp_tournament_knockout_matches(tournament_id,stage,slot)
SELECT b.tournament_id,x.stage,x.slot FROM public.bp_tournament_knockout_brackets b
CROSS JOIN (VALUES ('quarterfinal',1),('quarterfinal',2),('quarterfinal',3),
 ('semifinal',1),('semifinal',2),('final',1)) AS x(stage,slot)
ON CONFLICT(tournament_id,stage,slot) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bp_ko_freeze_started_bracket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $freeze$
BEGIN
 IF (NEW.quarterfinals IS DISTINCT FROM OLD.quarterfinals
    OR NEW.direct_semifinal_pair_id IS DISTINCT FROM OLD.direct_semifinal_pair_id)
   AND EXISTS (SELECT 1 FROM public.bp_tournament_knockout_matches m
     WHERE m.tournament_id=OLD.tournament_id AND
       (m.schedule_status='scheduled' OR m.match_status='played')) THEN
   RAISE EXCEPTION 'Primero postergá los partidos de eliminatorias. Si ya tienen resultados, no se pueden cambiar los cruces.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $freeze$;
CREATE TRIGGER bp_ko_freeze_started_bracket_trg BEFORE UPDATE OF quarterfinals,direct_semifinal_pair_id
 ON public.bp_tournament_knockout_brackets
 FOR EACH ROW EXECUTE FUNCTION public.bp_ko_freeze_started_bracket();

CREATE OR REPLACE FUNCTION public.bp_ko_match_schedule_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $closed$
BEGIN
 IF TG_OP='DELETE' THEN
   IF OLD.schedule_status='scheduled' THEN
     RAISE EXCEPTION 'Postergá el partido antes de eliminarlo.' USING ERRCODE='23514';
   END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.schedule_status<>'unscheduled' OR NEW.match_status<>'pending' THEN
     RAISE EXCEPTION 'Los partidos nuevos comienzan sin programar y pendientes.' USING ERRCODE='23514';
   END IF;
 ELSE
   IF (NEW.schedule_status,NEW.scheduled_at,NEW.scheduled_ends_at,NEW.match_status)
      IS DISTINCT FROM (OLD.schedule_status,OLD.scheduled_at,OLD.scheduled_ends_at,OLD.match_status) THEN
     IF current_user<>'postgres' THEN
       RAISE EXCEPTION 'Usá las funciones administrativas de partidos.' USING ERRCODE='42501';
     END IF;
     IF OLD.match_status='played' AND NEW.schedule_status IS DISTINCT FROM OLD.schedule_status THEN
       RAISE EXCEPTION 'Un partido disputado no se puede reprogramar.' USING ERRCODE='23514';
     END IF;
   END IF;
 END IF;
 RETURN NEW;
END $closed$;
CREATE TRIGGER bp_ko_match_schedule_guard_trg
 BEFORE INSERT OR UPDATE OR DELETE ON public.bp_tournament_knockout_matches
 FOR EACH ROW EXECUTE FUNCTION public.bp_ko_match_schedule_guard();

CREATE OR REPLACE FUNCTION public.bp_ko_match_schedule_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $sync$
DECLARE v_court uuid;v_block uuid;
BEGIN
 IF (NEW.schedule_status,NEW.scheduled_at,NEW.scheduled_ends_at)
    IS NOT DISTINCT FROM (OLD.schedule_status,OLD.scheduled_at,OLD.scheduled_ends_at) THEN RETURN NEW; END IF;
 IF NEW.schedule_status='scheduled' THEN
   SELECT c.id INTO v_court FROM public.courts c WHERE c.active ORDER BY c.created_at LIMIT 1;
   IF v_court IS NULL THEN RAISE EXCEPTION 'No hay cancha activa para programar.'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(v_court::text,72119));
   SELECT id INTO v_block FROM public.blockouts WHERE tournament_knockout_match_id=NEW.id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.reservations r
     WHERE r.court_id=v_court AND r.status<>'cancelled' AND
       r.starts_at<NEW.scheduled_ends_at AND r.ends_at>NEW.scheduled_at) THEN
     RAISE EXCEPTION 'Hay una reserva vigente en ese horario.' USING ERRCODE='23514';
   END IF;
   IF EXISTS(SELECT 1 FROM public.blockouts b WHERE b.court_id=v_court
     AND b.active AND b.id IS DISTINCT FROM v_block
     AND b.starts_at<NEW.scheduled_ends_at AND b.ends_at>NEW.scheduled_at) THEN
     RAISE EXCEPTION 'La cancha ya está bloqueada en ese horario.' USING ERRCODE='23514';
   END IF;
   IF v_block IS NULL THEN
     INSERT INTO public.blockouts(court_id,starts_at,ends_at,active,block_type,reason,tournament_knockout_match_id,created_by)
     VALUES(v_court,NEW.scheduled_at,NEW.scheduled_ends_at,true,'tournament'::public.block_type,
       'Partido de eliminatorias',NEW.id,auth.uid());
   ELSE
     UPDATE public.blockouts SET court_id=v_court,starts_at=NEW.scheduled_at,
       ends_at=NEW.scheduled_ends_at,active=true,block_type='tournament'::public.block_type,
       reason='Partido de eliminatorias' WHERE id=v_block;
   END IF;
 ELSE
   UPDATE public.blockouts SET active=false WHERE tournament_knockout_match_id=NEW.id AND active;
 END IF;
 RETURN NEW;
END $sync$;
CREATE TRIGGER bp_ko_match_schedule_sync_trg
 AFTER UPDATE OF schedule_status,scheduled_at,scheduled_ends_at ON public.bp_tournament_knockout_matches
 FOR EACH ROW EXECUTE FUNCTION public.bp_ko_match_schedule_sync();

CREATE OR REPLACE FUNCTION public.bp_admin_set_knockout_match_schedule(
 p_match_id uuid,p_action text,p_day date DEFAULT NULL,p_start_time time DEFAULT NULL,
 p_duration_minutes integer DEFAULT NULL,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $schedule$
DECLARE v_match public.bp_tournament_knockout_matches%ROWTYPE;
 v_status text;v_start timestamptz;v_end timestamptz;v_tz text;
 v_reason text;v_operation text;v_t_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Acceso denegado.' USING ERRCODE='42501';
 END IF;
 IF p_action IS NULL OR p_action NOT IN ('schedule','postpone') OR p_match_id IS NULL THEN
   RAISE EXCEPTION 'Acción de programación inválida.' USING ERRCODE='23514';
 END IF;
 v_reason:=nullif(btrim(coalesce(p_reason,'')),'');
 IF length(coalesce(v_reason,''))>500 THEN RAISE EXCEPTION 'Motivo demasiado largo.' USING ERRCODE='23514'; END IF;
 SELECT m.* INTO v_match FROM public.bp_tournament_knockout_matches m
 JOIN public.bp_tournaments t ON t.id=m.tournament_id WHERE m.id=p_match_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido no encontrado.'; END IF;
 SELECT status INTO v_t_status FROM public.bp_tournaments WHERE id=v_match.tournament_id FOR UPDATE;
 IF v_t_status NOT IN ('registration_closed','in_progress') THEN
   RAISE EXCEPTION 'El torneo debe estar activo y con inscripciones cerradas.' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_match FROM public.bp_tournament_knockout_matches WHERE id=p_match_id FOR UPDATE;
 IF v_match.match_status<>'pending' THEN
   RAISE EXCEPTION 'No se puede programar un partido con resultado.' USING ERRCODE='23514';
 END IF;
 IF p_action='schedule' THEN
   IF p_day IS NULL OR p_start_time IS NULL OR p_duration_minutes NOT IN (90,120)
     OR extract(hour from p_start_time)::integer NOT BETWEEN 9 AND 23
     OR extract(minute from p_start_time)::integer NOT IN (0,30)
     OR extract(second from p_start_time)<>0 THEN
     RAISE EXCEPTION 'Elegí fecha, 09:00–23:30 cada media hora y 90/120 minutos.' USING ERRCODE='23514';
   END IF;
   SELECT timezone INTO v_tz FROM public.booking_settings WHERE id=1;
   IF v_tz IS NULL THEN RAISE EXCEPTION 'Zona horaria no configurada.'; END IF;
   v_start:=(p_day+p_start_time) AT TIME ZONE v_tz;
   v_end:=v_start+make_interval(mins=>p_duration_minutes);
   IF v_start<=now() THEN RAISE EXCEPTION 'El horario debe ser futuro.' USING ERRCODE='23514'; END IF;
   v_status:='scheduled';
   v_operation:=CASE WHEN v_match.schedule_status='scheduled' THEN 'reprogramar' ELSE 'programar' END;
 ELSE
   IF v_match.schedule_status<>'scheduled' THEN
     RAISE EXCEPTION 'Solo se posterga un partido programado.' USING ERRCODE='23514';
   END IF;
   v_status:='postponed';v_operation:='postergar';v_start:=NULL;v_end:=NULL;
 END IF;
 IF (p_action='postpone' OR v_match.schedule_status='scheduled')
   AND length(coalesce(v_reason,''))<5 THEN
   RAISE EXCEPTION 'Indica un motivo de al menos cinco caracteres.' USING ERRCODE='23514';
 END IF;
 IF (v_match.schedule_status,v_match.scheduled_at,v_match.scheduled_ends_at)
   IS NOT DISTINCT FROM (v_status,v_start,v_end) THEN
   RAISE EXCEPTION 'El horario no tiene cambios.' USING ERRCODE='23514';
 END IF;
 UPDATE public.bp_tournament_knockout_matches SET schedule_status=v_status,
   scheduled_at=v_start,scheduled_ends_at=v_end,updated_at=now() WHERE id=p_match_id;
 INSERT INTO public.bp_tournament_knockout_schedule_history(
   tournament_id,match_id,operation,old_status,new_status,old_start,new_start,
   old_end,new_end,reason,changed_by)
 VALUES(v_match.tournament_id,p_match_id,v_operation,v_match.schedule_status,v_status,
   v_match.scheduled_at,v_start,v_match.scheduled_ends_at,v_end,v_reason,auth.uid());
 RETURN jsonb_build_object('match_id',p_match_id,'schedule_status',v_status,'starts_at',v_start,'ends_at',v_end);
END $schedule$;

CREATE OR REPLACE FUNCTION public.bp_admin_save_knockout_result(
 p_match_id uuid,p_sets jsonb,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $result$
DECLARE
 v_m public.bp_tournament_knockout_matches%ROWTYPE;
 v_b public.bp_tournament_knockout_brackets%ROWTYPE;
 v_old public.bp_tournament_knockout_results%ROWTYPE;
 v_p1 uuid;v_p2 uuid;v_s1 integer:=0;v_s2 integer:=0;
 v_winner uuid;v_set jsonb;v_x integer;v_y integer;v_high integer;v_low integer;
 v_i integer;v_length integer;v_existing boolean:=false;v_prev timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Acceso denegado.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_tournament_knockout_matches WHERE id=p_match_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido no encontrado.'; END IF;
 PERFORM 1 FROM public.bp_tournaments WHERE id=v_m.tournament_id
   AND status IN ('registration_closed','in_progress') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El torneo no está en curso.'; END IF;
 SELECT * INTO v_m FROM public.bp_tournament_knockout_matches WHERE id=p_match_id FOR UPDATE;
 SELECT * INTO v_b FROM public.bp_tournament_knockout_brackets WHERE tournament_id=v_m.tournament_id;
 SELECT date_trunc('milliseconds',max(updated_at)) INTO v_prev
   FROM public.bp_tournament_match_results WHERE tournament_id=v_m.tournament_id;
 IF v_prev IS DISTINCT FROM v_b.result_revision THEN
   RAISE EXCEPTION 'Cambió un resultado de grupos. Revisá la clasificación antes de continuar.' USING ERRCODE='23514';
 END IF;
 IF v_m.stage='quarterfinal' THEN
   v_p1:=(v_b.quarterfinals->(v_m.slot-1)->>0)::uuid;
   v_p2:=(v_b.quarterfinals->(v_m.slot-1)->>1)::uuid;
 ELSIF v_m.stage='semifinal' THEN
   IF v_m.slot=1 THEN
     v_p1:=v_b.direct_semifinal_pair_id;
     SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=1;
   ELSE
     SELECT r.winner_pair_id INTO v_p1 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=2;
     SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=3;
   END IF;
 ELSE
   SELECT r.winner_pair_id INTO v_p1 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='semifinal' AND k.slot=1;
   SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='semifinal' AND k.slot=2;
 END IF;
 IF v_p1 IS NULL OR v_p2 IS NULL OR v_p1=v_p2 THEN
   RAISE EXCEPTION 'Primero cargá los resultados que determinan los rivales.' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(p_sets)<>'array' OR jsonb_array_length(p_sets) NOT IN (2,3) THEN
   RAISE EXCEPTION 'Se necesitan dos o tres sets.' USING ERRCODE='23514';
 END IF;
 v_length:=jsonb_array_length(p_sets);
 FOR v_i IN 0..v_length-1 LOOP
   v_set:=p_sets->v_i;
   IF jsonb_typeof(v_set)<>'array' OR jsonb_array_length(v_set)<>2 OR
      jsonb_typeof(v_set->0)<>'number' OR jsonb_typeof(v_set->1)<>'number' OR
      (v_set->>0)!~'^[0-9]{1,2}$' OR (v_set->>1)!~'^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Cada set necesita dos números enteros.' USING ERRCODE='23514';
   END IF;
   v_x:=(v_set->>0)::integer;v_y:=(v_set->>1)::integer;
   v_high:=greatest(v_x,v_y);v_low:=least(v_x,v_y);
   IF NOT ((v_high=6 AND v_low<=4) OR (v_high=7 AND v_low IN (5,6))) THEN
     RAISE EXCEPTION 'El set debe ser normal: 6-0 a 6-4, 7-5 o 7-6.' USING ERRCODE='23514';
   END IF;
   IF v_s1=2 OR v_s2=2 THEN RAISE EXCEPTION 'Sobran sets: ya había un ganador.' USING ERRCODE='23514'; END IF;
   IF v_x>v_y THEN v_s1:=v_s1+1;ELSE v_s2:=v_s2+1;END IF;
 END LOOP;
 IF v_s1<>2 AND v_s2<>2 THEN RAISE EXCEPTION 'Falta definir el partido.' USING ERRCODE='23514'; END IF;
 v_winner:=CASE WHEN v_s1=2 THEN v_p1 ELSE v_p2 END;
 SELECT * INTO v_old FROM public.bp_tournament_knockout_results WHERE match_id=p_match_id FOR UPDATE;
 v_existing:=FOUND;
 IF v_existing THEN
   IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 1000 THEN
     RAISE EXCEPTION 'La corrección requiere un motivo (5 a 1000 caracteres).' USING ERRCODE='23514';
   END IF;
   IF v_old.sets=p_sets THEN RAISE EXCEPTION 'El resultado no presenta cambios.' USING ERRCODE='23514'; END IF;
   IF (v_old.resolved_pair1_id,v_old.resolved_pair2_id)
     IS DISTINCT FROM (v_p1,v_p2) THEN
     RAISE EXCEPTION 'Cambiaron los participantes: revisá el cuadro.' USING ERRCODE='23514';
   END IF;
   IF v_old.winner_pair_id IS DISTINCT FROM v_winner AND EXISTS(
     SELECT 1 FROM public.bp_tournament_knockout_matches nextm
     JOIN public.bp_tournament_knockout_results nr ON nr.match_id=nextm.id
     WHERE nextm.tournament_id=v_m.tournament_id AND
       ((v_m.stage='quarterfinal' AND nextm.stage IN ('semifinal','final'))
        OR (v_m.stage='semifinal' AND nextm.stage='final'))
   ) THEN
     RAISE EXCEPTION 'Hay resultados posteriores: no se puede cambiar al ganador de origen.' USING ERRCODE='23514';
   END IF;
   INSERT INTO public.bp_tournament_knockout_result_revisions(match_id,old_sets,new_sets,reason,changed_by)
   VALUES(p_match_id,v_old.sets,p_sets,btrim(p_reason),auth.uid());
   UPDATE public.bp_tournament_knockout_results SET sets=p_sets,sets_pair1=v_s1,sets_pair2=v_s2,
     winner_pair_id=v_winner,updated_at=now(),updated_by=auth.uid() WHERE match_id=p_match_id;
 ELSE
   IF v_m.match_status<>'pending' THEN RAISE EXCEPTION 'Partido inconsistente.'; END IF;
   INSERT INTO public.bp_tournament_knockout_results(
     match_id,tournament_id,sets,sets_pair1,sets_pair2,resolved_pair1_id,resolved_pair2_id,
     winner_pair_id,created_by,updated_by)
   VALUES(p_match_id,v_m.tournament_id,p_sets,v_s1,v_s2,v_p1,v_p2,v_winner,auth.uid(),auth.uid());
   UPDATE public.bp_tournament_knockout_matches SET match_status='played',updated_at=now()
     WHERE id=p_match_id;
 END IF;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,'sets_pair1',v_s1,'sets_pair2',v_s2);
END $result$;

REVOKE ALL ON FUNCTION public.bp_admin_set_knockout_match_schedule(uuid,text,date,time,integer,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.bp_admin_save_knockout_result(uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bp_admin_set_knockout_match_schedule(uuid,text,date,time,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_admin_save_knockout_result(uuid,jsonb,text) TO authenticated;
