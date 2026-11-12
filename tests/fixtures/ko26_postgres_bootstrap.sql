-- Base PostgreSQL 17 sintética y descartable. NO contiene datos reales.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid$$;
CREATE FUNCTION public.bp_tournament_is_admin() RETURNS boolean LANGUAGE sql STABLE
AS $$SELECT true$$;

CREATE TABLE public.bp_tournaments (
 id uuid PRIMARY KEY,
 format text NOT NULL,
 status text NOT NULL,
 groups_published_at timestamptz,
 fixture_published_at timestamptz,
 is_published boolean NOT NULL DEFAULT false
);
CREATE TABLE public.bp_tournament_pairs(
 id uuid PRIMARY KEY,
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 player1_name text NOT NULL,
 player2_name text NOT NULL,
 status text NOT NULL,
 UNIQUE(id,tournament_id)
);
CREATE TABLE public.bp_tournament_groups (
 id uuid PRIMARY KEY,
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_number integer NOT NULL
);
CREATE TABLE public.bp_tournament_group_pairs (
 group_id uuid NOT NULL REFERENCES public.bp_tournament_groups(id),
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 pair_id uuid NOT NULL REFERENCES public.bp_tournament_pairs(id),
 PRIMARY KEY(group_id,pair_id)
);
CREATE TABLE public.bp_tournament_group_matches(
 id uuid PRIMARY KEY,
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_id uuid NOT NULL REFERENCES public.bp_tournament_groups(id),
 match_status text NOT NULL
);
CREATE TABLE public.bp_tournament_match_results(
 match_id uuid PRIMARY KEY REFERENCES public.bp_tournament_group_matches(id),
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_id uuid NOT NULL REFERENCES public.bp_tournament_groups(id),
 resolved_pair1_id uuid NOT NULL REFERENCES public.bp_tournament_pairs(id),
 resolved_pair2_id uuid NOT NULL REFERENCES public.bp_tournament_pairs(id),
 sets jsonb NOT NULL,
 sets_pair1 smallint NOT NULL,
 sets_pair2 smallint NOT NULL,
 winner_pair_id uuid NOT NULL REFERENCES public.bp_tournament_pairs(id)
);

INSERT INTO public.bp_tournaments(id,format,status,groups_published_at,fixture_published_at,is_published)
VALUES('00000000-0000-4000-8000-000000000100','groups_knockout','registration_closed',now(),now(),true);
INSERT INTO public.bp_tournament_groups(id,tournament_id,group_number) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000100',1),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000100',2);
INSERT INTO public.bp_tournament_pairs(id,tournament_id,player1_name,player2_name,status)
SELECT '00000000-0000-4000-8000-'||lpad(n::text,12,'0'),
 '00000000-0000-4000-8000-000000000100','Jugador '||n,'Pareja '||n,'approved'
 FROM generate_series(1,6) n;
INSERT INTO public.bp_tournament_group_pairs(group_id,tournament_id,pair_id)
SELECT CASE WHEN n<=3 THEN '00000000-0000-4000-8000-000000000101'
  ELSE '00000000-0000-4000-8000-000000000102' END::uuid,
  '00000000-0000-4000-8000-000000000100',
  ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid
 FROM generate_series(1,6) n;
-- Grupo A: 1 gana 2 y 3, 2 gana 3. Grupo B: 4 gana 5 y 6, 5 gana 6.
INSERT INTO public.bp_tournament_group_matches(id,tournament_id,group_id,match_status)
SELECT ('00000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,
 '00000000-0000-4000-8000-000000000100',
 CASE WHEN n<=3 THEN '00000000-0000-4000-8000-000000000101'
 ELSE '00000000-0000-4000-8000-000000000102' END::uuid,
 'played'
 FROM generate_series(1,6) n;
INSERT INTO public.bp_tournament_match_results(
 match_id,tournament_id,group_id,resolved_pair1_id,resolved_pair2_id,
 sets,sets_pair1,sets_pair2,winner_pair_id)
SELECT ('00000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,
 '00000000-0000-4000-8000-000000000100',
 CASE WHEN n<=3 THEN '00000000-0000-4000-8000-000000000101'
 ELSE '00000000-0000-4000-8000-000000000102' END::uuid,
 ('00000000-0000-4000-8000-'||lpad((
 CASE n WHEN 1 THEN 1 WHEN 2 THEN 1 WHEN 3 THEN 2
        WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 5 END)::text,12,'0'))::uuid,
 ('00000000-0000-4000-8000-'||lpad((
 CASE n WHEN 1 THEN 2 WHEN 2 THEN 3 WHEN 3 THEN 3
        WHEN 4 THEN 5 WHEN 5 THEN 6 ELSE 6 END)::text,12,'0'))::uuid,
 '[[6,4],[6,3]]'::jsonb,2,0,
 ('00000000-0000-4000-8000-'||lpad((
 CASE n WHEN 1 THEN 1 WHEN 2 THEN 1 WHEN 3 THEN 2
        WHEN 4 THEN 4 WHEN 5 THEN 4 ELSE 5 END)::text,12,'0'))::uuid
 FROM generate_series(1,6) n;
