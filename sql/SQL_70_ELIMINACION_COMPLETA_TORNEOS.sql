-- SQL 70 · Boulevard Pádel · 07/11/2026
-- ELIMINACIÓN DEFINITIVA E INTEGRAL DE UN TORNEO (con resultados incluidos)
-- PREPARADO PARA REVISIÓN, NO EJECUTADO AL CREAR ESTE ARCHIVO.
-- Requiere autorización previa antes de aplicar en producción.
-- Es una migración DEFINITIVA: SÍ guardar en SQL Editor si se ejecuta allí.
--
-- Se eliminan SOLO los datos que pertenecen al torneo seleccionado:
-- inscripciones, grupos, asignaciones, fixture, resultados, revisiones,
-- eliminatorias, programaciones, historial y bloqueos de sus partidos.
-- NO elimina reservas, clientes, turnos fijos, bloques independientes,
-- canchas ni categorías compartidas.
-- La RPC opera atómicamente: cualquier fallo revierte todo.
-- No crea registros históricos/tombstones de la operación en tablas del proyecto.
-- No puede prometer borrar rastros de WAL, backups ni registros de infraestructura.

-- La tabla privada de permisos transaccionales ya existe; ampliar acción admitida.
ALTER TABLE bp_revision_private.operation_access
  DROP CONSTRAINT operation_access_action_check;
ALTER TABLE bp_revision_private.operation_access
  ADD CONSTRAINT operation_access_action_check
  CHECK (action IN ('fixture','groups','delete'));

