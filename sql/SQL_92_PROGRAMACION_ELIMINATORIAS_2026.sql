-- Boulevard Pádel · Programación aislada de eliminatorias 2026.
-- No modifica esquema, constraints ni triggers de reservas, turnos fijos o blockouts.
-- Al PROGRAMAR un partido, crea o actualiza un bloqueo manual vinculado a
-- un registro privado (con FK restrictiva); el turnero existente respeta el bloqueo.
-- Al POSTERGAR elimina únicamente el bloqueo que creó esta función.
BEGIN;
CREATE TABLE IF NOT EXISTS public.bp_tournament_bracket_schedule2026 (
  match_id uuid PRIMARY KEY REFERENCES public.bp_tournament_bracket_matches2026(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
  blockout_id uuid UNIQUE REFERENCES public.blockouts(id) ON DELETE RESTRICT,
  schedule_status text NOT NULL CHECK (schedule_status IN ('scheduled','postponed')),
  scheduled_at timestamptz,
  scheduled_ends_at timestamptz,
  court_label text,
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bp92_schedule_atomic CHECK (
    (schedule_status='scheduled' AND blockout_id IS NOT NULL AND scheduled_at IS NOT NULL
      AND scheduled_ends_at IS NOT NULL AND scheduled_ends_at>scheduled_at)
    OR (schedule_status='postponed' AND blockout_id IS NULL
      AND scheduled_at IS NULL AND scheduled_ends_at IS NULL))
);
ALTER TABLE public.bp_tournament_bracket_schedule2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_tournament_bracket_schedule2026 FROM PUBLIC,anon,authenticated;

-- Protección ante borrado del torneo: nunca queda un bloqueo huérfano.
CREATE OR REPLACE FUNCTION public.bp_tournament_bracket_schedule_cleanup2026()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
  IF OLD.blockout_id IS NOT NULL THEN
    DELETE FROM public.blockouts b WHERE b.id=OLD.blockout_id
      AND b.block_type='manual'::public.block_type
      AND b.reason LIKE 'Eliminatorias 2026:%';
  END IF;
  RETURN OLD;
END $fn$;
DROP TRIGGER IF EXISTS bp92_bracket_schedule_cleanup ON public.bp_tournament_bracket_schedule2026;
CREATE TRIGGER bp92_bracket_schedule_cleanup AFTER DELETE ON public.bp_tournament_bracket_schedule2026
 FOR EACH ROW EXECUTE FUNCTION public.bp_tournament_bracket_schedule_cleanup2026();

CREATE OR REPLACE FUNCTION public.bp_tournament_schedule_bracket_match2026(
 p_match_id uuid,p_start timestamptz,p_duration_minutes integer,p_court_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_t public.bp_tournaments%ROWTYPE;v_m public.bp_tournament_bracket_matches2026%ROWTYPE;
 v_s public.bp_tournament_bracket_schedule2026%ROWTYPE;
 v_court uuid;v_timezone text;v_local_time time;v_end timestamptz;v_block uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo un administrador puede programar eliminatorias.' USING ERRCODE='42501';
 END IF;
 SELECT t.* INTO v_t FROM public.bp_tournaments t
 JOIN public.bp_tournament_bracket_matches2026 m ON m.tournament_id=t.id
 WHERE m.id=p_match_id FOR UPDATE OF t;
 IF NOT FOUND OR v_t.format<>'groups_knockout' OR v_t.rules_version<>2026
   OR v_t.status NOT IN('registration_closed','in_progress') OR v_t.fixture_published_at IS NULL THEN
   RAISE EXCEPTION 'El torneo no admite programación de eliminatorias.' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_m FROM public.bp_tournament_bracket_matches2026 m WHERE m.id=p_match_id FOR UPDATE;
 IF v_m.match_status<>'pending' THEN
   RAISE EXCEPTION 'No se puede reprogramar un partido jugado.' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_s FROM public.bp_tournament_bracket_schedule2026 s WHERE s.match_id=p_match_id FOR UPDATE;
 IF p_start IS NULL THEN
   IF v_s.schedule_status IS DISTINCT FROM 'scheduled' THEN
     RAISE EXCEPTION 'Este partido no tiene horario programado.' USING ERRCODE='23514';
   END IF;
   UPDATE public.bp_tournament_bracket_schedule2026 SET blockout_id=NULL,
    schedule_status='postponed',scheduled_at=NULL,scheduled_ends_at=NULL,
    court_label=NULL,updated_by=auth.uid(),updated_at=now() WHERE match_id=p_match_id;
   DELETE FROM public.blockouts b WHERE b.id=v_s.blockout_id AND b.block_type='manual'::public.block_type
       AND b.reason LIKE 'Eliminatorias 2026:%';
   IF NOT FOUND THEN RAISE EXCEPTION 'El bloqueo del partido no existe o fue alterado.' USING ERRCODE='23514'; END IF;
   RETURN jsonb_build_object('match_id',p_match_id,'schedule_status','postponed');
 END IF;
 IF p_duration_minutes NOT IN(90,120) OR p_start<=now() THEN
   RAISE EXCEPTION 'Horario futuro y duración 90/120 minutos obligatorios.' USING ERRCODE='23514';
 END IF;
 SELECT s.timezone INTO v_timezone FROM public.booking_settings s WHERE s.id=1;
 IF v_timezone IS NULL THEN RAISE EXCEPTION 'Zona horaria sin configurar.' USING ERRCODE='23514'; END IF;
 v_local_time:=(p_start AT TIME ZONE v_timezone)::time;
 IF extract(hour FROM v_local_time)::int NOT BETWEEN 9 AND 23
   OR extract(minute FROM v_local_time)::int NOT IN(0,30)
   OR extract(second FROM v_local_time)<>0 THEN
   RAISE EXCEPTION 'Horarios válidos de 09:00 a 23:30, cada media hora.' USING ERRCODE='23514';
 END IF;
 SELECT c.id INTO v_court FROM public.courts c WHERE c.active IS TRUE ORDER BY c.created_at LIMIT 1;
 IF v_court IS NULL THEN RAISE EXCEPTION 'No existe una cancha activa.' USING ERRCODE='23514'; END IF;
 -- Mismo bloqueo de cancha utilizado en la programación de Liga actual.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_court::text,72119));
 v_end:=p_start+make_interval(mins=>p_duration_minutes);
 v_block:=v_s.blockout_id;
 IF EXISTS(SELECT 1 FROM public.reservations r WHERE r.court_id=v_court AND r.status<>'cancelled'
     AND r.starts_at<v_end AND r.ends_at>p_start)
   OR EXISTS(SELECT 1 FROM public.blockouts b WHERE b.court_id=v_court AND b.active
     AND b.id IS DISTINCT FROM v_block AND b.starts_at<v_end AND b.ends_at>p_start) THEN
   RAISE EXCEPTION 'Horario ocupado por una reserva, un turno fijo o un cierre.' USING ERRCODE='23514';
 END IF;
 IF v_block IS NULL THEN
   INSERT INTO public.blockouts(court_id,starts_at,ends_at,block_type,reason,active,created_by)
   VALUES(v_court,p_start,v_end,'manual'::public.block_type,
     'Eliminatorias 2026: partido '||p_match_id::text,TRUE,auth.uid())
   RETURNING id INTO v_block;
 ELSE
   UPDATE public.blockouts b SET court_id=v_court,starts_at=p_start,ends_at=v_end,
     active=TRUE,updated_at=now() WHERE b.id=v_block
     AND b.block_type='manual'::public.block_type
     AND b.reason='Eliminatorias 2026: partido '||p_match_id::text;
   IF NOT FOUND THEN RAISE EXCEPTION 'Bloqueo de partido alterado. Revisá antes de programar.' USING ERRCODE='23514'; END IF;
 END IF;
 INSERT INTO public.bp_tournament_bracket_schedule2026(
   match_id,tournament_id,blockout_id,schedule_status,scheduled_at,scheduled_ends_at,court_label,updated_by)
 VALUES(p_match_id,v_m.tournament_id,v_block,'scheduled',p_start,v_end,
   left(nullif(btrim(coalesce(p_court_label,'')),''),100),auth.uid())
 ON CONFLICT (match_id) DO UPDATE SET blockout_id=EXCLUDED.blockout_id,schedule_status='scheduled',
   scheduled_at=EXCLUDED.scheduled_at,scheduled_ends_at=EXCLUDED.scheduled_ends_at,
   court_label=EXCLUDED.court_label,updated_by=auth.uid(),updated_at=now();
 RETURN jsonb_build_object('match_id',p_match_id,'schedule_status','scheduled',
   'starts_at',p_start,'ends_at',v_end);
