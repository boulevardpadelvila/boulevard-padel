-- P89 · PARIDAD ESTRUCTURAL: extensiones, checks, FK y tipos leídos
-- mediante SELECT de pg_catalog/information_schema en Supabase 10/11/2026.
-- NO es un volcado ni contiene datos de clientes reales.
-- Solo para base PostgreSQL 17 EFÍMERA en GitHub Actions.
-- Bootstrap previo: p89_postgres_bootstrap.sql. Antes de SQL89.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE public.reservation_status AS ENUM ('confirmed','cancelled','completed','no_show');
CREATE TYPE public.reservation_source AS ENUM ('web','admin','fixed');
CREATE TYPE public.fixed_turn_status AS ENUM ('pending','approved','rejected','suspended','cancelled','ended');
CREATE TYPE public.fixed_turn_duration_type AS ENUM ('defined','indefinite');
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE public.block_type ADD VALUE IF NOT EXISTS 'other';
CREATE TABLE auth.users(id uuid PRIMARY KEY);
INSERT INTO auth.users(id) VALUES('10000000-0000-0000-0000-000000000001');

CREATE TABLE public.bp_tournament_categories(
  id uuid PRIMARY KEY, name text NOT NULL, active boolean NOT NULL DEFAULT true
);
INSERT INTO public.bp_tournament_categories(id,name)
VALUES('40000000-0000-0000-0000-000000000001','Categoría simulada');

ALTER TABLE public.bp_tournaments
  ADD COLUMN category_id uuid NOT NULL DEFAULT '40000000-0000-0000-0000-000000000001'
    REFERENCES public.bp_tournament_categories(id) ON DELETE RESTRICT,
  ADD COLUMN starts_on date NOT NULL DEFAULT '2027-01-01',
  ADD COLUMN ends_on date,
  ADD COLUMN registration_opens_at timestamptz,
  ADD COLUMN registration_closes_at timestamptz,
  ADD COLUMN max_pairs integer DEFAULT 256,
  ADD COLUMN match_format text NOT NULL DEFAULT 'Mejor de 3 sets',
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN groups_published_at timestamptz,
  ADD COLUMN fixture_published_at timestamptz;
ALTER TABLE public.bp_tournaments
  ADD CONSTRAINT bp_tournaments_end_date_except_league
    CHECK(format='league' OR ends_on IS NOT NULL),
  ADD CONSTRAINT bp_tournaments_format_check
    CHECK(format IN('league','groups_knockout','knockout')),
  ADD CONSTRAINT bp_tournaments_status_check
    CHECK(status IN('draft','registration_open','registration_closed','in_progress','completed')),
  ADD CONSTRAINT bp_tournaments_max_pairs_check CHECK(max_pairs BETWEEN 2 AND 256),
  ADD CONSTRAINT bp_tournaments_name_check CHECK(char_length(btrim(name)) BETWEEN 3 AND 100),
  ADD CONSTRAINT bp_tournaments_match_format_check CHECK(char_length(btrim(match_format)) BETWEEN 2 AND 120),
  ADD CONSTRAINT bp_tournaments_valid_dates CHECK(ends_on>=starts_on),
  ADD CONSTRAINT bp_tournaments_valid_registration_dates
    CHECK(registration_opens_at IS NULL OR registration_closes_at IS NULL
      OR registration_closes_at>registration_opens_at);

ALTER TABLE public.bp_tournament_pairs
  ALTER COLUMN player1_name SET NOT NULL,
  ALTER COLUMN player2_name SET NOT NULL,
  ALTER COLUMN contact_phone SET DEFAULT '0000000000',
  ALTER COLUMN contact_phone SET NOT NULL,
  ADD COLUMN source text NOT NULL DEFAULT 'admin',
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bp_tournament_pairs
  ADD CONSTRAINT bp_pairs_different_players
    CHECK(lower(btrim(player1_name))<>lower(btrim(player2_name))),
  ADD CONSTRAINT bp_pairs_player1_length
    CHECK(char_length(btrim(player1_name)) BETWEEN 3 AND 100),
  ADD CONSTRAINT bp_pairs_player2_length
    CHECK(char_length(btrim(player2_name)) BETWEEN 3 AND 100),
  ADD CONSTRAINT bp_pairs_phone_length
    CHECK(char_length(btrim(contact_phone)) BETWEEN 6 AND 30),
  ADD CONSTRAINT bp_tournament_pairs_status_check
    CHECK(status IN('pending','approved','rejected')),
  ADD CONSTRAINT bp_tournament_pairs_source_check
    CHECK(source IN('admin','web'));