-- Sólo la RPC autorizada crea el comprobante transaccional; nadie desde
-- anon/authenticated puede escribir en el esquema/tabla privados.
CREATE OR REPLACE FUNCTION public.bp_tournament_delete_allowed(p_tournament_id uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT p_tournament_id IS NOT NULL
    AND COALESCE(public.bp_tournament_is_admin(), FALSE)
    AND EXISTS (
      SELECT 1 FROM bp_revision_private.operation_access a
      WHERE a.transaction_id = txid_current()
        AND a.tournament_id = p_tournament_id
        AND a.action = 'delete'
    );
$$;
REVOKE ALL ON FUNCTION public.bp_tournament_delete_allowed(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_delete_allowed(uuid)
  TO authenticated;

-- Conservar todas las protecciones de modificaciones ordinarias.
-- Cada guardián se adapta SOLO para DELETE y SOLO cuando la RPC
-- acredita el torneo exacto en la misma transacción.

-- Protección precisa: bp_tournament_blockout_integrity_guard
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
  ) THEN
    RETURN OLD;
  END IF;
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
END $function$;

-- Protección precisa: bp_group_match_scheduled_delete_guard
CREATE OR REPLACE FUNCTION public.bp_group_match_scheduled_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
  IF OLD.schedule_status = 'scheduled' OR EXISTS (
    SELECT 1 FROM public.blockouts b
    WHERE b.tournament_group_match_id = OLD.id AND b.active = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Primero posterga el partido antes de eliminarlo del fixture.';
  END IF;
  RETURN OLD;
END;
$function$;

-- Protección precisa: bp_guard_published_fixture_matches
CREATE OR REPLACE FUNCTION public.bp_guard_published_fixture_matches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_old_tournament uuid;
  v_new_tournament uuid;
  v_published_at timestamptz;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP<>'INSERT' THEN v_old_tournament:=OLD.tournament_id; END IF;
  IF TG_OP<>'DELETE' THEN v_new_tournament:=NEW.tournament_id; END IF;
  IF v_old_tournament IS NOT NULL THEN
    SELECT fixture_published_at INTO v_published_at
      FROM public.bp_tournaments WHERE id=v_old_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      IF TG_OP<>'UPDATE' THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='No se pueden eliminar partidos de un fixture publicado.';
      END IF;
      IF NEW.tournament_id IS DISTINCT FROM OLD.tournament_id
         OR NEW.group_id IS DISTINCT FROM OLD.group_id
         OR NEW.round_number IS DISTINCT FROM OLD.round_number
         OR NEW.match_number IS DISTINCT FROM OLD.match_number
         OR NEW.pair1_id IS DISTINCT FROM OLD.pair1_id
         OR NEW.pair2_id IS DISTINCT FROM OLD.pair2_id
         OR NEW.pair1_source_match_number IS DISTINCT FROM OLD.pair1_source_match_number
         OR NEW.pair2_source_match_number IS DISTINCT FROM OLD.pair2_source_match_number
         OR NEW.pair1_source_outcome IS DISTINCT FROM OLD.pair1_source_outcome
         OR NEW.pair2_source_outcome IS DISTINCT FROM OLD.pair2_source_outcome THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='No se pueden alterar los cruces publicados.';
      END IF;
    END IF;
  END IF;
  IF v_new_tournament IS NOT NULL AND v_new_tournament IS DISTINCT FROM v_old_tournament THEN
    SELECT fixture_published_at INTO v_published_at
      FROM public.bp_tournaments WHERE id=v_new_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='No se pueden agregar partidos a un fixture publicado.';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Protección precisa: bp_guard_started_group_match
CREATE OR REPLACE FUNCTION public.bp_guard_started_group_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_tournament_id uuid;
  v_started boolean;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP='INSERT' THEN
    v_tournament_id:=NEW.tournament_id;
    IF NEW.match_status<>'pending' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Los nuevos partidos deben crearse pendientes.';
    END IF;
  ELSE
    v_tournament_id:=OLD.tournament_id;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.tournament_id IS DISTINCT FROM OLD.tournament_id THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Un partido no puede transferirse a otro torneo.';
    END IF;
    IF OLD.match_status IN ('played','walkover') AND NEW.match_status NOT IN ('played','walkover') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='No se puede borrar un resultado disputado.';
    END IF;
  END IF;
  PERFORM 1 FROM public.bp_tournaments WHERE id=v_tournament_id FOR UPDATE;
  v_started:=public.bp_tournament_has_started_match(v_tournament_id);
  IF v_started THEN
    IF TG_OP<>'UPDATE' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='El torneo comenzó: no se pueden agregar ni eliminar partidos.';
    END IF;
    IF NEW.group_id IS DISTINCT FROM OLD.group_id
       OR NEW.round_number IS DISTINCT FROM OLD.round_number
       OR NEW.match_number IS DISTINCT FROM OLD.match_number
       OR NEW.pair1_id IS DISTINCT FROM OLD.pair1_id
       OR NEW.pair2_id IS DISTINCT FROM OLD.pair2_id
       OR NEW.pair1_source_match_number IS DISTINCT FROM OLD.pair1_source_match_number
       OR NEW.pair2_source_match_number IS DISTINCT FROM OLD.pair2_source_match_number
       OR NEW.pair1_source_outcome IS DISTINCT FROM OLD.pair1_source_outcome
       OR NEW.pair2_source_outcome IS DISTINCT FROM OLD.pair2_source_outcome THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='El torneo comenzó: los cruces ya no se pueden alterar.';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Protección precisa: bp_guard_published_group_rows
CREATE OR REPLACE FUNCTION public.bp_guard_published_group_rows()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_old_tournament uuid;
  v_new_tournament uuid;
  v_published_at timestamptz;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP <> 'INSERT' THEN
    v_old_tournament := OLD.tournament_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_tournament := NEW.tournament_id;
  END IF;

  IF v_old_tournament IS NOT NULL THEN
    SELECT t.groups_published_at INTO v_published_at
    FROM public.bp_tournaments t
    WHERE t.id = v_old_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Los grupos publicados no se pueden modificar.';
    END IF;
  END IF;

  IF v_new_tournament IS NOT NULL
     AND v_new_tournament IS DISTINCT FROM v_old_tournament THEN
    SELECT t.groups_published_at INTO v_published_at
    FROM public.bp_tournaments t
    WHERE t.id = v_new_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Los grupos publicados no se pueden modificar.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Protección precisa: bp_guard_started_group_structure
CREATE OR REPLACE FUNCTION public.bp_guard_started_group_structure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_old_tournament uuid;
    v_new_tournament uuid;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
    IF TG_OP <> 'INSERT' THEN
        v_old_tournament := OLD.tournament_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        v_new_tournament := NEW.tournament_id;
    END IF;

    -- Orden estable de bloqueo para operaciones entre torneos.
    PERFORM 1
    FROM public.bp_tournaments t
    WHERE t.id IN (v_old_tournament, v_new_tournament)
    ORDER BY t.id
    FOR UPDATE;

    IF (v_old_tournament IS NOT NULL
        AND public.bp_tournament_has_started_match(v_old_tournament))
       OR (v_new_tournament IS NOT NULL
        AND public.bp_tournament_has_started_match(v_new_tournament)) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'El torneo ya tiene un partido disputado. No se pueden modificar sus grupos.';
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$function$;

-- Protección precisa: bp_guard_published_roster
CREATE OR REPLACE FUNCTION public.bp_guard_published_roster()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_old_tournament uuid;
  v_new_tournament uuid;
  v_published_at timestamptz;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.tournament_id IS NOT DISTINCT FROM NEW.tournament_id
     AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old_tournament := OLD.tournament_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_tournament := NEW.tournament_id;
  END IF;

  IF v_old_tournament IS NOT NULL THEN
    SELECT t.groups_published_at INTO v_published_at
    FROM public.bp_tournaments t
    WHERE t.id = v_old_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'El plantel de un grupo publicado no se puede modificar.';
    END IF;
  END IF;

  IF v_new_tournament IS NOT NULL
     AND v_new_tournament IS DISTINCT FROM v_old_tournament THEN
    SELECT t.groups_published_at INTO v_published_at
    FROM public.bp_tournaments t
    WHERE t.id = v_new_tournament FOR SHARE;
    IF v_published_at IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'El plantel de un grupo publicado no se puede modificar.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Protección precisa: bp_guard_started_group_roster
CREATE OR REPLACE FUNCTION public.bp_guard_started_group_roster()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_old_tournament uuid;
    v_new_tournament uuid;
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
    IF TG_OP = 'UPDATE'
       AND NEW.tournament_id IS NOT DISTINCT FROM OLD.tournament_id
       AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF TG_OP <> 'INSERT' THEN
        v_old_tournament := OLD.tournament_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        v_new_tournament := NEW.tournament_id;
    END IF;

    PERFORM 1
    FROM public.bp_tournaments t
    WHERE t.id IN (v_old_tournament, v_new_tournament)
    ORDER BY t.id
    FOR UPDATE;

    IF (v_old_tournament IS NOT NULL
        AND public.bp_tournament_has_started_match(v_old_tournament))
       OR (v_new_tournament IS NOT NULL
        AND public.bp_tournament_has_started_match(v_new_tournament)) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'El torneo ya comenzó: no se pueden agregar ni retirar parejas participantes.';
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$function$;

-- Protección precisa: bp_ko_match_schedule_guard
CREATE OR REPLACE FUNCTION public.bp_ko_match_schedule_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE'
     AND public.bp_tournament_delete_allowed(OLD.tournament_id) THEN
    RETURN OLD;
  END IF;
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
END $function$;


-- Vista previa administrativa: sólo datos agregados, sin leer datos de jugadores.
CREATE OR REPLACE FUNCTION public.bp_admin_tournament_delete_preview(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
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
    'linked_blockouts', (
      SELECT count(*) FROM public.blockouts b
      WHERE b.tournament_group_match_id IN (
        SELECT m.id FROM public.bp_tournament_group_matches m WHERE m.tournament_id=p_tournament_id
      ) OR b.tournament_knockout_match_id IN (
        SELECT k.id FROM public.bp_tournament_knockout_matches k WHERE k.tournament_id=p_tournament_id
      )
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.bp_admin_tournament_delete_preview(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_admin_tournament_delete_preview(uuid)
  TO authenticated;


-- Reemplaza la RPC anterior de la MISMA firma sin crear otra entrada.
CREATE OR REPLACE FUNCTION public.bp_admin_delete_tournament_safely(
  p_tournament_id uuid, p_expected_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_pairs bigint;
  v_groups bigint;
  v_group_matches bigint;
  v_ko_matches bigint;
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
  SELECT count(*) INTO v_blocks FROM public.blockouts b
    WHERE b.tournament_group_match_id IN (
      SELECT id FROM public.bp_tournament_group_matches WHERE tournament_id=p_tournament_id
    ) OR b.tournament_knockout_match_id IN (
      SELECT id FROM public.bp_tournament_knockout_matches WHERE tournament_id=p_tournament_id
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
    'linked_blockouts_deleted',v_blocks
  );
END;
$$;
REVOKE ALL ON FUNCTION public.bp_admin_delete_tournament_safely(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_admin_delete_tournament_safely(uuid,text)
  TO authenticated;
