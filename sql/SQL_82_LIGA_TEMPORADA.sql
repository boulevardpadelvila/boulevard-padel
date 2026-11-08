-- Boulevard Pádel · SQL 82 · Modalidad Liga (borrador, NO INSTALADA)
-- Fecha: 07/11/2026. Necesita autorización SQL explícita previa a aplicación.
-- Definitiva: SÍ guardar como migración GitHub; NO ejecutar en SQL Editor ahora.
-- Una o dos ruedas, fecha estimada de inicio sin fecha final.
-- Puntuación provisional: victoria 2; derrota 2-1: 1; derrota 2-0: 0.
-- Tercer set exclusivamente súper tie-break a 10 y diferencia de dos.
-- Ninguna instrucción actualiza resultados históricos de grupos o eliminatorias.

ALTER TABLE public.bp_tournaments ALTER COLUMN ends_on DROP NOT NULL;
-- Las otras modalidades conservan la exigencia histórica de fecha final.
ALTER TABLE public.bp_tournaments ADD CONSTRAINT bp_tournaments_end_date_except_league
 CHECK (format='league' OR ends_on IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.bp_league_settings (
 tournament_id uuid PRIMARY KEY REFERENCES public.bp_tournaments(id) ON DELETE RESTRICT,
 legs smallint NOT NULL DEFAULT 1 CHECK (legs IN (1,2)),
 generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bp_league_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bp_league_settings_admin_read ON public.bp_league_settings
 FOR SELECT TO authenticated USING ((SELECT public.bp_tournament_is_admin()));
REVOKE ALL ON public.bp_league_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bp_league_settings TO authenticated;

CREATE TABLE IF NOT EXISTS public.bp_league_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id) ON DELETE RESTRICT,
 leg smallint NOT NULL CHECK (leg IN (1,2)),
 round_number integer NOT NULL CHECK (round_number >= 1),
 match_number integer NOT NULL CHECK (match_number >= 1),
 pair1_id uuid NOT NULL,
 pair2_id uuid NOT NULL,
 schedule_status text NOT NULL DEFAULT 'unscheduled'
   CHECK (schedule_status IN ('unscheduled','scheduled','postponed')),
 scheduled_at timestamptz,
 scheduled_ends_at timestamptz,
 court_label text,
 match_status text NOT NULL DEFAULT 'pending'
   CHECK (match_status IN ('pending','played')),
 sets jsonb,
 sets_pair1 smallint,
 sets_pair2 smallint,
 winner_pair_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT bp_league_distinct_pairs CHECK (pair1_id<>pair2_id),
 CONSTRAINT bp_league_pair1_fk FOREIGN KEY(pair1_id,tournament_id)
  REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
 CONSTRAINT bp_league_pair2_fk FOREIGN KEY(pair2_id,tournament_id)
  REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
 CONSTRAINT bp_league_round_slot_unique UNIQUE(tournament_id,round_number,match_number),
 CONSTRAINT bp_league_schedule_consistency CHECK (
  (schedule_status='scheduled' AND scheduled_at IS NOT NULL
     AND scheduled_ends_at IS NOT NULL AND scheduled_ends_at>scheduled_at)
  OR (schedule_status<>'scheduled' AND scheduled_at IS NULL
     AND scheduled_ends_at IS NULL)
 ),
 CONSTRAINT bp_league_result_consistency CHECK (
  (match_status='pending' AND sets IS NULL AND sets_pair1 IS NULL AND
    sets_pair2 IS NULL AND winner_pair_id IS NULL)
  OR (match_status='played' AND sets IS NOT NULL AND
    sets_pair1 IS NOT NULL AND sets_pair2 IS NOT NULL
    AND winner_pair_id IN (pair1_id,pair2_id))
 )
);
CREATE INDEX IF NOT EXISTS bp_league_matches_tournament_idx
 ON public.bp_league_matches(tournament_id,round_number,match_number);
ALTER TABLE public.bp_league_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY bp_league_matches_admin_read ON public.bp_league_matches
 FOR SELECT TO authenticated USING ((SELECT public.bp_tournament_is_admin()));
