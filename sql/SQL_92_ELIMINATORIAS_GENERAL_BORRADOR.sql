-- Boulevard Pádel · SQL92 · Fase eliminatoria general 6–40 (BORRADOR).
-- Solo usar tras validar con PostgreSQL aislado y pruebas de no-regresión.
-- Crea tablas y RPC nuevas; no altera reservas, turnos fijos ni blockouts.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';

CREATE TABLE public.bp_ko26_draws (
 tournament_id uuid PRIMARY KEY REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
 plan jsonb NOT NULL CHECK(jsonb_typeof(plan)='object'),
 placements jsonb NOT NULL CHECK(jsonb_typeof(placements)='array'),
 manual_reason text,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.bp_ko26_matches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tournament_id uuid NOT NULL REFERENCES public.bp_ko26_draws(tournament_id) ON DELETE CASCADE,
 code text NOT NULL CHECK(code ~ '^(P[0-9]+|R[0-9]+-[0-9]+)$'),
 round_number smallint NOT NULL CHECK(round_number>=0),
 slot smallint NOT NULL CHECK(slot>=1),
 stage text NOT NULL CHECK(stage IN ('preliminary','round_of_16','quarterfinal','semifinal','final')),
 source1 text NOT NULL,source2 text NOT NULL,
 pair1_id uuid,pair2_id uuid,winner_pair_id uuid,
 sets jsonb,
 match_status text NOT NULL DEFAULT 'pending' CHECK(match_status IN ('pending','played')),
 schedule_status text NOT NULL DEFAULT 'unscheduled' CHECK(schedule_status IN ('unscheduled','scheduled','postponed')),
 scheduled_at timestamptz,scheduled_ends_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tournament_id,code),UNIQUE(tournament_id,round_number,slot),
 FOREIGN KEY(pair1_id,tournament_id) REFERENCES public.bp_tournament_pairs(id,tournament_id),
 FOREIGN KEY(pair2_id,tournament_id) REFERENCES public.bp_tournament_pairs(id,tournament_id),
 FOREIGN KEY(winner_pair_id,tournament_id) REFERENCES public.bp_tournament_pairs(id,tournament_id),
 CONSTRAINT bp_ko26_result_state CHECK (
   (match_status='pending' AND winner_pair_id IS NULL AND sets IS NULL)
   OR (match_status='played' AND winner_pair_id IN(pair1_id,pair2_id) AND sets IS NOT NULL)
 ),
 CONSTRAINT bp_ko26_schedule_state CHECK (
   (schedule_status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_ends_at IS NOT NULL
    AND scheduled_ends_at-scheduled_at IN(interval '90 minutes',interval '120 minutes'))
   OR (schedule_status<>'scheduled' AND scheduled_at IS NULL AND scheduled_ends_at IS NULL)
 )
);
CREATE TABLE public.bp_ko26_revisions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 match_id uuid NOT NULL REFERENCES public.bp_ko26_matches(id) ON DELETE CASCADE,
 old_sets jsonb,new_sets jsonb NOT NULL,
 actor_id uuid NOT NULL,changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bp_ko26_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_ko26_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_ko26_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_ko26_draws,public.bp_ko26_matches,public.bp_ko26_revisions FROM anon,authenticated;
GRANT SELECT ON public.bp_ko26_draws,public.bp_ko26_matches,public.bp_ko26_revisions TO authenticated;
CREATE POLICY bp_ko26_draw_read ON public.bp_ko26_draws FOR SELECT TO authenticated
 USING (public.bp_tournament_is_admin());
CREATE POLICY bp_ko26_match_read ON public.bp_ko26_matches FOR SELECT TO authenticated
 USING (public.bp_tournament_is_admin());
CREATE POLICY bp_ko26_revision_read ON public.bp_ko26_revisions FOR SELECT TO authenticated
 USING (public.bp_tournament_is_admin());

