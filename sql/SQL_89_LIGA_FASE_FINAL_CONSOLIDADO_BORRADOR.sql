-- BOULEVARD PÁDEL · PARCHE 89 · SQL CONSOLIDADO DE REVISIÓN (09/11/2026)
-- CONJUNTO 2A + 2B + 2C. ÚNICAMENTE PARA DESARROLLO/AUDITORÍA.
-- ⚠ NO INSTALAR EN SUPABASE. NO EJECUTAR NI GUARDAR EN SQL EDITOR.
-- NO ES UNA MIGRACIÓN DEFINITIVA NI VALIDADA TRANSACCIONALMENTE.
-- Se preservan intactos los tres borradores de origen.
-- Ajustes de auditoría: proteger INSERT/UPDATE estructural de fase regular
-- cuando la fase final ya existe, además de DELETE/corrección de marcadores;
-- INSERT del fixture serializado contra generación de semifinales.
-- Próximos requisitos: ensayo SQL en BD aislada, verificación de permisos,
-- revisión de transacciones concurrentes, integración Admin y pública, CI.
-- La aprobación de tests JavaScript NO autoriza instalación.
-- Protección transaccional: cualquier error revierte todas las etapas.
-- lock_timeout evita interrumpir el turnero si otra operación usa blockouts.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';


-- ========== ETAPA 2A: TABLA Y GENERACIÓN ==========
-- Boulevard Pádel · Parche 89 · ETAPA 2A: BASE TÉCNICA EN BORRADOR.
-- 09/11/2026 · SOLO RAMA DE DESARROLLO.
-- NO INSTALAR EN SUPABASE. NO EJECUTAR NI GUARDAR EN SQL EDITOR.
-- No es la migración definitiva: faltan RPC de programación y resultados,
-- bloqueo de cancha, publicación, guardias de finalización y borrado integral.
-- El fixture de la fase regular bp_league_matches NO se reescribe ni se mezcla
-- con los tres partidos definitivos de Liga.
--
-- Aprobado: top 4 por criterios actuales y sin desempate arbitrario.
-- SF1 = 1º vs 3º; SF2 = 2º vs 4º; final = ganadores.
-- SF y F: mejor de tres sets NORMALES; sin STB ni tercer puesto.