REVOKE ALL ON public.bp_league_matches FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bp_league_matches TO authenticated;
-- Ninguna política de escritura: solo las RPC administrativas validan cambios.

-- El bloqueo se vincula al partido de Liga. Conserva las dos relaciones
-- anteriores y nunca convierte ni libera bloqueos de otra competencia.
ALTER TABLE public.blockouts ADD COLUMN IF NOT EXISTS tournament_league_match_id uuid
 REFERENCES public.bp_league_matches(id) ON DELETE CASCADE;
ALTER TABLE public.blockouts DROP CONSTRAINT IF EXISTS bp_blockout_one_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_one_match CHECK (
 num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,tournament_league_match_id)<=1
);
ALTER TABLE public.blockouts DROP CONSTRAINT IF EXISTS bp_tournament_blockout_requires_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_tournament_blockout_requires_match CHECK (
 block_type<>'tournament'::public.block_type OR
 num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,tournament_league_match_id)=1
);
ALTER TABLE public.blockouts DROP CONSTRAINT IF EXISTS bp_blockout_tournament_type_valid;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_tournament_type_valid CHECK (
 num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,tournament_league_match_id)=0
 OR block_type='tournament'::public.block_type
);
CREATE UNIQUE INDEX IF NOT EXISTS bp_league_blockout_unique
 ON public.blockouts(tournament_league_match_id)
 WHERE tournament_league_match_id IS NOT NULL;

-- Conservar el plantel definitivamente inscrito cuando el fixture exista.
-- Permitir correcciones ortográficas/contacto, no altas/bajas o cambios de estado.
CREATE OR REPLACE FUNCTION public.bp_league_lock_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_id uuid;
BEGIN
 v_id:=CASE WHEN TG_OP='DELETE' THEN OLD.tournament_id ELSE NEW.tournament_id END;
 IF EXISTS (SELECT 1 FROM public.bp_league_settings WHERE tournament_id=v_id) THEN
   IF TG_OP IN ('DELETE','INSERT') OR
     (TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status
        OR NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
        OR NEW.id IS DISTINCT FROM OLD.id)) THEN
     RAISE EXCEPTION 'La Liga ya tiene calendario. No se pueden cambiar sus parejas.' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$league$;
CREATE TRIGGER bp_league_roster_locked
 BEFORE INSERT OR UPDATE OR DELETE ON public.bp_tournament_pairs
 FOR EACH ROW EXECUTE FUNCTION public.bp_league_lock_roster();

-- No declarar finalizada una Liga sin fixture y todos los partidos cargados.
-- La decisión de desempate permanece explícitamente a cargo del Admin.
CREATE OR REPLACE FUNCTION public.bp_league_finish_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
BEGIN
 IF NEW.format='league' AND NEW.status='completed'
    AND OLD.status IS DISTINCT FROM 'completed' THEN
   IF NOT EXISTS(
     SELECT 1 FROM public.bp_league_matches WHERE tournament_id=NEW.id
   ) OR EXISTS(
     SELECT 1 FROM public.bp_league_matches WHERE tournament_id=NEW.id
       AND match_status<>'played'
   ) THEN
     RAISE EXCEPTION 'Completá todos los partidos de la Liga antes de finalizarla.' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END;
$league$;
CREATE TRIGGER bp_league_finish_ready
 BEFORE UPDATE OF status ON public.bp_tournaments
 FOR EACH ROW EXECUTE FUNCTION public.bp_league_finish_guard();