-- Parámetros de plan: salida del motor JS de reglamento 2026.
-- Lista de plazas: [{group:1,rank:1,pair_id:"uuid"},...].
CREATE FUNCTION public.bp_ko26_prepare(
 p_tournament_id uuid,p_plan jsonb,p_placements jsonb,p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $ko26$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_n integer;v_g record;v_expected integer;v_q integer:=0;
 v_round jsonb;v_match jsonb;v_stage text;v_slot integer;v_round_num integer:=0;
 v_code text;v_a text;v_b text;v_part text;v_label text;
 v_all text[]:=ARRAY[]::text[];v_seen text[]:=ARRAY[]::text[];
 v_codes text[]:=ARRAY[]::text[];v_match_count integer:=0;
 v_manual_needed boolean:=false;v_violation boolean:=false;
 v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id FOR UPDATE;
 IF NOT FOUND OR v_t.format<>'groups_knockout'
    OR v_t.status NOT IN('registration_closed','in_progress')
    OR v_t.groups_published_at IS NULL OR v_t.fixture_published_at IS NULL
 THEN RAISE EXCEPTION 'El torneo requiere grupos y fixture publicados.' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.bp_ko26_draws WHERE tournament_id=p_tournament_id)
 THEN RAISE EXCEPTION 'El cuadro ya fue generado.' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO v_n FROM public.bp_tournament_pairs
  WHERE tournament_id=p_tournament_id AND status='approved';
 IF v_n NOT BETWEEN 6 AND 40 THEN
   RAISE EXCEPTION 'Se requieren 6 a 40 parejas aprobadas.' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.bp_tournament_group_matches
  WHERE tournament_id=p_tournament_id AND match_status<>'played')
 THEN RAISE EXCEPTION 'Faltan resultados de grupos.' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.bp_tournament_group_matches
  WHERE tournament_id=p_tournament_id ORDER BY id FOR SHARE;
 IF jsonb_typeof(p_plan)<>'object' OR jsonb_typeof(p_plan->'rounds')<>'array'
  OR jsonb_typeof(p_placements)<>'array' OR (p_plan->>'pairs')::int<>v_n
 THEN RAISE EXCEPTION 'Plan inválido.' USING ERRCODE='22023'; END IF;

 IF (SELECT count(*) FROM public.bp_tournament_groups WHERE tournament_id=p_tournament_id)
    <>floor(v_n/3)::integer
 THEN RAISE EXCEPTION 'Cantidad de grupos inválida.' USING ERRCODE='23514'; END IF;
 FOR v_g IN
   SELECT g.id,g.group_number,count(gp.pair_id)::int AS size
   FROM public.bp_tournament_groups g
   JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id
   WHERE g.tournament_id=p_tournament_id
   GROUP BY g.id,g.group_number ORDER BY g.group_number
 LOOP
   IF v_g.group_number NOT BETWEEN 1 AND floor(v_n/3)::int
     OR (v_g.group_number<=v_n%3 AND v_g.size<>4)
     OR (v_g.group_number>v_n%3 AND v_g.size<>3)
   THEN RAISE EXCEPTION 'Las zonas deben ser de tres, con las de cuatro primero.'
    USING ERRCODE='23514'; END IF;
   IF (SELECT count(*) FROM public.bp_tournament_group_matches
       WHERE tournament_id=p_tournament_id AND group_id=v_g.id)
      <>CASE WHEN v_g.size=4 THEN 4 ELSE 3 END
      OR (SELECT count(*) FROM public.bp_tournament_match_results
          WHERE tournament_id=p_tournament_id AND group_id=v_g.id)
      <>CASE WHEN v_g.size=4 THEN 4 ELSE 3 END
   THEN RAISE EXCEPTION 'Una zona no tiene sus resultados completos.'
     USING ERRCODE='23514'; END IF;
   FOR v_expected IN 1..(CASE WHEN v_g.size=4 THEN 3 ELSE 2 END) LOOP
     v_all:=array_append(v_all,v_expected::text||'° '||chr(64+v_g.group_number));
     v_q:=v_q+1;
   END LOOP;
 END LOOP;
 IF coalesce(array_length(v_all,1),0)<>v_q
   OR jsonb_array_length(p_placements)<>v_q
   OR (p_plan->>'qualifiers')::int<>v_q
 THEN RAISE EXCEPTION 'Cantidad de clasificadas inválida.' USING ERRCODE='23514'; END IF;
 IF EXISTS (
   SELECT 1 FROM jsonb_array_elements(p_placements) x
   LEFT JOIN public.bp_tournament_groups g
      ON g.tournament_id=p_tournament_id AND g.group_number=(x->>'group')::int
   LEFT JOIN public.bp_tournament_group_pairs gp
      ON gp.group_id=g.id AND gp.pair_id=(x->>'pair_id')::uuid
   WHERE gp.pair_id IS NULL OR (x->>'rank')::int NOT BETWEEN 1 AND
       CASE WHEN g.group_number<=v_n%3 THEN 3 ELSE 2 END
 ) OR (SELECT count(DISTINCT x->>'pair_id') FROM jsonb_array_elements(p_placements) x)<>v_q
   OR (SELECT count(DISTINCT (x->>'group')||':'||(x->>'rank'))
       FROM jsonb_array_elements(p_placements) x)<>v_q
   OR EXISTS(SELECT 1 FROM unnest(v_all) needed WHERE NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(p_placements) x
        WHERE (x->>'rank')||'° '||chr(64+(x->>'group')::int)=needed))
 THEN RAISE EXCEPTION 'Puestos/parejas repetidos o ajenos a sus zonas.' USING ERRCODE='23514'; END IF;

 -- El resultado registrado y la tabla de grupos son los únicos datos
 -- deportivos permitidos para escoger las clasificadas.
 WITH stats AS (
   SELECT gp.group_id,gp.pair_id,
     coalesce(sum(CASE WHEN r.winner_pair_id=gp.pair_id THEN 2 ELSE 0 END),0)::int pts,
     coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id
       THEN r.sets_pair1-r.sets_pair2 ELSE r.sets_pair2-r.sets_pair1 END),0)::int sd,
     coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id THEN 1 ELSE -1 END*
       (((r.sets->0->>0)::int+(r.sets->1->>0)::int)-
        ((r.sets->0->>1)::int+(r.sets->1->>1)::int))),0)::int gd,
     coalesce((SELECT (x->>'rank')::int FROM jsonb_array_elements(p_placements) x
       WHERE x->>'pair_id'=gp.pair_id::text),
       (SELECT count(*)::int FROM public.bp_tournament_group_pairs q WHERE q.group_id=gp.group_id)) pos
   FROM public.bp_tournament_group_pairs gp
   LEFT JOIN public.bp_tournament_match_results r ON r.group_id=gp.group_id
     AND gp.pair_id IN (r.resolved_pair1_id,r.resolved_pair2_id)
   WHERE gp.tournament_id=p_tournament_id
   GROUP BY gp.group_id,gp.pair_id
 ), pairs AS (
   SELECT a.*,b.pair_id other,b.pts o_pts,b.sd o_sd,b.gd o_gd,b.pos o_pos,
     (SELECT count(*) FROM stats z WHERE z.group_id=a.group_id
       AND z.pts=a.pts AND z.sd=a.sd AND z.gd=a.gd) tie_size,
     (SELECT r.winner_pair_id FROM public.bp_tournament_match_results r
      WHERE r.group_id=a.group_id AND
       ((r.resolved_pair1_id=a.pair_id AND r.resolved_pair2_id=b.pair_id)
        OR(r.resolved_pair2_id=a.pair_id AND r.resolved_pair1_id=b.pair_id))
      LIMIT 1) h2h_winner
   FROM stats a JOIN stats b ON a.group_id=b.group_id AND a.pair_id<>b.pair_id
   WHERE a.pos<b.pos
 )
 SELECT coalesce(bool_or(
   pts<o_pts OR (pts=o_pts AND sd<o_sd) OR
   (pts=o_pts AND sd=o_sd AND gd<o_gd) OR
   (pts=o_pts AND sd=o_sd AND gd=o_gd AND tie_size=2
    AND h2h_winner IS NOT NULL AND h2h_winner<>pair_id)
 ),false),
 coalesce(bool_or(pts=o_pts AND sd=o_sd AND gd=o_gd AND
    (tie_size>2 OR h2h_winner IS NULL)),false)
 INTO v_violation,v_manual_needed FROM pairs;
 IF v_violation THEN
   RAISE EXCEPTION 'Los puestos contradicen puntos, sets, games o enfrentamiento directo.'
    USING ERRCODE='23514'; END IF;
 IF v_manual_needed AND (v_reason IS NULL OR length(v_reason) NOT BETWEEN 10 AND 500)
 THEN RAISE EXCEPTION 'Martín debe justificar el empate no resuelto (10 a 500 caracteres).'
   USING ERRCODE='23514'; END IF;

 IF (p_plan->>'preCount')::int<>v_q-(p_plan->>'base')::int
   OR (p_plan->>'base')::int NOT IN(4,8,16)
 THEN RAISE EXCEPTION 'Previas incorrectas.' USING ERRCODE='23514'; END IF;
 -- Crear el padre ANTES de incorporar partidos (FK).
 INSERT INTO public.bp_ko26_draws(tournament_id,plan,placements,manual_reason,created_by)
 VALUES(p_tournament_id,p_plan,p_placements,v_reason,auth.uid());
 FOR v_round IN SELECT value FROM jsonb_array_elements(p_plan->'rounds') LOOP
   IF jsonb_typeof(v_round->'matches')<>'array' THEN
     RAISE EXCEPTION 'Ronda inválida.' USING ERRCODE='23514'; END IF;
   v_stage:=v_round->>'stage';
   IF v_stage NOT IN('preliminary','round_of_16','quarterfinal','semifinal','final')
   THEN RAISE EXCEPTION 'Etapa de eliminación inválida.' USING ERRCODE='23514'; END IF;
   v_slot:=0;
   FOR v_match IN SELECT value FROM jsonb_array_elements(v_round->'matches') LOOP
     v_slot:=v_slot+1;v_match_count:=v_match_count+1;
     v_code:=v_match->>'code';
     v_a:=v_match->'pair'->>0;v_b:=v_match->'pair'->>1;
     IF v_a IS NULL OR v_b IS NULL OR v_code IS NULL
       OR v_code=ANY(v_codes) OR v_code!~'^(P[0-9]+|R[0-9]+-[0-9]+)$'
     THEN RAISE EXCEPTION 'Cruce inválido o repetido.' USING ERRCODE='23514'; END IF;
     FOREACH v_part IN ARRAY ARRAY[v_a,v_b] LOOP
       IF v_part=ANY(v_all) THEN
         IF v_round_num>1 THEN RAISE EXCEPTION 'Clasificada no ingresó en ronda inicial.'; END IF;
         IF v_round_num=0 AND (substring(v_part from '^[0-9]+'))::int=1
           AND substring(v_part from '[A-Z]$')<=chr(64+v_n%3)
         THEN RAISE EXCEPTION 'El primer puesto de zona de cuatro tiene pase directo.'; END IF;
         v_seen:=array_append(v_seen,v_part);
       ELSIF v_part LIKE 'Ganador %' THEN
         IF NOT substring(v_part from 9)=ANY(v_codes) THEN
           RAISE EXCEPTION 'Referencia futura o inexistente.' USING ERRCODE='23514'; END IF;
       ELSIF v_part=ANY(v_codes) THEN NULL;
       ELSE RAISE EXCEPTION 'Referencia de pareja o resultado desconocida.' USING ERRCODE='23514';
       END IF;
     END LOOP;
     INSERT INTO public.bp_ko26_matches(
       tournament_id,code,round_number,slot,stage,source1,source2,pair1_id,pair2_id)
     VALUES(p_tournament_id,v_code,v_round_num,v_slot,v_stage,v_a,v_b,
       (SELECT (x->>'pair_id')::uuid FROM jsonb_array_elements(p_placements) x
          WHERE (x->>'rank')||'° '||chr(64+(x->>'group')::int)=v_a),
       (SELECT (x->>'pair_id')::uuid FROM jsonb_array_elements(p_placements) x
          WHERE (x->>'rank')||'° '||chr(64+(x->>'group')::int)=v_b));
     v_codes:=array_append(v_codes,v_code);
   END LOOP;
   v_round_num:=v_round_num+1;
 END LOOP;
 IF v_match_count<>v_q-1 OR coalesce(array_length(v_seen,1),0)<>v_q
   OR (SELECT count(DISTINCT x) FROM unnest(v_seen) x)<>v_q
 THEN RAISE EXCEPTION 'La llave no utiliza cada clasificada exactamente una vez.'
   USING ERRCODE='23514'; END IF;
 IF (SELECT count(*) FROM public.bp_ko26_matches
      WHERE tournament_id=p_tournament_id AND stage='final')<>1
 THEN RAISE EXCEPTION 'Se requiere una sola final.' USING ERRCODE='23514'; END IF;
 RETURN jsonb_build_object('created',true,'qualified',v_q,'matches',v_match_count,
   'manual_tiebreak',v_manual_needed);