END $fn$;

-- Solo amplía reporte deportivo con horarios; jamás expone bloqueos ni teléfonos.
CREATE OR REPLACE FUNCTION public.bp_tournament_bracket_report2026(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_t public.bp_tournaments%ROWTYPE;v_r jsonb;v_placements jsonb;v_revision timestamptz;
BEGIN
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id;
 IF NOT FOUND OR v_t.format<>'groups_knockout' OR v_t.rules_version<>2026 THEN RETURN NULL; END IF;
 IF NOT coalesce(public.bp_tournament_is_admin(),false) AND
    (v_t.is_published IS DISTINCT FROM TRUE OR v_t.fixture_published_at IS NULL) THEN RETURN NULL; END IF;
 SELECT date_trunc('milliseconds',max(r.updated_at)) INTO v_revision
 FROM public.bp_tournament_match_results r WHERE r.tournament_id=p_tournament_id;
 SELECT CASE WHEN b.group_revision IS NOT DISTINCT FROM v_revision THEN b.placements ELSE NULL END
 INTO v_placements FROM public.bp_tournament_brackets2026 b WHERE b.tournament_id=p_tournament_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_agg(jsonb_build_object(
   'id',m.id,'stage',m.stage,'slot',m.slot,'source1',m.source1,'source2',m.source2,
   'pair1_id',public.bp_tournament_source_pair2026(p_tournament_id,m.source1),
   'pair2_id',public.bp_tournament_source_pair2026(p_tournament_id,m.source2),
   'pair1_name',CASE WHEN p1.id IS NULL THEN NULL ELSE p1.player1_name||' y '||p1.player2_name END,
   'pair2_name',CASE WHEN p2.id IS NULL THEN NULL ELSE p2.player1_name||' y '||p2.player2_name END,
   'status',m.match_status,'sets',m.sets,'winner_pair_id',m.winner_pair_id,
   'schedule_status',coalesce(s.schedule_status,'unscheduled'),
   'scheduled_at',s.scheduled_at,'scheduled_ends_at',s.scheduled_ends_at,
   'court_label',s.court_label
 ) ORDER BY m.stage,m.slot) INTO v_r
 FROM public.bp_tournament_bracket_matches2026 m
 LEFT JOIN public.bp_tournament_bracket_schedule2026 s ON s.match_id=m.id
 LEFT JOIN public.bp_tournament_pairs p1 ON p1.id=public.bp_tournament_source_pair2026(p_tournament_id,m.source1)
 LEFT JOIN public.bp_tournament_pairs p2 ON p2.id=public.bp_tournament_source_pair2026(p_tournament_id,m.source2)
 WHERE m.tournament_id=p_tournament_id;
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'published',v_t.fixture_published_at IS NOT NULL,
     'placements',v_placements,'matches',coalesce(v_r,'[]'::jsonb));
END $fn$;
REVOKE ALL ON FUNCTION public.bp_tournament_bracket_schedule_cleanup2026() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_tournament_schedule_bracket_match2026(uuid,timestamptz,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_schedule_bracket_match2026(uuid,timestamptz,integer,text) TO authenticated;
COMMIT;