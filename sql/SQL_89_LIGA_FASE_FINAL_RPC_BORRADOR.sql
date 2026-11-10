-- Boulevard Pádel · Parche 89 · ETAPA 2B, RPC DE PROGRAMACIÓN Y RESULTADOS.
-- BORRADOR PARA REVISIÓN, NO ES UNA MIGRACIÓN EJECUTABLE.
-- NO INSTALAR EN SUPABASE. NO EJECUTAR NI GUARDAR EN SQL EDITOR.
-- Requiere, antes, SQL_89_LIGA_FASE_FINAL_BORRADOR.sql (también NO instalable).
-- Faltan incorporar: cierre, público y borrado integral; revisar seguridad,
-- dependencias e integridad con datos aislados antes de confeccionar SQL 89 FINAL.
-- Estas funciones no modifican bp_league_matches ni datos de fases antiguas.

-- 1. Bloqueos de tres partidos finales de Liga, sin reciclar vínculos
-- existentes de grupos, eliminatorias ni fase regular.
ALTER TABLE public.blockouts
  ADD COLUMN tournament_league_final_match_id uuid
  REFERENCES public.bp_league_final_matches(id) ON DELETE CASCADE;
ALTER TABLE public.blockouts DROP CONSTRAINT bp_blockout_one_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_one_match CHECK(
  num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
    tournament_league_match_id,tournament_league_final_match_id)<=1
);
ALTER TABLE public.blockouts DROP CONSTRAINT bp_tournament_blockout_requires_match;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_tournament_blockout_requires_match CHECK(
  block_type<>'tournament'::public.block_type OR
  num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
    tournament_league_match_id,tournament_league_final_match_id)=1
);
ALTER TABLE public.blockouts DROP CONSTRAINT bp_blockout_tournament_type_valid;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_tournament_type_valid CHECK(
  num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
    tournament_league_match_id,tournament_league_final_match_id)=0 OR
    block_type='tournament'::public.block_type
);
CREATE UNIQUE INDEX bp_lf_blockout_unique
  ON public.blockouts(tournament_league_final_match_id)
  WHERE tournament_league_final_match_id IS NOT NULL;

-- Conservar las restricciones antiguas y sumar la cuarta referencia.
CREATE OR REPLACE FUNCTION public.bp_tournament_blockout_integrity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
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
  ) THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' THEN
    IF OLD.active AND num_nonnulls(OLD.tournament_group_match_id,
      OLD.tournament_knockout_match_id,OLD.tournament_league_match_id,
      OLD.tournament_league_final_match_id)>0 THEN
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
  ) THEN
    RAISE EXCEPTION 'No se puede desvincular el bloqueo de su partido.'
      USING ERRCODE='23514';
  END IF;
  IF NEW.block_type='tournament'::public.block_type THEN
    IF num_nonnulls(NEW.tournament_group_match_id,
      NEW.tournament_knockout_match_id,NEW.tournament_league_match_id,
      NEW.tournament_league_final_match_id)<>1 THEN
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
    NEW.tournament_league_final_match_id)>0 THEN
    RAISE EXCEPTION 'Los bloqueos de partidos deben ser del tipo torneo.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_tournament_blockout_integrity_guard()
  FROM PUBLIC,anon,authenticated;

