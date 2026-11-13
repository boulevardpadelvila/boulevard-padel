-- SQL95, base temporal PostgreSQL 17: todos los participantes son ficticios.
-- NO ejecutar en la base productiva.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TABLE public.bp_tournaments (
 id uuid PRIMARY KEY,
 format text NOT NULL,
 is_published boolean NOT NULL DEFAULT false,
 groups_published_at timestamptz,
 fixture_published_at timestamptz
);
CREATE TABLE public.bp_tournament_groups (
 id uuid PRIMARY KEY, tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_number integer NOT NULL
);
CREATE TABLE public.bp_tournament_pairs (
 id uuid PRIMARY KEY,tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 player1_name text NOT NULL,player2_name text NOT NULL,
 contact_phone text NOT NULL, status text NOT NULL, source text NOT NULL DEFAULT 'mock'
);
CREATE TABLE public.bp_tournament_group_pairs (
 id uuid PRIMARY KEY,tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_id uuid NOT NULL REFERENCES public.bp_tournament_groups(id),
 pair_id uuid NOT NULL REFERENCES public.bp_tournament_pairs(id)
);
CREATE TABLE public.bp_tournament_group_matches (
 id uuid PRIMARY KEY,tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id),
 group_id uuid NOT NULL REFERENCES public.bp_tournament_groups(id),
 round_number integer,match_number integer,
 pair1_id uuid,pair2_id uuid,
 pair1_source_match_number integer,pair1_source_outcome text,
 pair2_source_match_number integer,pair2_source_outcome text,
 schedule_status text,scheduled_at timestamptz,scheduled_ends_at timestamptz
);
ALTER TABLE public.bp_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tournament_group_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tournament_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tournament_group_matches ENABLE ROW LEVEL SECURITY;

-- Contrato anterior: visitantes solo SELECT directo de torneos publicados;
-- Admin con sesión puede leer la totalidad de sus tablas.
GRANT SELECT ON public.bp_tournaments TO anon, authenticated;
GRANT SELECT ON public.bp_tournament_groups,public.bp_tournament_group_pairs,
  public.bp_tournament_pairs,public.bp_tournament_group_matches TO authenticated;
CREATE POLICY t95_mock_tournament_public ON public.bp_tournaments FOR SELECT TO anon
  USING (is_published IS TRUE);
CREATE POLICY t95_mock_tournament_admin ON public.bp_tournaments FOR SELECT TO authenticated
  USING (current_setting('t95.is_admin',true) = 'yes');
CREATE POLICY t95_mock_groups_admin ON public.bp_tournament_groups FOR SELECT TO authenticated
  USING (current_setting('t95.is_admin',true) = 'yes');
CREATE POLICY t95_mock_group_pairs_admin ON public.bp_tournament_group_pairs FOR SELECT TO authenticated
  USING (current_setting('t95.is_admin',true) = 'yes');
CREATE POLICY t95_mock_pairs_admin ON public.bp_tournament_pairs FOR SELECT TO authenticated
  USING (current_setting('t95.is_admin',true) = 'yes');
CREATE POLICY t95_mock_matches_admin ON public.bp_tournament_group_matches FOR SELECT TO authenticated
  USING (current_setting('t95.is_admin',true) = 'yes');

-- Vistas reales, incluyendo el barrier de la vista original.
CREATE VIEW public.bp_public_tournament_groups
WITH (security_barrier=true) AS
 SELECT t.id AS tournament_id,g.group_number,p.player1_name,p.player2_name
 FROM public.bp_tournaments t
 JOIN public.bp_tournament_groups g ON g.tournament_id=t.id
 JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id AND gp.tournament_id=t.id
 JOIN public.bp_tournament_pairs p ON p.id=gp.pair_id AND p.tournament_id=t.id
 WHERE t.is_published=true AND t.groups_published_at IS NOT NULL AND p.status='approved';

