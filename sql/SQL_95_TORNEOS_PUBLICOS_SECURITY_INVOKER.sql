-- SQL95 · Boulevard Pádel · Vistas de torneos como SECURITY INVOKER.
-- Conserva el contrato público de las vistas y su security_barrier existente.
-- No escribe datos de jugadores, reservas, turnos, partidos ni torneos.
-- Importante: localhost y Cloudflare utilizan las mismas identidades anon/authenticated.
--
-- Consulta previa de seguridad (noviembre 2026): las tablas auxiliares estaban
-- protegidas por RLS y no eran legibles para anon; las vistas antiguas se ejecutan
-- como postgres y generan el aviso "SECURITY DEFINER VIEW".
-- Se habilita lectura *exclusivamente de columnas necesarias*, condicionada
-- por publicación real y por la asignación aprobada de parejas.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE
  v_n integer;
BEGIN
  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relkind = 'r' AND c.relrowsecurity IS TRUE
    AND c.relname IN (
      'bp_tournament_groups', 'bp_tournament_group_pairs',
      'bp_tournament_pairs', 'bp_tournament_group_matches'
    );
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'SQL95: abortada, las cuatro tablas de torneos deben tener RLS activa';
  END IF;

  SELECT count(*) INTO v_n
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind = 'v'
    AND c.relname IN ('bp_public_tournament_groups','bp_public_tournament_group_fixture');
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'SQL95: abortada, faltan vistas públicas existentes';
  END IF;

  SELECT count(*) INTO v_n
  FROM pg_policies p
  WHERE p.schemaname='public' AND p.policyname IN (
    'bp95_anon_groups_published',
    'bp95_anon_group_assignments_published',
    'bp95_anon_assigned_approved_pairs',
    'bp95_anon_fixture_published'
  );
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'SQL95: abortada, ya existen políticas bp95; revisar antes de repetir';
  END IF;
  IF has_column_privilege('anon','public.bp_tournament_pairs','contact_phone','SELECT') THEN
    RAISE EXCEPTION 'SQL95: abortada, contact_phone es visible a anon antes del cambio';
  END IF;
END;
$preflight$;

-- Política pública de grupos: no exponer borradores ni grupos no publicados.
CREATE POLICY bp95_anon_groups_published
ON public.bp_tournament_groups FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bp_tournaments t
    WHERE t.id = tournament_id
      AND t.is_published IS TRUE
      AND t.groups_published_at IS NOT NULL
  )
);

CREATE POLICY bp95_anon_group_assignments_published
ON public.bp_tournament_group_pairs FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bp_tournaments t
    WHERE t.id = tournament_id
      AND t.is_published IS TRUE
      AND t.groups_published_at IS NOT NULL
  )
);

-- No exponer parejas recién inscriptas, en revisión, ni parejas aprobadas
-- todavía no asignadas a una zona publicada.
CREATE POLICY bp95_anon_assigned_approved_pairs
ON public.bp_tournament_pairs FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1 FROM public.bp_tournaments t
    WHERE t.id = tournament_id
      AND t.is_published IS TRUE
      AND t.groups_published_at IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.bp_tournament_group_pairs gp
    WHERE gp.pair_id = bp_tournament_pairs.id
      AND gp.tournament_id = bp_tournament_pairs.tournament_id
  )
);

CREATE POLICY bp95_anon_fixture_published
ON public.bp_tournament_group_matches FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bp_tournaments t
    WHERE t.id = tournament_id
      AND t.format = 'groups_knockout'
      AND t.is_published IS TRUE
      AND t.groups_published_at IS NOT NULL
      AND t.fixture_published_at IS NOT NULL
  )
);

-- SELECT de columnas: intencionalmente NO conceder contact_phone, source,
-- timestamps privados ni permisos de INSERT/UPDATE/DELETE.
GRANT SELECT (id, tournament_id, group_number)
  ON public.bp_tournament_groups TO anon;

GRANT SELECT (id, tournament_id, group_id, pair_id)
  ON public.bp_tournament_group_pairs TO anon;

GRANT SELECT (id, tournament_id, player1_name, player2_name, status)
  ON public.bp_tournament_pairs TO anon;

GRANT SELECT (
  tournament_id, group_id, round_number, match_number,
  pair1_id, pair2_id,
  pair1_source_match_number, pair1_source_outcome,
  pair2_source_match_number, pair2_source_outcome,
  schedule_status, scheduled_at, scheduled_ends_at
) ON public.bp_tournament_group_matches TO anon;

-- Mantener los SELECT públicos ya autorizados sobre la vista (sin tocar los
-- SQL ni el JS que consultan estas vistas), cambiando solo el ejecutor.
-- SET no elimina "security_barrier=true" de bp_public_tournament_groups.
ALTER VIEW public.bp_public_tournament_groups
  SET (security_invoker = true);
ALTER VIEW public.bp_public_tournament_group_fixture
  SET (security_invoker = true);

DO $postcheck$
BEGIN
  IF has_column_privilege('anon','public.bp_tournament_pairs','contact_phone','SELECT') THEN
    RAISE EXCEPTION 'SQL95: abortada, exposición inesperada de teléfono';
  END IF;
  IF has_table_privilege('anon','public.bp_tournament_pairs','INSERT')
     OR has_table_privilege('anon','public.bp_tournament_pairs','UPDATE')
     OR has_table_privilege('anon','public.bp_tournament_pairs','DELETE') THEN
    RAISE EXCEPTION 'SQL95: abortada, escritura anon inesperada';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.oid='public.bp_public_tournament_groups'::regclass
      AND 'security_invoker=true'=ANY(c.reloptions)
      AND 'security_barrier=true'=ANY(c.reloptions)
  ) THEN
    RAISE EXCEPTION 'SQL95: abortada, la vista de grupos debe conservar security_barrier e invoker';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c WHERE c.oid='public.bp_public_tournament_group_fixture'::regclass
      AND 'security_invoker=true'=ANY(c.reloptions)
  ) THEN
    RAISE EXCEPTION 'SQL95: abortada, fixture no usa security_invoker';
  END IF;
END;
$postcheck$;

COMMIT;