CREATE OR REPLACE FUNCTION public.bp_league_generate_fixture(
 p_tournament_id uuid, p_legs integer DEFAULT 1
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_ids uuid[];
 v_size integer;
 v_count integer;
 v_round integer;
 v_leg integer;
 v_i integer;
 v_pair1 uuid;
 v_pair2 uuid;
 v_slot integer;
 v_inserted integer:=0;
 v_matches integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo un administrador activo puede generar una Liga.' USING ERRCODE='42501';
 END IF;
 IF p_legs NOT IN (1,2) OR p_legs IS NULL THEN
   RAISE EXCEPTION 'Elegí una o dos ruedas.' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_t FROM public.bp_tournaments
 WHERE id=p_tournament_id FOR UPDATE;
 IF NOT FOUND OR v_t.format<>'league' THEN
   RAISE EXCEPTION 'La competencia no es una Liga.' USING ERRCODE='23514';
 END IF;
 IF v_t.status NOT IN ('registration_closed','in_progress') THEN
   RAISE EXCEPTION 'Cerrá primero las inscripciones de la Liga.' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.bp_league_settings WHERE tournament_id=p_tournament_id)
    OR EXISTS(SELECT 1 FROM public.bp_league_matches WHERE tournament_id=p_tournament_id) THEN
   RAISE EXCEPTION 'El fixture ya existe. No se regenera para conservar resultados y programación.' USING ERRCODE='23514';
 END IF;
 SELECT array_agg(id ORDER BY created_at,id),count(*)
 INTO v_ids,v_count FROM public.bp_tournament_pairs
 WHERE tournament_id=p_tournament_id AND status='approved';
 IF EXISTS(SELECT 1 FROM public.bp_tournament_pairs
     WHERE tournament_id=p_tournament_id AND status='pending') THEN
   RAISE EXCEPTION 'Resolvé todas las solicitudes pendientes antes de generar la Liga.' USING ERRCODE='23514';
 END IF;
 IF v_count<2 OR v_count>64 THEN
   RAISE EXCEPTION 'Una Liga admite entre 2 y 64 parejas aprobadas.' USING ERRCODE='23514';
 END IF;
 IF v_count%2=1 THEN v_ids:=array_append(v_ids,NULL::uuid); END IF;
 v_size:=array_length(v_ids,1);
 INSERT INTO public.bp_league_settings(tournament_id,legs)
 VALUES (p_tournament_id,p_legs);
 FOR v_leg IN 1..p_legs LOOP
   -- La rotación reinicia cada rueda para reproducir rivales de ida y vuelta.
   IF v_leg=2 THEN
     SELECT array_agg(id ORDER BY created_at,id) INTO v_ids FROM public.bp_tournament_pairs
     WHERE tournament_id=p_tournament_id AND status='approved';
     IF v_count%2=1 THEN v_ids:=array_append(v_ids,NULL::uuid); END IF;
   END IF;
   FOR v_round IN 1..(v_size-1) LOOP
     v_slot:=0;
     FOR v_i IN 1..(v_size/2) LOOP
       v_pair1:=v_ids[v_i];
       v_pair2:=v_ids[v_size-v_i+1];
       IF v_pair1 IS NOT NULL AND v_pair2 IS NOT NULL THEN
         v_slot:=v_slot+1;
         IF v_leg=2 THEN
           INSERT INTO public.bp_league_matches(
             tournament_id,leg,round_number,match_number,pair1_id,pair2_id
           ) VALUES (
             p_tournament_id,v_leg,(v_size-1)+v_round,v_slot,
             CASE WHEN v_round%2=0 THEN v_pair1 ELSE v_pair2 END,
             CASE WHEN v_round%2=0 THEN v_pair2 ELSE v_pair1 END
           );
         ELSE
           INSERT INTO public.bp_league_matches(
             tournament_id,leg,round_number,match_number,pair1_id,pair2_id
           ) VALUES (
             p_tournament_id,v_leg,v_round,v_slot,
             CASE WHEN v_round%2=0 THEN v_pair2 ELSE v_pair1 END,
             CASE WHEN v_round%2=0 THEN v_pair1 ELSE v_pair2 END
           );
         END IF;
         v_inserted:=v_inserted+1;
       END IF;
     END LOOP;
     v_ids:=ARRAY[v_ids[1]] || ARRAY[v_ids[v_size]] || v_ids[2:v_size-1];
   END LOOP;
 END LOOP;
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'legs',p_legs,
   'pairs',v_count,'matches',v_inserted,'rounds',(v_size-1)*p_legs);
