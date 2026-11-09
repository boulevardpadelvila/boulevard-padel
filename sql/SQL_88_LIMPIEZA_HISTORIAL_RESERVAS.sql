-- Boulevard Pádel · SQL 88 · LIMPIEZA SEGURA DE HISTORIAL
-- ESTADO: PREPARADO, NO INSTALADO EN SUPABASE.
-- Guardar este SQL en Supabase SQL Editor solamente cuando se autorice instalarlo.
-- NO ejecutar durante pruebas ni sobre datos reales sin aprobación explícita.
-- IMPORTANTE: La ejecución de este archivo CREA una función segura. NO BORRA
-- reservas por sí misma. Las eliminaciones requieren un Admin autenticado,
-- una vista previa y un segundo llamado con la firma de esa vista previa.

BEGIN;

CREATE OR REPLACE FUNCTION public.bp_admin_cleanup_reservations(
  p_cancelled boolean DEFAULT false,
  p_finished boolean DEFAULT false,
  p_fixed boolean DEFAULT false,
  p_expected_signature text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_today date;
  v_cancelled_ids uuid[] := ARRAY[]::uuid[];
  v_finished_ids uuid[] := ARRAY[]::uuid[];
  v_fixed_ids uuid[] := ARRAY[]::uuid[];
  v_fixed_reservation_ids uuid[] := ARRAY[]::uuid[];
  v_all_ids uuid[] := ARRAY[]::uuid[];
  v_signature text;
  v_expected integer;
  v_deleted_reservations integer := 0;
  v_deleted_fixed integer := 0;
  v_report jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores activos pueden limpiar el historial'
      USING ERRCODE = '42501';
  END IF;

  IF p_cancelled IS NULL OR p_finished IS NULL OR p_fixed IS NULL
     OR NOT (p_cancelled OR p_finished OR p_fixed) THEN
    RAISE EXCEPTION 'Seleccioná al menos un tipo de historial';
  END IF;

  -- Nunca se usa DELETE por fecha solamente ni se exponen permisos directos
  -- de DELETE al navegador. La transacción completa es atómica.
  PERFORM pg_advisory_xact_lock(hashtextextended('bp_admin_cleanup_reservations', 88119));
  v_today := (v_now AT TIME ZONE 'America/Argentina/Cordoba')::date;

  IF p_expected_signature IS NOT NULL THEN
    -- En la segunda llamada, inmovilizar los períodos candidatos y sus
    -- reservas durante la revalidación. El bloqueo de la fila padre impide
    -- que se agreguen nuevas reservas con esa FK mientras dura el DELETE.
    IF p_fixed THEN
      PERFORM f.id
        FROM public.fixed_turn_requests f
       WHERE f.status IN ('cancelled', 'ended')
          OR (f.status = 'approved'
              AND f.duration_type = 'defined'
              AND f.end_date < v_today)
       ORDER BY f.id
       FOR UPDATE;
    END IF;
    PERFORM r.id
      FROM public.reservations r
     WHERE (
       (p_cancelled AND r.fixed_turn_request_id IS NULL
          AND r.source <> 'fixed' AND r.status = 'cancelled')
       OR
       (p_finished AND r.fixed_turn_request_id IS NULL
          AND r.source <> 'fixed' AND r.ends_at <= v_now
          AND r.status IN ('confirmed', 'completed'))
       OR
       (p_fixed AND r.fixed_turn_request_id IN (
         SELECT f.id FROM public.fixed_turn_requests f
          WHERE f.status IN ('cancelled', 'ended')
             OR (f.status = 'approved'
                 AND f.duration_type = 'defined'
                 AND f.end_date < v_today)
       ))
     )
     ORDER BY r.id
     FOR UPDATE;
  END IF;

  -- Reservas normales canceladas. Incluye cancelaciones futuras (no ocupan).
  SELECT COALESCE(array_agg(r.id ORDER BY r.id), ARRAY[]::uuid[])
    INTO v_cancelled_ids
    FROM public.reservations r
   WHERE p_cancelled
     AND r.fixed_turn_request_id IS NULL
     AND r.source <> 'fixed'
     AND r.status = 'cancelled';

  -- En el Admin el estado visual «Finalizada» también incluye confirmadas
  -- cuyo fin ya pasó; PostgreSQL no las cambia automáticamente a completed.
  SELECT COALESCE(array_agg(r.id ORDER BY r.id), ARRAY[]::uuid[])
    INTO v_finished_ids
    FROM public.reservations r
   WHERE p_finished
     AND r.fixed_turn_request_id IS NULL
     AND r.source <> 'fixed'
     AND r.status IN ('confirmed', 'completed')
     AND r.ends_at <= v_now;

  -- Los turnos fijos solo son borrables si terminaron/cancelaron explícitamente
  -- o si su período definido venció en Argentina, aun con estado approved.
  -- Se protege cualquier serie con un encuentro confirmado aún no terminado.
  -- Solicitudes pending, approved vigentes, suspended o rejected NO se borran.
  SELECT COALESCE(array_agg(f.id ORDER BY f.id), ARRAY[]::uuid[])
    INTO v_fixed_ids
    FROM public.fixed_turn_requests f
   WHERE p_fixed
     AND (
       f.status IN ('cancelled', 'ended')
       OR (f.status = 'approved'
           AND f.duration_type = 'defined'
           AND f.end_date < v_today)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.reservations future
        WHERE future.fixed_turn_request_id = f.id
          AND future.status = 'confirmed'
          AND future.ends_at > v_now
     );

  -- La serie vencida se elimina completa (fechas jugadas y canceladas).
  -- Una reserva de un turno fijo todavía vigente nunca entra aquí.
  SELECT COALESCE(array_agg(r.id ORDER BY r.id), ARRAY[]::uuid[])
    INTO v_fixed_reservation_ids
    FROM public.reservations r
   WHERE r.fixed_turn_request_id = ANY(v_fixed_ids);

  v_all_ids := v_cancelled_ids || v_finished_ids || v_fixed_reservation_ids;
  v_expected := cardinality(v_all_ids);

  -- La firma vincula la selección y los IDs exactos vistos en el resumen
  -- con la segunda confirmación. Si algo cambia, abortamos antes de borrar.
  v_signature := md5(
    'bp88-v1|' ||
    p_cancelled::text || '|' || p_finished::text || '|' || p_fixed::text ||
    '|c=' || array_to_string(v_cancelled_ids, ',') ||
    '|t=' || array_to_string(v_finished_ids, ',') ||
    '|f=' || array_to_string(v_fixed_ids, ',') ||
    '|r=' || array_to_string(v_fixed_reservation_ids, ',')
  );

  v_report := jsonb_build_object(
    'cancelled_reservations', cardinality(v_cancelled_ids),
    'finished_reservations', cardinality(v_finished_ids),
    'fixed_turns', cardinality(v_fixed_ids),
    'fixed_reservations', cardinality(v_fixed_reservation_ids),
    'total_reservations', v_expected,
    'total_rows', v_expected + cardinality(v_fixed_ids),
    'signature', v_signature,
    'deleted', false
  );

  -- Primera llamada: simulación de conteos. NINGÚN DELETE.
  IF p_expected_signature IS NULL THEN
    RETURN v_report;
  END IF;

  IF p_expected_signature <> v_signature THEN
    RAISE EXCEPTION 'El historial cambió desde la vista previa. Revisá los registros y confirmá nuevamente.';
  END IF;
  IF v_expected = 0 AND cardinality(v_fixed_ids) = 0 THEN
    RAISE EXCEPTION 'No hay registros elegibles para eliminar';
  END IF;

  -- Se vuelven a validar las condiciones en el DELETE, incluso después de
  -- haber bloqueado las filas. Si las cantidades difieren, se hace ROLLBACK.
  DELETE FROM public.reservations r
   WHERE r.id = ANY(v_all_ids)
     AND (
       (p_cancelled AND r.fixed_turn_request_id IS NULL
          AND r.source <> 'fixed' AND r.status = 'cancelled')
       OR
       (p_finished AND r.fixed_turn_request_id IS NULL
          AND r.source <> 'fixed' AND r.status IN ('confirmed', 'completed')
          AND r.ends_at <= v_now)
       OR
       (p_fixed AND r.fixed_turn_request_id = ANY(v_fixed_ids))
     );
  GET DIAGNOSTICS v_deleted_reservations = ROW_COUNT;

  IF v_deleted_reservations <> v_expected THEN
    RAISE EXCEPTION 'El historial cambió. No se eliminó ningún registro. Volvé a revisar.';
  END IF;

  DELETE FROM public.fixed_turn_requests f
   WHERE f.id = ANY(v_fixed_ids)
     AND (
       f.status IN ('cancelled', 'ended')
       OR (f.status = 'approved'
           AND f.duration_type = 'defined'
           AND f.end_date < v_today)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.reservations r
        WHERE r.fixed_turn_request_id = f.id
     );
  GET DIAGNOSTICS v_deleted_fixed = ROW_COUNT;

  IF v_deleted_fixed <> cardinality(v_fixed_ids) THEN
    RAISE EXCEPTION 'No se pudieron verificar los turnos fijos. No se eliminó ningún registro.';
  END IF;

  RETURN v_report || jsonb_build_object('deleted', true);
END
$function$;

-- RPC exclusivamente autenticada, con segundo control de admin activo
-- dentro de la función. No se conceden DELETE directos.
REVOKE ALL ON FUNCTION public.bp_admin_cleanup_reservations(boolean, boolean, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bp_admin_cleanup_reservations(boolean, boolean, boolean, text)
  TO authenticated;

COMMIT;

-- PRUEBAS POSTERIORES A LA INSTALACIÓN (SOLO LECTURA; NO BORRAR):
-- SELECT proname, prosecdef FROM pg_proc
-- WHERE proname='bp_admin_cleanup_reservations'
--   AND pronamespace='public'::regnamespace;
-- SELECT has_function_privilege('anon',
--   'public.bp_admin_cleanup_reservations(boolean,boolean,boolean,text)', 'EXECUTE');
-- (Debe devolver false.) Las previsualizaciones reales se hacen desde Admin.