END;
$ko26$;

-- Resultado de eliminatorias: siempre al mejor de TRES SETS NORMALES.
-- Al finalizar propaga los ganadores a las casillas dependientes.
CREATE FUNCTION public.bp_ko26_save_result(p_match_id uuid,p_sets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $ko26score$
DECLARE v_m public.bp_ko26_matches%ROWTYPE;v_t public.bp_tournaments%ROWTYPE;
 v_i integer;v_n integer;v_a integer;v_b integer;v_hi integer;v_lo integer;
 v_p1 integer:=0;v_p2 integer:=0;v_winner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false)
 THEN RAISE EXCEPTION 'Solo administrador.' USING ERRCODE='42501'; END IF;
 SELECT t.* INTO v_t FROM public.bp_tournaments t JOIN public.bp_ko26_matches m
 ON m.tournament_id=t.id WHERE m.id=p_match_id FOR UPDATE OF t;
 IF NOT FOUND OR v_t.status NOT IN('registration_closed','in_progress')
 THEN RAISE EXCEPTION 'El torneo no admite resultados.' USING ERRCODE='23514'; END IF;
 SELECT * INTO v_m FROM public.bp_ko26_matches WHERE id=p_match_id FOR UPDATE;
 IF v_m.pair1_id IS NULL OR v_m.pair2_id IS NULL
 THEN RAISE EXCEPTION 'Aún faltan los dos rivales.' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM public.bp_ko26_matches child
   WHERE child.tournament_id=v_m.tournament_id AND child.match_status='played'
   AND (child.source1 IN (v_m.code,'Ganador '||v_m.code) OR
        child.source2 IN (v_m.code,'Ganador '||v_m.code)))
 THEN RAISE EXCEPTION 'Hay una ronda posterior jugada: no corregir la anterior.'
  USING ERRCODE='23514'; END IF;
 IF jsonb_typeof(p_sets)<>'array' THEN
   RAISE EXCEPTION 'Se requieren sets normales.' USING ERRCODE='23514'; END IF;
 v_n:=jsonb_array_length(p_sets);
 IF v_n NOT IN(2,3) THEN RAISE EXCEPTION 'Se requieren dos o tres sets.'; END IF;
 FOR v_i IN 0..v_n-1 LOOP
   IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2
      OR (p_sets->v_i->>0)!~'^[0-9]{1,2}$' OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$'
   THEN RAISE EXCEPTION 'Marcador inválido.' USING ERRCODE='23514'; END IF;
   v_a:=(p_sets->v_i->>0)::int;v_b:=(p_sets->v_i->>1)::int;
   v_hi:=greatest(v_a,v_b);v_lo:=least(v_a,v_b);
   IF v_a=v_b OR NOT((v_hi=6 AND v_lo<=4) OR(v_hi=7 AND v_lo IN(5,6)))
     OR v_p1=2 OR v_p2=2
   THEN RAISE EXCEPTION 'Set inválido; el tercero es normal, nunca STB.'
     USING ERRCODE='23514'; END IF;
   IF v_a>v_b THEN v_p1:=v_p1+1; ELSE v_p2:=v_p2+1; END IF;
 END LOOP;
 IF greatest(v_p1,v_p2)<>2 OR (v_n=2 AND least(v_p1,v_p2)<>0)
   OR(v_n=3 AND least(v_p1,v_p2)<>1)
 THEN RAISE EXCEPTION 'El resultado no determina un ganador.'
   USING ERRCODE='23514'; END IF;
 v_winner:=CASE WHEN v_p1=2 THEN v_m.pair1_id ELSE v_m.pair2_id END;
 INSERT INTO public.bp_ko26_revisions(match_id,old_sets,new_sets,actor_id)
 VALUES(v_m.id,v_m.sets,p_sets,auth.uid());
 UPDATE public.bp_ko26_matches SET sets=p_sets,winner_pair_id=v_winner,
   match_status='played',updated_at=now() WHERE id=v_m.id;
 UPDATE public.bp_ko26_matches SET
   pair1_id=CASE WHEN source1 IN (v_m.code,'Ganador '||v_m.code)
                THEN v_winner ELSE pair1_id END,
   pair2_id=CASE WHEN source2 IN (v_m.code,'Ganador '||v_m.code)
                THEN v_winner ELSE pair2_id END,updated_at=now()
 WHERE tournament_id=v_m.tournament_id AND
   (source1 IN(v_m.code,'Ganador '||v_m.code) OR source2 IN(v_m.code,'Ganador '||v_m.code))
   AND match_status='pending';
 RETURN jsonb_build_object('match_id',v_m.id,'winner_pair_id',v_winner);