CREATE VIEW public.bp_public_tournament_group_fixture AS
 SELECT t.id AS tournament_id,g.group_number,m.round_number,m.match_number,
  CASE WHEN m.pair1_id IS NULL THEN
    (CASE m.pair1_source_outcome WHEN 'winner' THEN 'Ganador ' ELSE 'Perdedor ' END || 'A' || m.pair1_source_match_number::text)
    ELSE p1.player1_name END AS pair1_player1_name,
  CASE WHEN m.pair1_id IS NULL THEN '' ELSE p1.player2_name END AS pair1_player2_name,
  CASE WHEN m.pair2_id IS NULL THEN
    (CASE m.pair2_source_outcome WHEN 'winner' THEN 'Ganador ' ELSE 'Perdedor ' END || 'A' || m.pair2_source_match_number::text)
    ELSE p2.player1_name END AS pair2_player1_name,
  CASE WHEN m.pair2_id IS NULL THEN '' ELSE p2.player2_name END AS pair2_player2_name,
  m.schedule_status,m.scheduled_at,m.scheduled_ends_at
 FROM public.bp_tournament_group_matches m
 JOIN public.bp_tournaments t ON t.id=m.tournament_id
 JOIN public.bp_tournament_groups g ON g.id=m.group_id AND g.tournament_id=m.tournament_id
 LEFT JOIN public.bp_tournament_group_pairs gp1 ON gp1.group_id=m.group_id AND gp1.tournament_id=m.tournament_id AND gp1.pair_id=m.pair1_id
 LEFT JOIN public.bp_tournament_group_pairs gp2 ON gp2.group_id=m.group_id AND gp2.tournament_id=m.tournament_id AND gp2.pair_id=m.pair2_id
 LEFT JOIN public.bp_tournament_pairs p1 ON p1.id=m.pair1_id AND p1.tournament_id=m.tournament_id AND p1.status='approved'
 LEFT JOIN public.bp_tournament_pairs p2 ON p2.id=m.pair2_id AND p2.tournament_id=m.tournament_id AND p2.status='approved'
 WHERE t.format='groups_knockout'
   AND t.is_published IS TRUE AND t.groups_published_at IS NOT NULL
   AND t.fixture_published_at IS NOT NULL
   AND (m.pair1_id IS NULL OR gp1.id IS NOT NULL)
   AND (m.pair2_id IS NULL OR gp2.id IS NOT NULL);

GRANT SELECT ON public.bp_public_tournament_groups,
 public.bp_public_tournament_group_fixture TO anon,authenticated;

-- Torneos: 101 publicado con fixture, 102 oculto, 103 grupos publicados
-- SIN fixture, 104 publicado sin grupos; todos datos ficticios.
INSERT INTO public.bp_tournaments(id,format,is_published,groups_published_at,fixture_published_at) VALUES
 ('00000000-0000-0000-0000-000000000101','groups_knockout',true,now(),now()),
 ('00000000-0000-0000-0000-000000000102','groups_knockout',false,now(),now()),
 ('00000000-0000-0000-0000-000000000103','groups_knockout',true,now(),null),
 ('00000000-0000-0000-0000-000000000104','groups_knockout',true,null,null);
INSERT INTO public.bp_tournament_groups(id,tournament_id,group_number) VALUES
 ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000101',1),
 ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000102',1),
 ('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000103',1),
 ('00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000104',1);
INSERT INTO public.bp_tournament_pairs(id,tournament_id,player1_name,player2_name,contact_phone,status) VALUES
 ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000101','PUBLICO-A1','PUBLICO-A2','TEL-PRIVADO-01','approved'),
 ('00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000101','PUBLICO-B1','PUBLICO-B2','TEL-PRIVADO-02','approved'),
 ('00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000101','PENDIENTE-C1','PENDIENTE-C2','TEL-PRIVADO-03','pending'),
 ('00000000-0000-0000-0000-000000000204','00000000-0000-0000-0000-000000000101','SIN-GRUPO-D1','SIN-GRUPO-D2','TEL-PRIVADO-04','approved'),
 ('00000000-0000-0000-0000-000000000205','00000000-0000-0000-0000-000000000102','OCULTO-E1','OCULTO-E2','TEL-PRIVADO-05','approved'),
 ('00000000-0000-0000-0000-000000000206','00000000-0000-0000-0000-000000000103','SOLO-GRUPOS-F1','SOLO-GRUPOS-F2','TEL-PRIVADO-06','approved'),
 ('00000000-0000-0000-0000-000000000207','00000000-0000-0000-0000-000000000104','NO-PUBLICADO-G1','NO-PUBLICADO-G2','TEL-PRIVADO-07','approved');
INSERT INTO public.bp_tournament_group_pairs(id,tournament_id,group_id,pair_id) VALUES
 ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000201'),
 ('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000202'),
 ('00000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000203'),
 ('00000000-0000-0000-0000-000000000405','00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000205'),
 ('00000000-0000-0000-0000-000000000406','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000206'),
 ('00000000-0000-0000-0000-000000000407','00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000304','00000000-0000-0000-0000-000000000207');
INSERT INTO public.bp_tournament_group_matches(
 id,tournament_id,group_id,round_number,match_number,pair1_id,pair2_id,schedule_status,scheduled_at,scheduled_ends_at
) VALUES
 ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000301',1,1,'00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','scheduled',now()+interval '3 days',now()+interval '3 days 90 minutes'),
 ('00000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000302',1,1,'00000000-0000-0000-0000-000000000205',null,'scheduled',now()+interval '3 days',now()+interval '3 days 90 minutes'),
 ('00000000-0000-0000-0000-000000000503','00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000303',1,1,'00000000-0000-0000-0000-000000000206',null,'scheduled',now()+interval '3 days',now()+interval '3 days 90 minutes');