ALTER TABLE public.bp_league_matches
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.bp_league_matches
  ADD CONSTRAINT bp_league_distinct_pairs CHECK(pair1_id<>pair2_id),
  ADD CONSTRAINT bp_league_matches_leg_check CHECK(leg IN(1,2)),
  ADD CONSTRAINT bp_league_matches_match_number_check CHECK(match_number>=1),
  ADD CONSTRAINT bp_league_matches_round_number_check
    CHECK(round_number IS NULL OR round_number BETWEEN 1 AND 999),
  ADD CONSTRAINT bp_league_matches_match_status_check
    CHECK(match_status IN('pending','played')),
  ADD CONSTRAINT bp_league_matches_schedule_status_check
    CHECK(schedule_status IN('unscheduled','scheduled','postponed')),
  ADD CONSTRAINT bp_league_result_consistency CHECK(
    (match_status='pending' AND sets IS NULL AND sets_pair1 IS NULL
      AND sets_pair2 IS NULL AND winner_pair_id IS NULL)
    OR (match_status='played' AND round_number IS NOT NULL AND sets IS NOT NULL
      AND sets_pair1 IS NOT NULL AND sets_pair2 IS NOT NULL
      AND winner_pair_id IN(pair1_id,pair2_id))),
  ADD CONSTRAINT bp_league_schedule_consistency CHECK(
    (schedule_status='scheduled' AND scheduled_at IS NOT NULL
      AND scheduled_ends_at IS NOT NULL AND scheduled_ends_at>scheduled_at)
    OR (schedule_status<>'scheduled'
      AND scheduled_at IS NULL AND scheduled_ends_at IS NULL)),
  ADD CONSTRAINT bp_league_pair1_fk FOREIGN KEY(pair1_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT,
  ADD CONSTRAINT bp_league_pair2_fk FOREIGN KEY(pair2_id,tournament_id)
    REFERENCES public.bp_tournament_pairs(id,tournament_id) ON DELETE RESTRICT;

CREATE TABLE public.customers(id uuid PRIMARY KEY);
INSERT INTO public.customers(id)
VALUES('50000000-0000-0000-0000-000000000001');

CREATE TABLE public.fixed_turn_requests(
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  court_id uuid NOT NULL REFERENCES public.courts(id),
  weekday smallint NOT NULL, start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 90,
  duration_type public.fixed_turn_duration_type NOT NULL,
  start_date date NOT NULL, end_date date,
  status public.fixed_turn_status NOT NULL DEFAULT 'pending',
  customer_notes text, admin_notes text, approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations
  ALTER COLUMN status TYPE public.reservation_status USING status::public.reservation_status,
  ADD COLUMN reservation_code text NOT NULL DEFAULT 'SIM-'||substring(gen_random_uuid()::text,1,10),
  ADD COLUMN customer_id uuid NOT NULL DEFAULT '50000000-0000-0000-0000-000000000001'
    REFERENCES public.customers(id),
  ADD COLUMN source public.reservation_source NOT NULL DEFAULT 'web',
  ADD COLUMN fixed_turn_request_id uuid REFERENCES public.fixed_turn_requests(id),
  ADD COLUMN notes text,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN booking_name text,
  ADD COLUMN booking_phone text;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_reservation_code_key UNIQUE(reservation_code),
  ADD CONSTRAINT reservation_time_valid CHECK(ends_at>starts_at),
  ADD CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    court_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&
  ) WHERE(status<>'cancelled'::public.reservation_status);

-- Guardias del turnero: misma lógica de protección de horario que producción,
-- replicada únicamente en el runner efímero.
CREATE OR REPLACE FUNCTION public.bp_reservation_blockout_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
BEGIN
 IF NEW.status <> 'cancelled'::public.reservation_status THEN
   PERFORM pg_advisory_xact_lock(hashtextextended(NEW.court_id::text,72119));
   IF EXISTS(SELECT 1 FROM public.blockouts b
     WHERE b.court_id=NEW.court_id AND b.active=true
       AND b.starts_at<NEW.ends_at AND b.ends_at>NEW.starts_at) THEN
     RAISE EXCEPTION 'El horario seleccionado está bloqueado';
   END IF;
 END IF;
 RETURN NEW;
END;
$f$;
CREATE TRIGGER bp_reservation_blockout_guard_trg
BEFORE INSERT OR UPDATE OF court_id, starts_at, ends_at, status ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.bp_reservation_blockout_guard();

ALTER TABLE public.blockouts
  ADD CONSTRAINT blockout_time_valid CHECK(ends_at>starts_at),
  ADD CONSTRAINT blockouts_created_by_fkey FOREIGN KEY(created_by) REFERENCES auth.users(id);

-- Replicar ON DELETE CASCADE de los vínculos antiguos; SQL89 sumará el cuarto.
ALTER TABLE public.blockouts DROP CONSTRAINT blockouts_tournament_league_match_id_fkey;
ALTER TABLE public.blockouts ADD CONSTRAINT blockouts_tournament_league_match_id_fkey
  FOREIGN KEY(tournament_league_match_id) REFERENCES public.bp_league_matches(id) ON DELETE CASCADE;
ALTER TABLE public.blockouts DROP CONSTRAINT blockouts_tournament_knockout_match_id_fkey;
ALTER TABLE public.blockouts ADD CONSTRAINT blockouts_tournament_knockout_match_id_fkey
  FOREIGN KEY(tournament_knockout_match_id) REFERENCES public.bp_tournament_knockout_matches(id) ON DELETE CASCADE;
ALTER TABLE public.blockouts DROP CONSTRAINT blockouts_tournament_group_match_id_fkey;
ALTER TABLE public.blockouts ADD CONSTRAINT bp_blockout_group_match_fk
  FOREIGN KEY(tournament_group_match_id) REFERENCES public.bp_tournament_group_matches(id) ON DELETE CASCADE;

-- Data ficticia inspirada exclusivamente en CONTEOS, NO en registros reales.
-- Permite comprobar que los 39 bloqueos anteriores sobreviven a ALTER TABLE.
INSERT INTO public.courts(id,active)
VALUES('e0000000-0000-0000-0000-000000000001',true);
INSERT INTO public.bp_tournaments(id,name,format,status,ends_on)
VALUES('a0000000-0000-0000-0000-000000000001','Torneo legado simulado',
  'groups_knockout','in_progress','2027-12-31');

INSERT INTO public.bp_tournament_group_matches
  (id,tournament_id,schedule_status,scheduled_at,scheduled_ends_at)
SELECT ('b0000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'a0000000-0000-0000-0000-000000000001', 'scheduled',
  ('2027-05-01 13:00+00'::timestamptz+n*interval '1 day'),
  ('2027-05-01 14:30+00'::timestamptz+n*interval '1 day')
FROM generate_series(1,35) n;

INSERT INTO public.blockouts(court_id,starts_at,ends_at,block_type,
  reason,active,tournament_group_match_id)
SELECT 'e0000000-0000-0000-0000-000000000001',
  m.scheduled_at,m.scheduled_ends_at,'tournament','Partido simulado',true,m.id
FROM public.bp_tournament_group_matches m
WHERE m.tournament_id='a0000000-0000-0000-0000-000000000001';

INSERT INTO public.blockouts(court_id,starts_at,ends_at,block_type,reason,active)
SELECT 'e0000000-0000-0000-0000-000000000001',
 ('2027-08-01 13:00+00'::timestamptz+n*interval '1 day'),
 ('2027-08-01 14:30+00'::timestamptz+n*interval '1 day'),
 'manual','Bloqueo manual simulado',false
FROM generate_series(1,4) n;

INSERT INTO public.fixed_turn_requests(id,customer_id,court_id,weekday,
  start_time,duration_minutes,duration_type,start_date,end_date,status)
SELECT ('c0000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  '50000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  n, '10:00',90,'defined','2027-01-01','2027-12-31','approved'
FROM generate_series(1,4) n;

INSERT INTO public.reservations(court_id,starts_at,ends_at,status,source,
  fixed_turn_request_id)
SELECT 'e0000000-0000-0000-0000-000000000001',
  ('2027-09-01 10:00+00'::timestamptz+n*interval '1 day'),
  ('2027-09-01 11:30+00'::timestamptz+n*interval '1 day'),
  'confirmed',
  CASE WHEN n<=4 THEN 'fixed'::public.reservation_source
    ELSE 'web'::public.reservation_source END,
  CASE WHEN n<=4 THEN ('c0000000-0000-0000-0000-'||
    lpad(n::text,12,'0'))::uuid ELSE NULL END
FROM generate_series(1,35) n;

DO $test$
BEGIN
 IF (SELECT count(*) FROM public.blockouts)<>39
 OR (SELECT count(*) FROM public.reservations)<>35
 OR (SELECT count(*) FROM public.fixed_turn_requests)<>4 THEN
   RAISE EXCEPTION 'Precondición de paridad sintética falló';
 END IF;
 RAISE NOTICE 'P89 PARIDAD PRE-MIGRACION: 35 reservas, 4 turnos fijos y 39 bloqueos ficticios';
END;
$test$;