END;
$league$;

CREATE OR REPLACE FUNCTION public.bp_league_save_result(
 p_match_id uuid,p_sets jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_m public.bp_league_matches%ROWTYPE;
 v_t public.bp_tournaments%ROWTYPE;
 v_num integer;
 v_i integer;
 v_a integer;
 v_b integer;
 v_high integer;
 v_low integer;
 v_s1 integer:=0;
 v_s2 integer:=0;
 v_winner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_league_matches WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido inexistente.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=v_m.tournament_id;
 IF v_t.format<>'league' OR v_t.status NOT IN ('in_progress','registration_closed') THEN
   RAISE EXCEPTION 'La Liga no admite resultados en este estado.' USING ERRCODE='23514';
 END IF;
 IF p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
   RAISE EXCEPTION 'Ingresá dos sets y, si corresponde, súper tie-break.' USING ERRCODE='23514';
 END IF;
 v_num:=jsonb_array_length(p_sets);
 IF v_num NOT IN (2,3) THEN RAISE EXCEPTION 'Se requieren dos o tres sets.' USING ERRCODE='23514'; END IF;
 FOR v_i IN 0..(v_num-1) LOOP
   IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2
     OR jsonb_typeof(p_sets->v_i->0)<>'number'
     OR jsonb_typeof(p_sets->v_i->1)<>'number'
     OR (p_sets->v_i->>0)!~'^[0-9]{1,2}$'
     OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$' THEN
     RAISE EXCEPTION 'Marcador inválido.' USING ERRCODE='23514';
   END IF;
   v_a:=(p_sets->v_i->>0)::integer;
   v_b:=(p_sets->v_i->>1)::integer;
   v_high:=greatest(v_a,v_b);
   v_low:=least(v_a,v_b);
   IF v_a=v_b OR (v_i<2 AND NOT(
     (v_high=6 AND v_low<=4) OR (v_high=7 AND v_low IN(5,6))))
     OR (v_i=2 AND NOT((v_high=10 AND v_low<=8)
       OR(v_high>10 AND v_high-v_low=2))) THEN
     RAISE EXCEPTION 'Set inválido: usá 6-0 a 6-4, 7-5, 7-6 o súper tie-break a 10 (diferencia 2).' USING ERRCODE='23514';
   END IF;
   IF v_s1=2 OR v_s2=2 THEN
     RAISE EXCEPTION 'El partido ya estaba definido: no corresponde otro set.' USING ERRCODE='23514';
   END IF;
   IF v_a>v_b THEN v_s1:=v_s1+1; ELSE v_s2:=v_s2+1; END IF;
 END LOOP;
 IF greatest(v_s1,v_s2)<>2 OR (v_num=3 AND (v_s1+v_s2)<>3)
   OR (v_num=2 AND least(v_s1,v_s2)<>0) THEN
   RAISE EXCEPTION 'El partido debe resolverse al mejor de tres con súper tie-break en 1-1.' USING ERRCODE='23514';
 END IF;
 v_winner:=CASE WHEN v_s1=2 THEN v_m.pair1_id ELSE v_m.pair2_id END;
 UPDATE public.bp_league_matches SET
   sets=p_sets, sets_pair1=v_s1, sets_pair2=v_s2,
   winner_pair_id=v_winner, match_status='played',updated_at=now()
 WHERE id=p_match_id;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,
   'sets_pair1',v_s1,'sets_pair2',v_s2);
END;
$league$;

