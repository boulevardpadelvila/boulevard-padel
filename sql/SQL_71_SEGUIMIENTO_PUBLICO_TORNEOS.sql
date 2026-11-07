-- Boulevard Pádel · SQL 71 · Seguimiento público de torneos
-- APLICADA en Supabase como migración bp_public_tournament_followup_71 (07/11/2026).
-- DEFINITIVA: SÍ conservar en GitHub como fuente de la migración. El Editor
-- SQL no guarda automáticamente las migraciones; NO volver a ejecutar.
--
-- Lectura estrictamente limitada a torneos VISIBLES y su estructura publicada.
-- Respuesta JSON: sin teléfonos, correos, usuarios administradores ni auditorías.
-- Nunca concede SELECT directo en tablas privadas de inscripciones/resultados.
-- La función usa SECURITY DEFINER únicamente como vista filtrada, sin escrituras.

CREATE OR REPLACE FUNCTION public.bp_public_tournament_followup(
  p_tournament_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_groups jsonb := '[]'::jsonb;
  v_matches jsonb := '[]'::jsonb;
  v_ko jsonb := NULL;
BEGIN
  IF p_tournament_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_t
  FROM public.bp_tournaments t
  WHERE t.id = p_tournament_id
    AND t.is_published IS TRUE
    AND t.format = 'groups_knockout';
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Nunca publicar resultados si la organización retiró los grupos o fixture.
  IF v_t.groups_published_at IS NULL OR v_t.fixture_published_at IS NULL THEN
    RETURN jsonb_build_object(
      'tournament_id', v_t.id,
      'groups', '[]'::jsonb,
      'group_matches', '[]'::jsonb,
      'knockout', NULL
    );
  END IF;

  -- Sólo parejas APROBADAS de los grupos PUBLICADOS, sin sus teléfonos.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'number', g.group_number,
      'pairs', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', p.id,
          'player1_name', p.player1_name,
          'player2_name', p.player2_name
        ) ORDER BY gp.created_at, p.id)
        FROM public.bp_tournament_group_pairs gp
        JOIN public.bp_tournament_pairs p
          ON p.id = gp.pair_id AND p.tournament_id = gp.tournament_id
        WHERE gp.group_id = g.id
          AND gp.tournament_id = v_t.id
          AND p.status = 'approved'
      ), '[]'::jsonb)
    ) ORDER BY g.group_number
  ), '[]'::jsonb) INTO v_groups
  FROM public.bp_tournament_groups g
  WHERE g.tournament_id = v_t.id;

  -- Resultados oficiales de grupo: sólo lectura y campos deportivos permitidos.
  -- No incluir created_by/updated_by ni notas de registro.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'group_id', m.group_id,
      'round_number', m.round_number,
      'match_number', m.match_number,
      'pair1_id', m.pair1_id,
      'pair2_id', m.pair2_id,
      'pair1_source_match_number', m.pair1_source_match_number,
      'pair2_source_match_number', m.pair2_source_match_number,
      'pair1_source_outcome', m.pair1_source_outcome,
      'pair2_source_outcome', m.pair2_source_outcome,
      'match_status', m.match_status,
      'schedule_status', m.schedule_status,
      'scheduled_at', m.scheduled_at,
      'sets', r.sets,
      'sets_pair1', r.sets_pair1,
      'sets_pair2', r.sets_pair2,
      'resolved_pair1_id', r.resolved_pair1_id,
      'resolved_pair2_id', r.resolved_pair2_id,
      'winner_pair_id', r.winner_pair_id
    ) ORDER BY g.group_number, m.round_number, m.match_number
  ), '[]'::jsonb) INTO v_matches
  FROM public.bp_tournament_group_matches m
  JOIN public.bp_tournament_groups g
    ON g.id = m.group_id AND g.tournament_id = m.tournament_id
  LEFT JOIN public.bp_tournament_match_results r
    ON r.match_id = m.id AND r.tournament_id = m.tournament_id
  WHERE m.tournament_id = v_t.id;

  -- Cuadro final del torneo publicado. No confundir publicación de estructura
  -- con resultados: se muestran marcadores sólo donde hay filas confirmadas.
  SELECT jsonb_build_object(
    'direct_semifinal_pair_id', b.direct_semifinal_pair_id,
    'quarterfinals', b.quarterfinals,
    'matches', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'stage', m.stage,
        'slot', m.slot,
        'match_status', m.match_status,
        'schedule_status', m.schedule_status,
        'scheduled_at', m.scheduled_at,
        'sets', r.sets,
        'resolved_pair1_id', r.resolved_pair1_id,
        'resolved_pair2_id', r.resolved_pair2_id,
        'winner_pair_id', r.winner_pair_id
      ) ORDER BY CASE m.stage
          WHEN 'quarterfinal' THEN 1
          WHEN 'semifinal' THEN 2
          WHEN 'final' THEN 3
          ELSE 4 END, m.slot)
      FROM public.bp_tournament_knockout_matches m
      LEFT JOIN public.bp_tournament_knockout_results r
        ON r.match_id = m.id AND r.tournament_id = m.tournament_id
      WHERE m.tournament_id = b.tournament_id
    ), '[]'::jsonb)
  ) INTO v_ko
  FROM public.bp_tournament_knockout_brackets b
  WHERE b.tournament_id = v_t.id;

  RETURN jsonb_build_object(
    'tournament_id', v_t.id,
    'groups', v_groups,
    'group_matches', v_matches,
    'knockout', v_ko
  );
END;
$function$;

-- Permiso público sólo para la respuesta sanitizada. Sin privilegios directos
-- sobre tablas de resultados o contactos.
REVOKE ALL ON FUNCTION public.bp_public_tournament_followup(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bp_public_tournament_followup(uuid)
  TO anon, authenticated;

COMMENT ON FUNCTION public.bp_public_tournament_followup(uuid) IS
  'Seguimiento público filtrado: torneos visibles y fase publicada; sin datos de contacto.';