CREATE TABLE public.bp_league_final_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL
    REFERENCES public.bp_tournaments(id) ON DELETE RESTRICT,
  stage text NOT NULL CHECK(stage IN ('semifinal','final')),
  slot smallint NOT NULL,
  pair1_id uuid,
  pair2_id uuid,
  schedule_status text NOT NULL DEFAULT 'unscheduled'
    CHECK(schedule_status IN ('unscheduled','scheduled','postponed')),
  scheduled_at timestamptz,
  scheduled_ends_at timestamptz,
  court_label text,
  match_status text NOT NULL DEFAULT 'pending'
    CHECK(match_status IN ('pending','played')),
  sets jsonb,
  sets_pair1 smallint,
  sets_pair2 smallint,
  winner_pair_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bp_lf_stage_slot CHECK(
    (stage='semifinal' AND slot IN (1,2))
    OR (stage='final' AND slot=1)
  ),
  CONSTRAINT bp_lf_unique_match UNIQUE(tournament_id,stage,slot),
  CONSTRAINT bp_lf_pair1_fk FOREIGN KEY(pair1_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
  CONSTRAINT bp_lf_pair2_fk FOREIGN KEY(pair2_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
  CONSTRAINT bp_lf_participants CHECK(
    (pair1_id IS NULL AND pair2_id IS NULL AND stage='final')
    OR (pair1_id IS NOT NULL AND pair2_id IS NOT NULL
      AND pair1_id<>pair2_id)
  ),
  CONSTRAINT bp_lf_schedule_valid CHECK(
    (schedule_status='scheduled' AND scheduled_at IS NOT NULL
      AND scheduled_ends_at IS NOT NULL
      AND scheduled_ends_at-scheduled_at IN (interval '90 minutes', interval '120 minutes'))
    OR (schedule_status<>'scheduled'
      AND scheduled_at IS NULL AND scheduled_ends_at IS NULL)
  ),
  CONSTRAINT bp_lf_score_valid CHECK(
    (match_status='pending' AND sets IS NULL AND sets_pair1 IS NULL
      AND sets_pair2 IS NULL AND winner_pair_id IS NULL)
    OR (match_status='played' AND pair1_id IS NOT NULL
      AND pair2_id IS NOT NULL AND sets IS NOT NULL
      AND sets_pair1 IS NOT NULL AND sets_pair2 IS NOT NULL
      AND winner_pair_id IN(pair1_id,pair2_id))
  )
);

CREATE INDEX bp_lf_by_tournament
  ON public.bp_league_final_matches(tournament_id,stage,slot);
ALTER TABLE public.bp_league_final_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_league_final_matches FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bp_league_final_matches TO authenticated;
CREATE POLICY bp_lf_admin_read
  ON public.bp_league_final_matches FOR SELECT TO authenticated
  USING ((SELECT public.bp_tournament_is_admin()));
-- Sin permisos ni políticas INSERT/UPDATE/DELETE para usuarios;
-- escrituras futuras solo por funciones administrativas auditadas.

-- Generación determinista. No crea programación ni resultados.
-- Bloquea el torneo y las filas de Liga durante la comprobación.
CREATE OR REPLACE FUNCTION public.bp_league_prepare_final89(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_qualifiers uuid[];
  v_tied boolean;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id FOR UPDATE;
  IF NOT FOUND OR v_t.format<>'league' THEN
    RAISE EXCEPTION 'Liga inexistente.' USING ERRCODE='P0002';
  END IF;
  IF v_t.status NOT IN('registration_closed','in_progress') THEN
    RAISE EXCEPTION 'La Liga no admite generar semifinales en este estado.' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id) THEN
    RAISE EXCEPTION 'La fase final ya existe; no se vuelve a generar.' USING ERRCODE='23514';
  END IF;
  -- Evitar que resultados concurrentes cambien mientras se lee la tabla.
  PERFORM 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id FOR SHARE;
  SELECT count(*) INTO v_count FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id;
  IF v_count=0 OR EXISTS(
    SELECT 1 FROM public.bp_league_matches
    WHERE tournament_id=p_tournament_id AND match_status<>'played'
  ) THEN
    RAISE EXCEPTION 'Completá la fase regular antes de generar semifinales.'
      USING ERRCODE='23514';
  END IF;

  -- Puntuación Liga: 2 victoria; 1 derrota 2-1; 0 derrota 2-0.
  -- Sets y games idénticos a js/torneos-liga-motor.js:
  -- solo los dos sets normales suman games, NO el STB.
  WITH per_pair AS (
    SELECT m.pair1_id AS pair_id,
      CASE WHEN m.winner_pair_id=m.pair1_id THEN 2
           WHEN m.sets_pair1=1 THEN 1 ELSE 0 END AS points,
      m.sets_pair1::int AS sf,m.sets_pair2::int AS sc,
      ((m.sets->0->>0)::int+(m.sets->1->>0)::int) AS gf,
      ((m.sets->0->>1)::int+(m.sets->1->>1)::int) AS gc
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
    UNION ALL
    SELECT m.pair2_id,
      CASE WHEN m.winner_pair_id=m.pair2_id THEN 2
           WHEN m.sets_pair2=1 THEN 1 ELSE 0 END,
      m.sets_pair2::int,m.sets_pair1::int,
      ((m.sets->0->>1)::int+(m.sets->1->>1)::int),
      ((m.sets->0->>0)::int+(m.sets->1->>0)::int)
    FROM public.bp_league_matches m
    WHERE m.tournament_id=p_tournament_id AND m.match_status='played'
  ), totals AS (
    SELECT p.id AS pair_id,
      coalesce(sum(s.points),0)::int AS points,
      (coalesce(sum(s.sf),0)-coalesce(sum(s.sc),0))::int AS sd,
      coalesce(sum(s.sf),0)::int AS sf,
      (coalesce(sum(s.gf),0)-coalesce(sum(s.gc),0))::int AS gd,
      coalesce(sum(s.gf),0)::int AS gf
    FROM public.bp_tournament_pairs p
    LEFT JOIN per_pair s ON s.pair_id=p.id
    WHERE p.tournament_id=p_tournament_id AND p.status='approved'
    GROUP BY p.id
  ), ranking AS (
    SELECT pair_id,
      row_number() OVER (ORDER BY points DESC,sd DESC,sf DESC,
                        gd DESC,gf DESC,pair_id)::int AS pos,
      count(*) OVER(PARTITION BY points,sd,sf,gd,gf)::int AS same_metrics
    FROM totals
  )
  SELECT array_agg(pair_id ORDER BY pos),bool_or(same_metrics>1)
    INTO v_qualifiers,v_tied FROM ranking WHERE pos<=4;

  IF coalesce(array_length(v_qualifiers,1),0)<>4 THEN
    RAISE EXCEPTION 'Se necesitan cuatro clasificadas para semifinales.' USING ERRCODE='23514';
  END IF;
  IF coalesce(v_tied,false) THEN
    RAISE EXCEPTION 'Empate absoluto que afecta los cuatro puestos: Martín debe resolverlo.'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO public.bp_league_final_matches(tournament_id,stage,slot,pair1_id,pair2_id)
  VALUES (p_tournament_id,'semifinal',1,v_qualifiers[1],v_qualifiers[3]),
         (p_tournament_id,'semifinal',2,v_qualifiers[2],v_qualifiers[4]),
         (p_tournament_id,'final',1,NULL,NULL);
  RETURN jsonb_build_object(
    'created',true,'qualifiers',v_qualifiers,
    'semifinal1',jsonb_build_array(v_qualifiers[1],v_qualifiers[3]),
    'semifinal2',jsonb_build_array(v_qualifiers[2],v_qualifiers[4]),
    'final','ganador SF1 vs ganador SF2'
  );
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_league_prepare_final89(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_league_prepare_final89(uuid)
  TO authenticated;

-- ETAPA 2A NO ES INSTALABLE: faltan integraciones obligatorias antes
-- de que una Liga pueda generar/editar/cerrar partidos en producción.

-- ========== ETAPA 2B: BLOQUEOS, PROGRAMACIÓN Y RESULTADOS ==========
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
    -- La final mantiene ambos IDs NULL hasta contar con DOS ganadores:
    -- el CHECK bp_lf_participants no admite un solo finalista persistido.
    UPDATE public.bp_league_final_matches SET
      pair1_id=CASE WHEN v_sf1 IS NOT NULL AND v_sf2 IS NOT NULL
        THEN v_sf1 ELSE NULL END,
      pair2_id=CASE WHEN v_sf1 IS NOT NULL AND v_sf2 IS NOT NULL
        THEN v_sf2 ELSE NULL END,
      updated_at=now()
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
  IF TG_OP='INSERT' THEN
    -- Serializar altas del fixture contra bp_league_prepare_final89.
    -- El generador bloquea el torneo FOR UPDATE; esta toma FOR SHARE
    -- antes de consultar si existen semifinales, evitando altas fantasma.
    -- No se exige este bloqueo para UPDATE de resultados, para no invertir
    -- el orden con bp_league_save_result (que bloquea primero el partido).
    PERFORM 1 FROM public.bp_tournaments t
      WHERE t.id=NEW.tournament_id FOR SHARE;
    IF EXISTS(SELECT 1 FROM public.bp_league_final_matches f
      WHERE f.tournament_id=NEW.tournament_id) THEN
      RAISE EXCEPTION 'La fase final ya fue creada; no se puede agregar un partido regular.'
        USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN
    IF EXISTS(SELECT 1 FROM public.bp_league_final_matches f
      WHERE f.tournament_id=OLD.tournament_id) THEN
      RAISE EXCEPTION 'La fase final ya fue creada; no se puede borrar un partido de Liga.'
        USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  -- Congelar participantes, estructura y marcadores, pero NO la programación
  -- (fecha, duración y cancha), que Martín puede gestionar por separado.
  IF (NEW.tournament_id,NEW.match_number,NEW.round_number,NEW.leg,
      NEW.pair1_id,NEW.pair2_id,NEW.match_status,
      NEW.sets,NEW.sets_pair1,NEW.sets_pair2,NEW.winner_pair_id)
    IS DISTINCT FROM
     (OLD.tournament_id,OLD.match_number,OLD.round_number,OLD.leg,
      OLD.pair1_id,OLD.pair2_id,OLD.match_status,
      OLD.sets,OLD.sets_pair1,OLD.sets_pair2,OLD.winner_pair_id)
    AND (EXISTS(SELECT 1 FROM public.bp_league_final_matches f
          WHERE f.tournament_id=OLD.tournament_id)
      OR EXISTS(SELECT 1 FROM public.bp_league_final_matches f
          WHERE f.tournament_id=NEW.tournament_id)) THEN
    RAISE EXCEPTION 'Fase final generada: fixture y resultados regulares cerrados.'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$lf$;
CREATE TRIGGER bp_league_final_lock_regular89_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.bp_league_matches
FOR EACH ROW EXECUTE FUNCTION public.bp_league_final_lock_regular89();
REVOKE ALL ON FUNCTION public.bp_league_final_lock_regular89()
  FROM PUBLIC,anon,authenticated;

-- PENDIENTE: integrar a la migración única, guardia de finalización por
-- resultado de FINAL, eliminación completa, previsualización y RPC pública.
-- NO INSTALAR: la etapa 2B está aislada para revisión y pruebas posteriores.

-- ========== ETAPA 2C: CIERRE, PÚBLICO Y ELIMINACIÓN ==========
-- Boulevard Pádel · Parche 89 · ETAPA 2C: cierre seguro, lectura pública y eliminación íntegra.
-- SOLO BORRADOR DE DESARROLLO. NO ES UNA MIGRACIÓN EJECUTABLE.
-- NO INSTALAR EN SUPABASE. NO EJECUTAR NI GUARDAR EN SQL EDITOR.
-- Requiere 2A y 2B; faltan consolidación, integración Admin/pública,
-- validación SQL aislada y autorización explícita antes de ejecutar.
-- Funciones de borrado y previsualización derivadas de las DEFINICIONES
-- VIGENTES y verificadas por lectura en Supabase el 09/11/2026.
-- Conserva los controles admin/identidad, la previsualización y el acceso
-- transaccional bp_revision_private existentes. No ejecuta borrados aquí.



-- Cierre: primero completar la fase regular, luego dos SF y final.
-- Esta función reemplaza únicamente la guardia de formato 'league';
-- los otros formatos conservan su conducta original.
CREATE OR REPLACE FUNCTION public.bp_league_finish_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
BEGIN
  IF NEW.format='league' AND NEW.status='completed'
    AND OLD.status IS DISTINCT FROM 'completed' THEN

    IF NOT EXISTS(
      SELECT 1 FROM public.bp_league_matches WHERE tournament_id=NEW.id
    ) OR EXISTS(
      SELECT 1 FROM public.bp_league_matches
      WHERE tournament_id=NEW.id AND match_status<>'played'
    ) THEN
      RAISE EXCEPTION 'Completá todos los partidos de fase regular de Liga.'
        USING ERRCODE='23514';
    END IF;

    IF (SELECT count(*) FROM public.bp_league_final_matches
      WHERE tournament_id=NEW.id)<>3 OR
      (SELECT count(*) FROM public.bp_league_final_matches
       WHERE tournament_id=NEW.id AND stage='semifinal'
         AND match_status='played')<>2 THEN
      RAISE EXCEPTION 'Completá ambas semifinales antes de cerrar Liga.'
        USING ERRCODE='23514';
    END IF;

    IF NOT EXISTS(
      SELECT 1 FROM public.bp_league_final_matches f
      JOIN public.bp_league_final_matches s1
        ON s1.tournament_id=f.tournament_id
        AND s1.stage='semifinal' AND s1.slot=1
      JOIN public.bp_league_final_matches s2
        ON s2.tournament_id=f.tournament_id
        AND s2.stage='semifinal' AND s2.slot=2
      WHERE f.tournament_id=NEW.id AND f.stage='final' AND f.slot=1
        AND f.match_status='played'
        AND f.winner_pair_id IS NOT NULL
        AND f.winner_pair_id IN(f.pair1_id,f.pair2_id)
        AND s1.match_status='played' AND s2.match_status='played'
        AND f.pair1_id=s1.winner_pair_id
        AND f.pair2_id=s2.winner_pair_id
    ) THEN
      RAISE EXCEPTION 'La final debe estar disputada y tener Campeón y Subcampeón.'
        USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_league_finish_guard()
  FROM PUBLIC,anon,authenticated;

-- Lectura pública sanitizada: no devuelve teléfonos, perfiles ni datos de contacto.
-- Complemento del RPC existente bp_public_league_followup (no lo sustituye).
CREATE OR REPLACE FUNCTION public.bp_public_league_final89(
  p_tournament_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $lf$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
BEGIN
  SELECT * INTO v_t FROM public.bp_tournaments
  WHERE id=p_tournament_id AND format='league' AND is_published=true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'tournament_id',v_t.id,
    'status',v_t.status,
    'matches',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id',m.id,'stage',m.stage,'slot',m.slot,
        'pair1_id',m.pair1_id,'pair2_id',m.pair2_id,
        'schedule_status',m.schedule_status,
        'scheduled_at',m.scheduled_at,
        'scheduled_ends_at',m.scheduled_ends_at,
        'court_label',m.court_label,
        'match_status',m.match_status,'sets',m.sets,
        'sets_pair1',m.sets_pair1,'sets_pair2',m.sets_pair2,
        'winner_pair_id',m.winner_pair_id
      ) ORDER BY CASE WHEN m.stage='semifinal' THEN 1 ELSE 2 END,m.slot)
      FROM public.bp_league_final_matches m
      WHERE m.tournament_id=v_t.id
    ),'[]'::jsonb),
    'champion_pair_id',(
      SELECT m.winner_pair_id FROM public.bp_league_final_matches m
      WHERE m.tournament_id=v_t.id AND m.stage='final' AND m.slot=1
        AND m.match_status='played' AND v_t.status='completed'
    ),
    'runner_up_pair_id',(
      SELECT CASE WHEN m.winner_pair_id=m.pair1_id THEN m.pair2_id
                  WHEN m.winner_pair_id=m.pair2_id THEN m.pair1_id
                  ELSE NULL END
      FROM public.bp_league_final_matches m
      WHERE m.tournament_id=v_t.id AND m.stage='final' AND m.slot=1
        AND m.match_status='played' AND v_t.status='completed'
    )
  );