-- 2. Programación, reprogramación o postergación.
-- Permite asignar día y hora de la FINAL antes de conocer finalistas.
-- La cancha real nunca debe superponerse con reservas ni otros bloqueos.
CREATE OR REPLACE FUNCTION public.bp_league_final_schedule89(
  p_match_id uuid,p_start timestamptz,p_duration_minutes integer,
  p_court_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
DECLARE
  v_m public.bp_league_final_matches%ROWTYPE;
  v_t public.bp_tournaments%ROWTYPE;
  v_court uuid;
  v_end timestamptz;
  v_block uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
  END IF;
  SELECT t.* INTO v_t FROM public.bp_tournaments t
    JOIN public.bp_league_final_matches m ON m.tournament_id=t.id
    WHERE m.id=p_match_id FOR UPDATE OF t;
  IF NOT FOUND OR v_t.format<>'league' OR v_t.status NOT IN('registration_closed','in_progress') THEN
    RAISE EXCEPTION 'Liga no editable.' USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_m FROM public.bp_league_final_matches
    WHERE id=p_match_id FOR UPDATE;
  IF v_m.match_status='played' THEN
    RAISE EXCEPTION 'No se puede reprogramar un partido disputado.'
      USING ERRCODE='23514';
  END IF;
  IF p_start IS NOT NULL AND
    (p_duration_minutes IS NULL OR p_duration_minutes NOT IN(90,120)) THEN
    RAISE EXCEPTION 'La duración debe ser 90 o 120 minutos.'
      USING ERRCODE='23514';
  END IF;
  IF p_start IS NOT NULL THEN
    SELECT id INTO v_court FROM public.courts WHERE active
      ORDER BY created_at LIMIT 1;
    IF v_court IS NULL THEN
      RAISE EXCEPTION 'No hay cancha activa.' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT court_id INTO v_court FROM public.blockouts
      WHERE tournament_league_final_match_id=p_match_id;
  END IF;
  IF v_court IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_court::text,72119));
  END IF;
  SELECT id INTO v_block FROM public.blockouts
    WHERE tournament_league_final_match_id=p_match_id FOR UPDATE;
  IF p_start IS NOT NULL THEN
    v_end:=p_start+(p_duration_minutes||' minutes')::interval;
    IF EXISTS(
      SELECT 1 FROM public.reservations r WHERE r.court_id=v_court
        AND r.status<>'cancelled' AND r.starts_at<v_end AND r.ends_at>p_start
    ) OR EXISTS(
      SELECT 1 FROM public.blockouts b WHERE b.court_id=v_court
        AND b.active AND b.id IS DISTINCT FROM v_block
        AND b.starts_at<v_end AND b.ends_at>p_start
    ) THEN
      RAISE EXCEPTION 'Horario ocupado por reserva u otro partido.'
        USING ERRCODE='23514';
    END IF;
    UPDATE public.bp_league_final_matches
      SET schedule_status='scheduled',scheduled_at=p_start,
        scheduled_ends_at=v_end,
        court_label=left(nullif(btrim(p_court_label),''),100),
        updated_at=now()
      WHERE id=p_match_id;
    IF v_block IS NULL THEN
      INSERT INTO public.blockouts(court_id,starts_at,ends_at,block_type,
        reason,active,created_by,tournament_league_final_match_id)
      VALUES(v_court,p_start,v_end,'tournament'::public.block_type,
        'Liga: semifinal/final',true,auth.uid(),p_match_id);
    ELSE
      UPDATE public.blockouts SET court_id=v_court,starts_at=p_start,
        ends_at=v_end,active=true,updated_at=now() WHERE id=v_block;
    END IF;
  ELSE
    UPDATE public.bp_league_final_matches SET
      schedule_status='postponed',scheduled_at=NULL,
      scheduled_ends_at=NULL,court_label=NULL,updated_at=now()
      WHERE id=p_match_id;
    IF v_block IS NOT NULL THEN
      UPDATE public.blockouts SET active=false,updated_at=now() WHERE id=v_block;
      DELETE FROM public.blockouts WHERE id=v_block;
    END IF;
  END IF;
  RETURN jsonb_build_object('match_id',p_match_id,'scheduled_at',p_start,
    'ends_at',v_end);
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_league_final_schedule89(uuid,timestamptz,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_final_schedule89(uuid,timestamptz,integer,text)
  TO authenticated;

-- 3. Marcadores: dos o tres sets NORMALES.
-- La FINAL se resuelve solo cuando ambas semifinales tienen ganador.
CREATE OR REPLACE FUNCTION public.bp_league_final_save_result89(
  p_match_id uuid,p_sets jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
DECLARE
  v_m public.bp_league_final_matches%ROWTYPE;
  v_t public.bp_tournaments%ROWTYPE;
  v_final public.bp_league_final_matches%ROWTYPE;
  v_n integer;
  v_i integer;
  v_a integer;
  v_b integer;
  v_hi integer;
  v_lo integer;
  v_s1 integer:=0;
  v_s2 integer:=0;
  v_winner uuid;
  v_sf1 uuid;
  v_sf2 uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
  END IF;
  SELECT t.* INTO v_t FROM public.bp_tournaments t
    JOIN public.bp_league_final_matches m ON m.tournament_id=t.id
    WHERE m.id=p_match_id FOR UPDATE OF t;
  IF NOT FOUND OR v_t.format<>'league' OR v_t.status NOT IN('registration_closed','in_progress') THEN
    RAISE EXCEPTION 'Liga no editable.' USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_m FROM public.bp_league_final_matches
    WHERE id=p_match_id FOR UPDATE;
  IF v_m.pair1_id IS NULL OR v_m.pair2_id IS NULL THEN
    RAISE EXCEPTION 'Esperá el resultado de ambas semifinales.'
      USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_final FROM public.bp_league_final_matches
    WHERE tournament_id=v_m.tournament_id AND stage='final' AND slot=1
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La final no existe.' USING ERRCODE='23514';
  END IF;
  IF v_m.stage='semifinal' AND v_final.match_status='played' THEN
    RAISE EXCEPTION 'La final ya tiene resultado: no se puede corregir una semifinal.'
      USING ERRCODE='23514';
  END IF;
  IF p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
    RAISE EXCEPTION 'Ingresá el resultado por sets.' USING ERRCODE='23514';
  END IF;
  v_n:=jsonb_array_length(p_sets);
  IF v_n NOT IN (2,3) THEN
    RAISE EXCEPTION 'Se requieren dos o tres sets.' USING ERRCODE='23514';
  END IF;
  FOR v_i IN 0..(v_n-1) LOOP
    IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2
      OR jsonb_typeof(p_sets->v_i->0)<>'number'
      OR jsonb_typeof(p_sets->v_i->1)<>'number'
      OR (p_sets->v_i->>0)!~'^[0-9]{1,2}$'
      OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Set inválido.' USING ERRCODE='23514';
    END IF;
    v_a:=(p_sets->v_i->>0)::integer;
    v_b:=(p_sets->v_i->>1)::integer;
    v_hi:=greatest(v_a,v_b);
    v_lo:=least(v_a,v_b);
    IF v_a=v_b OR NOT (
      (v_hi=6 AND v_lo<=4) OR (v_hi=7 AND v_lo IN(5,6))
    ) THEN
      RAISE EXCEPTION 'Set inválido: usá 6-0 a 6-4, 7-5 o 7-6; no súper tie-break.'
        USING ERRCODE='23514';
    END IF;
    IF v_s1=2 OR v_s2=2 THEN
      RAISE EXCEPTION 'No corresponde otro set: el partido ya tiene ganador.'
        USING ERRCODE='23514';
    END IF;
    IF v_a>v_b THEN v_s1:=v_s1+1; ELSE v_s2:=v_s2+1; END IF;
  END LOOP;
  IF greatest(v_s1,v_s2)<>2 OR
    (v_n=2 AND least(v_s1,v_s2)<>0) OR
    (v_n=3 AND least(v_s1,v_s2)<>1) THEN
    RAISE EXCEPTION 'Marcador incompleto: se juega al mejor de tres sets normales.'
      USING ERRCODE='23514';
  END IF;
  v_winner:=CASE WHEN v_s1=2 THEN v_m.pair1_id ELSE v_m.pair2_id END;
  UPDATE public.bp_league_final_matches SET
    sets=p_sets,sets_pair1=v_s1,sets_pair2=v_s2,
    winner_pair_id=v_winner,match_status='played',updated_at=now()
    WHERE id=p_match_id;

  IF v_m.stage='semifinal' THEN
    SELECT winner_pair_id INTO v_sf1 FROM public.bp_league_final_matches
      WHERE tournament_id=v_m.tournament_id AND stage='semifinal' AND slot=1;
    SELECT winner_pair_id INTO v_sf2 FROM public.bp_league_final_matches
      WHERE tournament_id=v_m.tournament_id AND stage='semifinal' AND slot=2;
    UPDATE public.bp_league_final_matches SET
      pair1_id=v_sf1,pair2_id=v_sf2,updated_at=now()
      WHERE id=v_final.id AND match_status='pending';
    -- Conservar día/hora de la final si Martín la programó anticipadamente.
  END IF;
  RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,
    'sets_pair1',v_s1,'sets_pair2',v_s2);
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_league_final_save_result89(uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_final_save_result89(uuid,jsonb)
  TO authenticated;

-- 4. Congelar solo RESULTADOS de la fase regular después de sortear semifinales.
-- Las reprogramaciones anteriores a la fase final no se ven afectadas.
-- Esta protección rige en DB, no únicamente en el frontend.
CREATE OR REPLACE FUNCTION public.bp_league_final_lock_regular89()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS(SELECT 1 FROM public.bp_league_final_matches f
      WHERE f.tournament_id=OLD.tournament_id) THEN
      RAISE EXCEPTION 'La fase final ya fue creada; no se puede borrar un partido de Liga.'
        USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW.match_status,NEW.sets,NEW.sets_pair1,NEW.sets_pair2,NEW.winner_pair_id)
    IS DISTINCT FROM
    (OLD.match_status,OLD.sets,OLD.sets_pair1,OLD.sets_pair2,OLD.winner_pair_id)
    AND EXISTS(SELECT 1 FROM public.bp_league_final_matches f
      WHERE f.tournament_id=NEW.tournament_id) THEN
    RAISE EXCEPTION 'Fase final generada: los resultados de Liga están cerrados.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$lf$;
CREATE TRIGGER bp_league_final_lock_regular89_trg
BEFORE UPDATE OR DELETE ON public.bp_league_matches
FOR EACH ROW EXECUTE FUNCTION public.bp_league_final_lock_regular89();
REVOKE ALL ON FUNCTION public.bp_league_final_lock_regular89()
  FROM PUBLIC,anon,authenticated;

-- PENDIENTE: integrar a la migración única, guardia de finalización por
-- resultado de FINAL, eliminación completa, previsualización y RPC pública.
-- NO INSTALAR: la etapa 2B está aislada para revisión y pruebas posteriores.
