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