-- La programación bloquea la cancha real igual que un encuentro de torneo.
-- La función actualiza el partido ANTES del bloqueo para que el guardián de
-- integridad de Supabase pueda validar que ambos horarios coinciden.
CREATE OR REPLACE FUNCTION public.bp_league_schedule_match(
 p_match_id uuid,p_start timestamptz,p_duration_minutes integer,
 p_court_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_m public.bp_league_matches%ROWTYPE;
 v_t public.bp_tournaments%ROWTYPE;
 v_court uuid;
 v_end timestamptz;
 v_block uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_league_matches WHERE id=p_match_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido inexistente.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=v_m.tournament_id;
 IF v_t.status='completed' OR v_m.match_status='played' THEN
   RAISE EXCEPTION 'No se puede reprogramar un partido finalizado.' USING ERRCODE='23514';
 END IF;
 IF p_start IS NOT NULL AND (p_duration_minutes IS NULL OR p_duration_minutes NOT IN(90,120)) THEN
   RAISE EXCEPTION 'La duración debe ser 90 o 120 minutos.' USING ERRCODE='23514';
 END IF;
 SELECT id INTO v_court FROM public.courts WHERE active ORDER BY created_at LIMIT 1;
 IF v_court IS NULL THEN RAISE EXCEPTION 'No hay cancha activa.' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_court::text,72119));
 SELECT id INTO v_block FROM public.blockouts
 WHERE tournament_league_match_id=p_match_id FOR UPDATE;
 IF p_start IS NOT NULL THEN
   v_end:=p_start+(p_duration_minutes||' minutes')::interval;
   IF EXISTS(SELECT 1 FROM public.reservations r
       WHERE r.court_id=v_court AND r.status<>'cancelled' AND
         r.starts_at<v_end AND r.ends_at>p_start)
     OR EXISTS(SELECT 1 FROM public.blockouts b
       WHERE b.court_id=v_court AND b.active AND
         b.id IS DISTINCT FROM v_block AND b.starts_at<v_end AND b.ends_at>p_start) THEN
     RAISE EXCEPTION 'Horario ocupado por otra reserva o partido.' USING ERRCODE='23514';
   END IF;
   UPDATE public.bp_league_matches SET schedule_status='scheduled',
    scheduled_at=p_start,scheduled_ends_at=v_end,
    court_label=left(nullif(btrim(p_court_label),''),100),updated_at=now()
   WHERE id=p_match_id;
   IF v_block IS NULL THEN
     INSERT INTO public.blockouts(
       court_id,starts_at,ends_at,block_type,reason,active,
       created_by,tournament_league_match_id
     ) VALUES (
       v_court,p_start,v_end,'tournament'::public.block_type,
       'Liga: partido programado',TRUE,auth.uid(),p_match_id
     );
   ELSE
     UPDATE public.blockouts SET court_id=v_court,starts_at=p_start,
       ends_at=v_end,active=true,updated_at=now()
     WHERE id=v_block;
   END IF;
 ELSE
   UPDATE public.bp_league_matches SET schedule_status='postponed',
     scheduled_at=NULL,scheduled_ends_at=NULL,court_label=NULL,updated_at=now()
   WHERE id=p_match_id;
   IF v_block IS NOT NULL THEN
     UPDATE public.blockouts SET active=false,updated_at=now() WHERE id=v_block;
     DELETE FROM public.blockouts WHERE id=v_block;
   END IF;
 END IF;
 RETURN jsonb_build_object('match_id',p_match_id,'scheduled_at',p_start,'ends_at',v_end);
END;
$league$;

-- Respuesta sanitizada para visitantes: nunca incluye teléfonos/contactos
-- ni resultados de Ligas ocultas (aunque conozcan el identificador UUID).
CREATE OR REPLACE FUNCTION public.bp_public_league_followup(
 p_tournament_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $league$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
BEGIN
 SELECT * INTO v_t FROM public.bp_tournaments
 WHERE id=p_tournament_id AND format='league' AND is_published=true;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object(
  'tournament_id',v_t.id,
  'legs',(SELECT s.legs FROM public.bp_league_settings s WHERE s.tournament_id=v_t.id),
  'pairs',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.player1_name||' y '||p.player2_name
   ) ORDER BY p.created_at,p.id)
   FROM public.bp_tournament_pairs p
   WHERE p.tournament_id=v_t.id AND p.status='approved'),'[]'::jsonb),
  'matches',coalesce((SELECT jsonb_agg(jsonb_build_object(
     'id',m.id,'round_number',m.round_number,'match_number',m.match_number,
     'leg',m.leg,'pair1_id',m.pair1_id,'pair2_id',m.pair2_id,
     'schedule_status',m.schedule_status,'scheduled_at',m.scheduled_at,
     'scheduled_ends_at',m.scheduled_ends_at,'court_label',m.court_label,
     'match_status',m.match_status,'sets',m.sets,
     'sets_pair1',m.sets_pair1,'sets_pair2',m.sets_pair2,
     'winner_pair_id',m.winner_pair_id
   ) ORDER BY m.round_number,m.match_number)
   FROM public.bp_league_matches m WHERE m.tournament_id=v_t.id),'[]'::jsonb)
 );