END;
$lf$;
REVOKE ALL ON FUNCTION public.bp_public_league_final89(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_public_league_final89(uuid)
  TO anon,authenticated;

-- Previsualización de borrado seguro (incluye los tres partidos y bloqueos finales)
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
    'league_final_matches', (SELECT count(*) FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id),
    'league_final_results', (SELECT count(*) FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id AND match_status='played'),
    'linked_blockouts', (
      SELECT count(*) FROM public.blockouts b
      WHERE b.tournament_group_match_id IN (
        SELECT m.id FROM public.bp_tournament_group_matches m WHERE m.tournament_id=p_tournament_id
      ) OR b.tournament_knockout_match_id IN (
        SELECT k.id FROM public.bp_tournament_knockout_matches k WHERE k.tournament_id=p_tournament_id
      ) OR b.tournament_league_match_id IN (
        SELECT lm.id FROM public.bp_league_matches lm WHERE lm.tournament_id=p_tournament_id
      ) OR b.tournament_league_final_match_id IN (
        SELECT fm.id FROM public.bp_league_final_matches fm WHERE fm.tournament_id=p_tournament_id
      )
    )
  );
END;
$function$
;

-- Borrado seguro íntegro: preservar controles históricos, borrar bloqueos finales
-- junto con los demás del torneo y luego sus tres partidos antes de parejas.
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
  v_league_final_matches bigint;
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
  SELECT count(*) INTO v_league_final_matches FROM public.bp_league_final_matches
    WHERE tournament_id=p_tournament_id;
  SELECT count(*) INTO v_blocks FROM public.blockouts b
    WHERE b.tournament_group_match_id IN (
      SELECT id FROM public.bp_tournament_group_matches WHERE tournament_id=p_tournament_id
    ) OR b.tournament_knockout_match_id IN (
      SELECT id FROM public.bp_tournament_knockout_matches WHERE tournament_id=p_tournament_id
    ) OR b.tournament_league_match_id IN (
      SELECT id FROM public.bp_league_matches WHERE tournament_id=p_tournament_id
    )
    OR b.tournament_league_final_match_id IN (
      SELECT id FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id
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
  )
    OR b.tournament_league_final_match_id IN (
      SELECT id FROM public.bp_league_final_matches WHERE tournament_id=p_tournament_id
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
  -- Liga: primero eliminar exclusivamente la fase final de esta competencia.
  DELETE FROM public.bp_league_final_matches fm
  WHERE fm.tournament_id=p_tournament_id;
  -- Luego liberar fixture y configuración ANTES de borrar las parejas.
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
    'league_final_matches_deleted',v_league_final_matches,
    'linked_blockouts_deleted',v_blocks
  );
END;
$function$
;


-- NO INSTALAR: pendiente auditoría e integración de todas las etapas 2A–2C.

COMMIT;