END;
$ko26score$;

-- Consulta exclusivamente pública de partidos, marcador y nombres deportivos.
CREATE FUNCTION public.bp_public_ko26(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $ko26public$
DECLARE v_data jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.bp_tournaments
   WHERE id=p_tournament_id AND is_published=true AND fixture_published_at IS NOT NULL)
 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object(
  'matches',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'code',m.code,'stage',m.stage,'round',m.round_number,'slot',m.slot,
   'source1',m.source1,'source2',m.source2,
   'pair1',CASE WHEN p1.id IS NULL THEN NULL ELSE p1.player1_name||' / '||p1.player2_name END,
   'pair2',CASE WHEN p2.id IS NULL THEN NULL ELSE p2.player1_name||' / '||p2.player2_name END,
   'schedule_status',m.schedule_status,'scheduled_at',m.scheduled_at,
   'sets',CASE WHEN m.match_status='played' THEN m.sets ELSE NULL END,
   'winner',CASE WHEN m.match_status='played' AND w.id IS NOT NULL
     THEN w.player1_name||' / '||w.player2_name ELSE NULL END
   ) ORDER BY m.round_number,m.slot)
   FROM public.bp_ko26_matches m
   LEFT JOIN public.bp_tournament_pairs p1 ON p1.id=m.pair1_id
   LEFT JOIN public.bp_tournament_pairs p2 ON p2.id=m.pair2_id
   LEFT JOIN public.bp_tournament_pairs w ON w.id=m.winner_pair_id
   WHERE m.tournament_id=p_tournament_id),'[]'::jsonb)
 ) INTO v_data
 WHERE EXISTS(SELECT 1 FROM public.bp_ko26_draws
   WHERE tournament_id=p_tournament_id);
 RETURN v_data;
END;
$ko26public$;
REVOKE ALL ON FUNCTION public.bp_ko26_prepare(uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_ko26_save_result(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_public_ko26(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko26_prepare(uuid,jsonb,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_ko26_save_result(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_public_ko26(uuid) TO anon,authenticated;
COMMIT;