END;
$league$;

REVOKE ALL ON FUNCTION public.bp_league_generate_fixture(uuid,integer)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_league_schedule_match(uuid,timestamptz,integer,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_league_save_result(uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_public_league_followup(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_generate_fixture(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_schedule_match(uuid,timestamptz,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_save_result(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_public_league_followup(uuid) TO anon,authenticated;

-- Mantener protegidos los bloqueos y la eliminación definitiva de Ligas.
CREATE OR REPLACE FUNCTION public.bp_tournament_blockout_integrity_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_match record;
BEGIN
  IF TG_OP = 'DELETE' AND (
    EXISTS (
      SELECT 1 FROM public.bp_tournament_group_matches m
      WHERE m.id = OLD.tournament_group_match_id
        AND public.bp_tournament_delete_allowed(m.tournament_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.bp_tournament_knockout_matches k
      WHERE k.id = OLD.tournament_knockout_match_id
        AND public.bp_tournament_delete_allowed(k.tournament_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.bp_league_matches lm
      WHERE lm.id = OLD.tournament_league_match_id
        AND public.bp_tournament_delete_allowed(lm.tournament_id)
    )
  ) THEN
    RETURN OLD;
  END IF;
 IF TG_OP='DELETE' THEN
   IF (OLD.tournament_group_match_id IS NOT NULL OR OLD.tournament_knockout_match_id IS NOT NULL OR OLD.tournament_league_match_id IS NOT NULL)
      AND OLD.active THEN
     RAISE EXCEPTION 'No se puede borrar un bloqueo activo de partido.' USING ERRCODE='23514';
   END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND (
     (OLD.tournament_group_match_id IS NOT NULL AND
      NEW.tournament_group_match_id IS DISTINCT FROM OLD.tournament_group_match_id)
     OR (OLD.tournament_knockout_match_id IS NOT NULL AND
      NEW.tournament_knockout_match_id IS DISTINCT FROM OLD.tournament_knockout_match_id)
     OR (OLD.tournament_league_match_id IS NOT NULL AND
      NEW.tournament_league_match_id IS DISTINCT FROM OLD.tournament_league_match_id)) THEN
   RAISE EXCEPTION 'No se puede desvincular el bloqueo de su partido.' USING ERRCODE='23514';
 END IF;
 IF NEW.block_type='tournament'::public.block_type THEN
   IF num_nonnulls(NEW.tournament_group_match_id,NEW.tournament_knockout_match_id,NEW.tournament_league_match_id)<>1 THEN
     RAISE EXCEPTION 'El bloqueo de torneo debe pertenecer a un solo partido.' USING ERRCODE='23514';
   END IF;
   IF NEW.tournament_group_match_id IS NOT NULL THEN
     SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
     FROM public.bp_tournament_group_matches m WHERE m.id=NEW.tournament_group_match_id;
   ELSIF NEW.tournament_knockout_match_id IS NOT NULL THEN
     SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
     FROM public.bp_tournament_knockout_matches m WHERE m.id=NEW.tournament_knockout_match_id;
   ELSE
     SELECT m.schedule_status,m.scheduled_at,m.scheduled_ends_at INTO v_match
     FROM public.bp_league_matches m WHERE m.id=NEW.tournament_league_match_id;
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
 ELSIF num_nonnulls(NEW.tournament_group_match_id,NEW.tournament_knockout_match_id,NEW.tournament_league_match_id)>0 THEN
   RAISE EXCEPTION 'Los bloqueos de partidos deben ser del tipo torneo.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.bp_admin_delete_tournament_safely(p_tournament_id uuid, p_expected_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_pairs bigint;
  v_groups bigint;
  v_group_matches bigint;
  v_ko_matches bigint;
  v_league_matches bigint;
  v_blocks bigint;
BEGIN
  IF auth.uid() IS NULL
     OR NOT COALESCE(public.bp_tournament_is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Operación exclusiva para administradores activos.'
      USING ERRCODE='42501';
  END IF;
  IF p_tournament_id IS NULL OR NULLIF(BTRIM(p_expected_name),'') IS NULL THEN
    RAISE EXCEPTION 'Seleccioná un torneo válido.'
      USING ERRCODE='22023';
  END IF;

  -- Bloqueo por torneo. El servidor vuelve a validar el nombre y la existencia.
  SELECT * INTO v_t FROM public.bp_tournaments t
  WHERE t.id=p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El torneo ya no existe. Actualizá la lista.'
      USING ERRCODE='P0002';
  END IF;
  IF v_t.name IS DISTINCT FROM p_expected_name THEN
    RAISE EXCEPTION 'El torneo cambió de nombre. Actualizá y volvé a confirmar.'
      USING ERRCODE='23514';
  END IF;

  SELECT count(*) INTO v_pairs FROM public.bp_tournament_pairs
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_groups FROM public.bp_tournament_groups
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_group_matches FROM public.bp_tournament_group_matches
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_ko_matches FROM public.bp_tournament_knockout_matches
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_league_matches FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_blocks FROM public.blockouts b
    WHERE b.tournament_group_match_id IN (
      SELECT id FROM public.bp_tournament_group_matches WHERE tournament_id=p_tournament_id
    ) OR b.tournament_knockout_match_id IN (
      SELECT id FROM public.bp_tournament_knockout_matches WHERE tournament_id=p_tournament_id
    ) OR b.tournament_league_match_id IN (
      SELECT id FROM public.bp_league_matches WHERE tournament_id=p_tournament_id
    );

  -- Este acceso privado existe solo dentro de ESTA transacción y para ESTE ID.
  INSERT INTO bp_revision_private.operation_access(transaction_id,tournament_id,action)
  VALUES (txid_current(),p_tournament_id,'delete');

  -- Primero liberar únicamente bloqueos vinculados a encuentros del torneo.
  -- No se toca ningún bloque independiente ni ninguna reserva.
  DELETE FROM public.blockouts b
  WHERE b.tournament_group_match_id IN (
    SELECT id FROM public.bp_tournament_group_matches WHERE tournament_id=p_tournament_id
  ) OR b.tournament_knockout_match_id IN (
    SELECT id FROM public.bp_tournament_knockout_matches WHERE tournament_id=p_tournament_id
  ) OR b.tournament_league_match_id IN (
    SELECT id FROM public.bp_league_matches WHERE tournament_id=p_tournament_id
  );

  -- Historial de resultados de grupos y resultados (FK RESTRICT).
  DELETE FROM public.bp_tournament_match_result_revisions rev
  WHERE rev.match_id IN (
    SELECT m.id FROM public.bp_tournament_group_matches m WHERE m.tournament_id=p_tournament_id
  );
  DELETE FROM public.bp_tournament_match_results r
  WHERE r.tournament_id=p_tournament_id;

  -- Llave final; FK CASCADE elimina sus partidos, resultados, revisiones
  -- e historiales de programación de eliminatorias.
  DELETE FROM public.bp_tournament_knockout_brackets k
  WHERE k.tournament_id=p_tournament_id;

  -- Grupos: borrar primero partidos y asignaciones, después grupos y parejas.
  DELETE FROM public.bp_tournament_group_matches m
  WHERE m.tournament_id=p_tournament_id;
  DELETE FROM public.bp_tournament_group_pairs gp
  WHERE gp.tournament_id=p_tournament_id;
  DELETE FROM public.bp_tournament_groups g
  WHERE g.tournament_id=p_tournament_id;
  -- Liga: liberar fixture y configuración ANTES de borrar sus parejas.
  DELETE FROM public.bp_league_matches lm
  WHERE lm.tournament_id=p_tournament_id;
  DELETE FROM public.bp_league_settings ls
  WHERE ls.tournament_id=p_tournament_id;
  DELETE FROM public.bp_tournament_pairs p
  WHERE p.tournament_id=p_tournament_id;

  -- Historiales sin FK y bitácora de revisión, exclusivamente del torneo.
  DELETE FROM public.bp_tournament_match_schedule_history h
  WHERE h.tournament_id=p_tournament_id;
  DELETE FROM public.bp_tournament_revision_log r
  WHERE r.tournament_id=p_tournament_id;

  DELETE FROM public.bp_tournaments t
  WHERE t.id=p_tournament_id AND t.name=p_expected_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se eliminó el torneo seleccionado.'
      USING ERRCODE='23514';
  END IF;

  DELETE FROM bp_revision_private.operation_access a
  WHERE a.transaction_id=txid_current()
    AND a.tournament_id=p_tournament_id AND a.action='delete';

  RETURN jsonb_build_object(
    'deleted',TRUE,
    'tournament_id',p_tournament_id,
    'tournament_name',p_expected_name,
    'pairs_deleted',v_pairs,
    'groups_deleted',v_groups,
    'group_matches_deleted',v_group_matches,
    'knockout_matches_deleted',v_ko_matches,
    'league_matches_deleted',v_league_matches,
    'linked_blockouts_deleted',v_blocks
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.bp_admin_tournament_delete_preview(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR NOT COALESCE(public.bp_tournament_is_admin(), FALSE) THEN
    RAISE EXCEPTION 'Acción exclusiva de administradores activos.'
      USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_t
  FROM public.bp_tournaments
  WHERE id=p_tournament_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El torneo ya no existe. Actualizá la lista.'
      USING ERRCODE='P0002';
  END IF;
  RETURN jsonb_build_object(
    'tournament_id', v_t.id,
    'tournament_name', v_t.name,
    'is_published', v_t.is_published,
    'pairs', (SELECT count(*) FROM public.bp_tournament_pairs WHERE tournament_id=p_tournament_id),
    'groups', (SELECT count(*) FROM public.bp_tournament_groups WHERE tournament_id=p_tournament_id),
    'group_matches', (SELECT count(*) FROM public.bp_tournament_group_matches WHERE tournament_id=p_tournament_id),
    'group_results', (SELECT count(*) FROM public.bp_tournament_match_results WHERE tournament_id=p_tournament_id),
    'knockout_matches', (SELECT count(*) FROM public.bp_tournament_knockout_matches WHERE tournament_id=p_tournament_id),
    'knockout_results', (SELECT count(*) FROM public.bp_tournament_knockout_results WHERE tournament_id=p_tournament_id),
    'league_matches', (SELECT count(*) FROM public.bp_league_matches WHERE tournament_id=p_tournament_id),
    'league_results', (SELECT count(*) FROM public.bp_league_matches WHERE tournament_id=p_tournament_id AND match_status='played'),
    'linked_blockouts', (
      SELECT count(*) FROM public.blockouts b
      WHERE b.tournament_group_match_id IN (
        SELECT m.id FROM public.bp_tournament_group_matches m WHERE m.tournament_id=p_tournament_id
      ) OR b.tournament_knockout_match_id IN (
        SELECT k.id FROM public.bp_tournament_knockout_matches k WHERE k.tournament_id=p_tournament_id
      ) OR b.tournament_league_match_id IN (
        SELECT lm.id FROM public.bp_league_matches lm WHERE lm.tournament_id=p_tournament_id
      )
    )
  );
END;
$function$;

-- El API recarga columnas y funciones una vez aplicada esta migración.
NOTIFY pgrst, 'reload schema';

