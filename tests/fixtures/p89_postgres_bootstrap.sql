-- Boulevard Pádel · P89 · Harness PostgreSQL 17 aislado para GitHub Actions
-- SOLO TEST, NO es el esquema productivo ni se conecta a Supabase.
-- Las tablas auxiliares reproducen las columnas/dependencias usadas por SQL89.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA bp_revision_private;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $a$ SELECT NULLIF(current_setting('app.test_uid',true),'')::uuid $a$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.bp_tournament_is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $f$
  SELECT COALESCE(current_setting('app.test_admin',true),'')='on'
$f$;
CREATE OR REPLACE FUNCTION public.bp_tournament_delete_allowed(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $f$
  SELECT COALESCE(current_setting('app.test_delete_allowed',true),'')='on'
$f$;
CREATE TYPE public.block_type AS ENUM ('tournament','manual');
CREATE TABLE public.bp_tournaments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  format text NOT NULL,
  status text NOT NULL,
  is_published boolean NOT NULL DEFAULT false
);
CREATE TABLE public.bp_tournament_pairs (
  id uuid PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
  status text NOT NULL DEFAULT 'approved',
  player1_name text,
  player2_name text,
  contact_phone text,
  UNIQUE(id,tournament_id)
);
CREATE TABLE public.bp_league_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
  pair1_id uuid NOT NULL,
  pair2_id uuid NOT NULL,
  match_number integer NOT NULL,
  round_number integer,
  leg smallint NOT NULL DEFAULT 1,
  match_status text NOT NULL DEFAULT 'pending',
  sets jsonb,
  sets_pair1 smallint,
  sets_pair2 smallint,
  winner_pair_id uuid,
  schedule_status text NOT NULL DEFAULT 'unscheduled',
  scheduled_at timestamptz,
  scheduled_ends_at timestamptz,
  court_label text,
  UNIQUE(tournament_id,match_number)
);
CREATE TABLE public.courts (
  id uuid PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid REFERENCES public.courts(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL
);
CREATE TABLE public.bp_tournament_group_matches (
  id uuid PRIMARY KEY, tournament_id uuid,
  schedule_status text, scheduled_at timestamptz, scheduled_ends_at timestamptz
);
CREATE TABLE public.bp_tournament_knockout_matches (
  id uuid PRIMARY KEY, tournament_id uuid,
  schedule_status text, scheduled_at timestamptz, scheduled_ends_at timestamptz
);
CREATE TABLE public.blockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id uuid NOT NULL REFERENCES public.courts(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  block_type public.block_type NOT NULL,
  reason text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tournament_group_match_id uuid REFERENCES public.bp_tournament_group_matches(id),
  tournament_knockout_match_id uuid REFERENCES public.bp_tournament_knockout_matches(id),
  tournament_league_match_id uuid REFERENCES public.bp_league_matches(id),
  CONSTRAINT bp_blockout_one_match CHECK(num_nonnulls(
    tournament_group_match_id,tournament_knockout_match_id,tournament_league_match_id)<=1),
  CONSTRAINT bp_tournament_blockout_requires_match CHECK(
    block_type<>'tournament'::public.block_type OR
    num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
      tournament_league_match_id)=1),
  CONSTRAINT bp_blockout_tournament_type_valid CHECK(
    num_nonnulls(tournament_group_match_id,tournament_knockout_match_id,
      tournament_league_match_id)=0 OR block_type='tournament'::public.block_type)
);
CREATE TABLE public.bp_tournament_groups (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_match_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_knockout_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_match_result_revisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),match_id uuid);
CREATE TABLE public.bp_tournament_knockout_brackets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_group_pairs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_league_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_match_schedule_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE public.bp_tournament_revision_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tournament_id uuid);
CREATE TABLE bp_revision_private.operation_access (
  transaction_id bigint NOT NULL,
  tournament_id uuid NOT NULL,
  action text NOT NULL
);
-- Simula las guardias/activadores ya existentes: CREATE OR REPLACE debe preservarlos.
CREATE OR REPLACE FUNCTION public.bp_league_finish_guard() RETURNS trigger
LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;
CREATE TRIGGER bp_league_finish_ready
BEFORE UPDATE OF status ON public.bp_tournaments
FOR EACH ROW EXECUTE FUNCTION public.bp_league_finish_guard();
CREATE OR REPLACE FUNCTION public.bp_tournament_blockout_integrity_guard()
RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $f$;
CREATE TRIGGER bp_tournament_blockout_integrity_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.blockouts
FOR EACH ROW EXECUTE FUNCTION public.bp_tournament_blockout_integrity_guard();
