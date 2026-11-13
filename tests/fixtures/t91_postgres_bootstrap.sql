-- Ampliación del PostgreSQL 17 temporal, tras aplicar SQL90.
CREATE TABLE public.bp_league_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
 pair1_id uuid NOT NULL,
 pair2_id uuid NOT NULL,
 round_number integer,
 match_status text NOT NULL DEFAULT 'pending',
 sets jsonb,
 sets_pair1 smallint,
 sets_pair2 smallint,
 winner_pair_id uuid,
 updated_at timestamptz DEFAULT now()
);
INSERT INTO public.bp_tournaments(id,name,format,status,is_published)
VALUES('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','Liga SQL91','league','registration_closed',false);
INSERT INTO public.bp_league_matches(id,tournament_id,pair1_id,pair2_id,round_number)
VALUES('cccccccc-cccc-4ccc-cccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
'aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000002',1);