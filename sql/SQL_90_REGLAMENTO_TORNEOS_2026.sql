-- Boulevard Pádel · Nuevo motor eliminatorio 6..40 / temporada 2026
-- Seguro: sin tocar reservas, turnos fijos, blockouts ni SQL de Liga.
-- Requiere las tablas originales de torneos instaladas.
BEGIN;

ALTER TABLE public.bp_tournaments ADD COLUMN IF NOT EXISTS rules_version smallint NOT NULL DEFAULT 2026;

CREATE TABLE IF NOT EXISTS public.bp_tournament_brackets2026 (
  tournament_id uuid PRIMARY KEY REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  placements jsonb,
  group_revision timestamptz,
  placements_by uuid,
  placements_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bracket2026_plan_object CHECK (jsonb_typeof(plan)='object'),
  CONSTRAINT bracket2026_placements_object CHECK (placements IS NULL OR jsonb_typeof(placements)='object')
);
CREATE TABLE IF NOT EXISTS public.bp_tournament_bracket_matches2026 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.bp_tournament_brackets2026(tournament_id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK (stage BETWEEN 0 AND 6),
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 64),
  source1 text NOT NULL,
  source2 text NOT NULL,
  sets jsonb,
  winner_pair_id uuid,
  resolved_pair1_id uuid,
  resolved_pair2_id uuid,
  match_status text NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending','played')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id,stage,slot),
  CONSTRAINT bracket2026_result_atomic CHECK (
    (match_status='pending' AND sets IS NULL AND winner_pair_id IS NULL AND resolved_pair1_id IS NULL AND resolved_pair2_id IS NULL)
    OR (match_status='played' AND jsonb_typeof(sets)='array' AND winner_pair_id IS NOT NULL AND resolved_pair1_id IS NOT NULL AND resolved_pair2_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS bracket2026_matches_tournament_order ON public.bp_tournament_bracket_matches2026(tournament_id,stage,slot);
ALTER TABLE public.bp_tournament_brackets2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_tournament_bracket_matches2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_tournament_brackets2026 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.bp_tournament_bracket_matches2026 FROM PUBLIC,anon,authenticated;

-- Función privada: determina la pareja de una posición de grupo o la ganadora
-- de una ronda ya jugada. No expone datos personales ni se concede a clientes.
CREATE OR REPLACE FUNCTION public.bp_tournament_source_pair2026(p_tournament_id uuid,p_source text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_n integer;v_letter text;v_g int;v_rank int;v_a jsonb;v_revision timestamptz;v_stored timestamptz;v_stage int;v_slot int;v_id uuid;
BEGIN
 IF p_source ~ '^([123])° [A-Z]$' THEN
   v_letter:=right(p_source,1);
   v_rank:=left(p_source,1)::int;
   SELECT b.placements->v_letter,b.group_revision INTO v_a,v_stored
   FROM public.bp_tournament_brackets2026 b WHERE b.tournament_id=p_tournament_id;
   IF v_a IS NULL OR jsonb_typeof(v_a)<>'array' OR jsonb_array_length(v_a)<v_rank THEN RETURN NULL; END IF;
   SELECT date_trunc('milliseconds',max(r.updated_at)) INTO v_revision
     FROM public.bp_tournament_match_results r WHERE r.tournament_id=p_tournament_id;
   IF v_revision IS DISTINCT FROM v_stored THEN RETURN NULL; END IF;
   v_id:=(v_a->>(v_rank-1))::uuid;
   RETURN v_id;
 ELSIF p_source ~ '^P[1-9][0-9]*$' THEN
   v_slot:=substring(p_source from 2)::int;
   SELECT m.winner_pair_id INTO v_id FROM public.bp_tournament_bracket_matches2026 m
    WHERE m.tournament_id=p_tournament_id AND m.stage=0 AND m.slot=v_slot;
   RETURN v_id;
 ELSIF p_source ~ '^W:[1-6]:[1-9][0-9]*$' THEN
   v_stage:=split_part(p_source,':',2)::int;
   v_slot:=split_part(p_source,':',3)::int;
   SELECT m.winner_pair_id INTO v_id FROM public.bp_tournament_bracket_matches2026 m
    WHERE m.tournament_id=p_tournament_id AND m.stage=v_stage AND m.slot=v_slot;
   RETURN v_id;
 END IF;
 RETURN NULL;
END $fn$;

-- Publica el fixture y las eliminatorias dentro de una sola transacción.
-- El Admin entrega el modelo creado por el simulador aprobado. El servidor
-- comprueba cantidades, identidades, grupos, prioridad y todo el grafo de cruces.
CREATE OR REPLACE FUNCTION public.bp_tournament_publish_fixture2026(p_tournament_id uuid,p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_sizes integer[];v_size integer;v_n integer;v_group_count int;v_fours int;
 v_qualified int:=0;v_base int:=1;v_pre int;v_direct int;
 v_arr jsonb;v_match jsonb;v_source text;v_source1 text;v_source2 text;
 v_stage int;v_i int;v_j int;v_expected int;v_prior int;v_letter text;v_group_idx int;v_rank int;
 v_seen text[]:=ARRAY[]::text[];v_pseeds text[]:=ARRAY[]::text[];v_direct_labels text[]:=ARRAY[]::text[];
 v_references text[]:=ARRAY[]::text[];v_qualifier text[]:=ARRAY[]::text[];
 v_time timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo el administrador puede publicar el cuadro.' USING ERRCODE='42501';
 END IF;
 IF p_plan IS NULL OR jsonb_typeof(p_plan)<>'object' THEN
   RAISE EXCEPTION 'Modelo de llaves inválido.' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id FOR UPDATE;
 IF NOT FOUND OR v_t.format<>'groups_knockout' OR v_t.rules_version<>2026
   OR v_t.status<>'registration_closed' OR v_t.groups_published_at IS NULL
   OR v_t.fixture_published_at IS NOT NULL THEN
   RAISE EXCEPTION 'Los grupos deben estar publicados y el fixture aún privado.' USING ERRCODE='23514';
 END IF;
 IF EXISTS (SELECT 1 FROM public.bp_tournament_brackets2026 b WHERE b.tournament_id=p_tournament_id) THEN
   RAISE EXCEPTION 'Ya existe una llave preparada.' USING ERRCODE='23514';
 END IF;
 SELECT array_agg(s.members::int ORDER BY s.group_number),sum(s.members)::int,count(*)::int
 INTO v_sizes,v_n,v_group_count
 FROM (SELECT g.group_number,count(gp.pair_id) members
  FROM public.bp_tournament_groups g
  LEFT JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id AND gp.tournament_id=g.tournament_id
  WHERE g.tournament_id=p_tournament_id GROUP BY g.id,g.group_number) s;
 IF v_n NOT BETWEEN 6 AND 40 OR v_group_count<>floor(v_n/3.0)::int THEN
   RAISE EXCEPTION 'Se requieren de 6 a 40 parejas en zonas completas.' USING ERRCODE='23514';
 END IF;
 IF EXISTS (SELECT 1 FROM public.bp_tournament_pairs p WHERE p.tournament_id=p_tournament_id AND p.status='pending')
    OR (SELECT count(*) FROM public.bp_tournament_pairs p WHERE p.tournament_id=p_tournament_id AND p.status='approved')<>v_n THEN
   RAISE EXCEPTION 'Hay parejas sin aprobar o grupos incompletos.' USING ERRCODE='23514';
 END IF;
 v_fours:=v_n%3;
 FOR v_i IN 1..v_group_count LOOP
   v_size:=v_sizes[v_i];
   IF v_size<>CASE WHEN v_i<=v_fours THEN 4 ELSE 3 END THEN
     RAISE EXCEPTION 'Las zonas de cuatro deben ser las primeras: A, B, ...' USING ERRCODE='23514';
   END IF;
   FOR v_j IN 1..CASE WHEN v_size=4 THEN 3 ELSE 2 END LOOP
     v_qualifier:=array_append(v_qualifier,v_j::text||'° '||chr(64+v_i));
   END LOOP;
   v_qualified:=v_qualified+CASE WHEN v_size=4 THEN 3 ELSE 2 END;
 END LOOP;
 WHILE v_base*2<=v_qualified LOOP v_base:=v_base*2; END LOOP;
 v_pre:=v_qualified-v_base;
 v_direct:=CASE WHEN v_pre>0 THEN 2*v_base-v_qualified ELSE v_qualified END;
 IF p_plan->>'pairs' IS DISTINCT FROM v_n::text OR
    p_plan->>'qualified' IS DISTINCT FROM v_qualified::text OR
    jsonb_typeof(p_plan->'preliminariesMatches')<>'array' OR
    jsonb_typeof(p_plan->'firstRoundMatches')<>'array' OR
    jsonb_array_length(p_plan->'preliminariesMatches')<>v_pre OR
    jsonb_array_length(p_plan->'firstRoundMatches')<>v_base/2 THEN
   RAISE EXCEPTION 'La estructura de la llave no corresponde al torneo.' USING ERRCODE='23514';
 END IF;
 -- Validar las parejas simbólicas exactamente una vez, y las referencias P1..Pn.
 FOR v_stage IN 0..1 LOOP
   v_arr:=CASE WHEN v_stage=0 THEN p_plan->'preliminariesMatches' ELSE p_plan->'firstRoundMatches' END;
   FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP
     v_match:=v_arr->v_i;
     IF jsonb_typeof(v_match)<>'array' OR jsonb_array_length(v_match)<>2 THEN
       RAISE EXCEPTION 'Cada cruce debe tener dos entradas.' USING ERRCODE='23514';
     END IF;
     FOR v_j IN 0..1 LOOP
       v_source:=v_match->>v_j;
       IF v_source ~ '^P[1-9][0-9]*$' AND v_stage=1 THEN
         IF substring(v_source from 2)::int>v_pre OR v_source=ANY(v_references) THEN
           RAISE EXCEPTION 'Referencia preliminar inválida o repetida: %',v_source USING ERRCODE='23514';
         END IF;
         v_references:=array_append(v_references,v_source);
       ELSIF v_source=ANY(v_qualifier) AND NOT(v_source=ANY(v_seen)) THEN
         v_seen:=array_append(v_seen,v_source);
         IF v_stage=1 THEN v_direct_labels:=array_append(v_direct_labels,v_source); END IF;
       ELSE
         RAISE EXCEPTION 'Participante duplicado o inexistente: %',v_source USING ERRCODE='23514';
       END IF;
     END LOOP;
   END LOOP;
 END LOOP;
 IF cardinality(v_seen)<>v_qualified OR cardinality(v_references)<>v_pre OR
    cardinality(v_direct_labels)<>v_direct THEN
   RAISE EXCEPTION 'La llave debe utilizar a todas las clasificadas una sola vez.' USING ERRCODE='23514';
 END IF;
 -- Prioridad absoluta de las primeras de zonas de cuatro.
 FOR v_i IN 1..least(v_fours,v_direct) LOOP
   IF NOT (('1° '||chr(64+v_i))=ANY(v_direct_labels)) THEN
     RAISE EXCEPTION 'Falta el pase prioritario a 1° %.',chr(64+v_i) USING ERRCODE='23514';
   END IF;
 END LOOP;
 -- Si alcanzan los pases, ninguno de los primeros debe disputar previa.
 IF v_direct>=v_group_count THEN
   FOR v_i IN 1..v_group_count LOOP
     IF NOT(('1° '||chr(64+v_i))=ANY(v_direct_labels)) THEN
       RAISE EXCEPTION 'El primer puesto de la zona % debe pasar directo.',chr(64+v_i) USING ERRCODE='23514';
     END IF;
   END LOOP;
 ELSIF v_fours=0 THEN
   -- Cuando no existen zonas de cuatro, priorizar A, B, ... en ese orden.
   FOR v_i IN 1..v_direct LOOP
     IF NOT(('1° '||chr(64+v_i))=ANY(v_direct_labels)) THEN
       RAISE EXCEPTION 'Debe priorizar 1° de las primeras zonas A, B, ...' USING ERRCODE='23514';
     END IF;
   END LOOP;
 END IF;
 INSERT INTO public.bp_tournament_brackets2026(tournament_id,plan,created_by)
 VALUES(p_tournament_id,p_plan,auth.uid());
 FOR v_stage IN 0..1 LOOP
   v_arr:=CASE WHEN v_stage=0 THEN p_plan->'preliminariesMatches' ELSE p_plan->'firstRoundMatches' END;
   FOR v_i IN 0..jsonb_array_length(v_arr)-1 LOOP
     INSERT INTO public.bp_tournament_bracket_matches2026(tournament_id,stage,slot,source1,source2)
     VALUES(p_tournament_id,v_stage,v_i+1,v_arr->v_i->>0,v_arr->v_i->>1);
   END LOOP;
 END LOOP;
 -- Rondas posteriores: ganadores de las dos llaves inmediatamente anteriores.
 v_prior:=v_base/2;v_stage:=2;
 WHILE v_prior>1 LOOP
   FOR v_i IN 1..v_prior/2 LOOP
     INSERT INTO public.bp_tournament_bracket_matches2026(tournament_id,stage,slot,source1,source2)
     VALUES(p_tournament_id,v_stage,v_i,
       'W:'||(v_stage-1)||':'||(v_i*2-1),'W:'||(v_stage-1)||':'||(v_i*2));
   END LOOP;
   v_prior:=v_prior/2;v_stage:=v_stage+1;
 END LOOP;
 -- La publicación es una sola operación atómica; validadores existentes del
 -- fixture siguen ejecutándose. Ningún horario de cancha se altera.
 v_time:=public.bp_tournament_publish_group_fixture(p_tournament_id);
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'published_at',v_time,
     'qualified',v_qualified,'preliminaries',v_pre,'direct',v_direct);
END $fn$;

-- Guarda el orden OFICIAL al terminar la fase de grupos. Si Martín resolvió un
-- empate, la lista contiene explícitamente su decisión; los jugadores no se
-- ordenan automáticamente por UUID. No se permite modificarla tras resultados
-- eliminatorios, ni arrastrar la clasificación si cambia un marcador de grupos.
CREATE OR REPLACE FUNCTION public.bp_tournament_confirm_placements2026(p_tournament_id uuid,p_placements jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_t public.bp_tournaments%ROWTYPE;v_group record;v_ids uuid[];v_submitted uuid[];
 v_each text;v_revision timestamptz;v_total int:=0;v_matches int;v_played int;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_placements)<>'object' THEN
   RAISE EXCEPTION 'Se requiere un orden de parejas para cada zona.' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id FOR UPDATE;
 IF NOT FOUND OR v_t.format<>'groups_knockout' OR v_t.rules_version<>2026 OR
    v_t.fixture_published_at IS NULL OR v_t.status NOT IN('registration_closed','in_progress') THEN
   RAISE EXCEPTION 'El torneo debe tener fixture publicado.' USING ERRCODE='23514';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.bp_tournament_brackets2026 b WHERE b.tournament_id=p_tournament_id) THEN
   RAISE EXCEPTION 'La llave no está publicada.' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.bp_tournament_bracket_matches2026 m WHERE m.tournament_id=p_tournament_id AND m.match_status='played') THEN
   RAISE EXCEPTION 'No podés cambiar la clasificación luego de iniciar eliminatorias.' USING ERRCODE='23514';
 END IF;
 FOR v_group IN SELECT g.id,g.group_number,count(gp.id)::int size
    FROM public.bp_tournament_groups g
    LEFT JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id
    WHERE g.tournament_id=p_tournament_id GROUP BY g.id,g.group_number ORDER BY g.group_number
 LOOP
   SELECT count(*),count(*) FILTER(WHERE m.match_status='played')
   INTO v_matches,v_played FROM public.bp_tournament_group_matches m WHERE m.group_id=v_group.id;
   IF v_matches<>CASE WHEN v_group.size=4 THEN 4 ELSE 3 END OR
      v_played<>v_matches OR
      (SELECT count(*) FROM public.bp_tournament_match_results r WHERE r.group_id=v_group.id)<>v_matches THEN
     RAISE EXCEPTION 'Faltan resultados en zona %.',chr(64+v_group.group_number) USING ERRCODE='23514';
   END IF;
   IF jsonb_typeof(p_placements->chr(64+v_group.group_number))<>'array' OR
      jsonb_array_length(p_placements->chr(64+v_group.group_number))<>v_group.size THEN
     RAISE EXCEPTION 'Orden de zona % incompleto.',chr(64+v_group.group_number) USING ERRCODE='23514';
   END IF;
   SELECT array_agg(gp.pair_id ORDER BY gp.pair_id) INTO v_ids
   FROM public.bp_tournament_group_pairs gp WHERE gp.group_id=v_group.id;
   BEGIN
     SELECT array_agg(x::uuid ORDER BY ord) INTO v_submitted
     FROM jsonb_array_elements_text(p_placements->chr(64+v_group.group_number)) WITH ORDINALITY AS a(x,ord);
   EXCEPTION WHEN invalid_text_representation THEN
     RAISE EXCEPTION 'Pareja inválida en el orden.' USING ERRCODE='23514';
   END;
   IF cardinality(v_submitted)<>v_group.size OR
       (SELECT count(DISTINCT id) FROM unnest(v_submitted) u(id))<>v_group.size OR
       NOT(v_submitted @> v_ids AND v_ids @> v_submitted) THEN
     RAISE EXCEPTION 'El orden de zona % no coincide con las parejas del grupo.',chr(64+v_group.group_number) USING ERRCODE='23514';
   END IF;
   v_total:=v_total+1;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_object_keys(p_placements))<>v_total THEN
   RAISE EXCEPTION 'Hay zonas extrañas en la clasificación.' USING ERRCODE='23514';
 END IF;
 SELECT date_trunc('milliseconds',max(r.updated_at)) INTO v_revision
 FROM public.bp_tournament_match_results r WHERE r.tournament_id=p_tournament_id;
 UPDATE public.bp_tournament_brackets2026 SET placements=p_placements,
  group_revision=v_revision,placements_by=auth.uid(),placements_at=now(),updated_at=now()
 WHERE tournament_id=p_tournament_id;
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'groups',v_total,'confirmed',true);
END $fn$;

-- Guardar resultado de eliminatorias, únicamente con tres sets normales.
CREATE OR REPLACE FUNCTION public.bp_tournament_save_bracket_result2026(p_match_id uuid,p_sets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_m public.bp_tournament_bracket_matches2026%ROWTYPE;v_t public.bp_tournaments%ROWTYPE;
 v_a uuid;v_b uuid;v_win uuid;v_len int;v_i int;v_ga int;v_gb int;v_hi int;v_lo int;
 v_sa int:=0;v_sb int:=0;v_dep text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
   RAISE EXCEPTION 'Solo administrador activo.' USING ERRCODE='42501';
 END IF;
 SELECT t.* INTO v_t FROM public.bp_tournaments t JOIN public.bp_tournament_bracket_matches2026 m
   ON m.tournament_id=t.id WHERE m.id=p_match_id FOR UPDATE OF t;
 IF NOT FOUND OR v_t.rules_version<>2026 OR v_t.format<>'groups_knockout' OR
    v_t.fixture_published_at IS NULL OR v_t.status NOT IN('registration_closed','in_progress') THEN
   RAISE EXCEPTION 'La ronda eliminatoria no está habilitada.' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_m FROM public.bp_tournament_bracket_matches2026 WHERE id=p_match_id FOR UPDATE;
 v_dep:=CASE WHEN v_m.stage=0 THEN 'P'||v_m.slot ELSE 'W:'||v_m.stage||':'||v_m.slot END;
 IF EXISTS (SELECT 1 FROM public.bp_tournament_bracket_matches2026 nxt WHERE nxt.tournament_id=v_m.tournament_id
  AND nxt.match_status='played' AND (nxt.source1=v_dep OR nxt.source2=v_dep)) THEN
   RAISE EXCEPTION 'Ya se jugó un partido dependiente. No se puede alterar este marcador.' USING ERRCODE='23514';
 END IF;
 v_a:=public.bp_tournament_source_pair2026(v_m.tournament_id,v_m.source1);
 v_b:=public.bp_tournament_source_pair2026(v_m.tournament_id,v_m.source2);
 IF v_a IS NULL OR v_b IS NULL OR v_a=v_b THEN
   RAISE EXCEPTION 'Esperá los resultados previos o confirmá las posiciones de cada grupo.' USING ERRCODE='23514';
 END IF;
 IF p_sets IS NULL OR jsonb_typeof(p_sets)<>'array' THEN
   RAISE EXCEPTION 'Ingresá los sets normales.' USING ERRCODE='23514';
 END IF;
 v_len:=jsonb_array_length(p_sets);
 IF v_len NOT IN (2,3) THEN RAISE EXCEPTION 'Se requieren dos o tres sets.' USING ERRCODE='23514'; END IF;
 FOR v_i IN 0..v_len-1 LOOP
  IF jsonb_typeof(p_sets->v_i)<>'array' OR jsonb_array_length(p_sets->v_i)<>2 OR
    jsonb_typeof(p_sets->v_i->0)<>'number' OR jsonb_typeof(p_sets->v_i->1)<>'number' OR
    (p_sets->v_i->>0)!~'^[0-9]{1,2}$' OR (p_sets->v_i->>1)!~'^[0-9]{1,2}$' THEN
     RAISE EXCEPTION 'Set inválido.' USING ERRCODE='23514';
  END IF;
  v_ga:=(p_sets->v_i->>0)::int;v_gb:=(p_sets->v_i->>1)::int;
  v_hi:=greatest(v_ga,v_gb);v_lo:=least(v_ga,v_gb);
  IF v_ga=v_gb OR NOT((v_hi=6 AND v_lo<=4) OR(v_hi=7 AND v_lo IN(5,6))) OR
     (v_sa=2 OR v_sb=2) THEN
    RAISE EXCEPTION 'Marcador de set normal inválido o partido ya definido.' USING ERRCODE='23514';
  END IF;
  IF v_ga>v_gb THEN v_sa:=v_sa+1; ELSE v_sb:=v_sb+1; END IF;
 END LOOP;
 IF NOT(v_sa=2 OR v_sb=2) THEN RAISE EXCEPTION 'Falta ganador del partido.' USING ERRCODE='23514'; END IF;
 v_win:=CASE WHEN v_sa=2 THEN v_a ELSE v_b END;
 UPDATE public.bp_tournament_bracket_matches2026 m SET sets=p_sets,winner_pair_id=v_win,
  resolved_pair1_id=v_a,resolved_pair2_id=v_b,match_status='played',updated_at=now() WHERE m.id=p_match_id;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_win,'saved',true);
END $fn$;

-- Reporte unificado Admin + web pública. NUNCA contiene teléfonos ni reservas.
CREATE OR REPLACE FUNCTION public.bp_tournament_bracket_report2026(p_tournament_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_t public.bp_tournaments%ROWTYPE;v_r jsonb;v_placements jsonb;v_revision timestamptz;
BEGIN
 SELECT * INTO v_t FROM public.bp_tournaments WHERE id=p_tournament_id;
 IF NOT FOUND OR v_t.format<>'groups_knockout' OR v_t.rules_version<>2026 THEN RETURN NULL; END IF;
 IF (NOT coalesce(public.bp_tournament_is_admin(),false)) AND
    (v_t.is_published IS DISTINCT FROM TRUE OR v_t.fixture_published_at IS NULL) THEN
   RETURN NULL;
 END IF;
 SELECT date_trunc('milliseconds',max(r.updated_at)) INTO v_revision
 FROM public.bp_tournament_match_results r WHERE r.tournament_id=p_tournament_id;
 SELECT CASE WHEN b.group_revision IS NOT DISTINCT FROM v_revision THEN b.placements ELSE NULL END
 INTO v_placements FROM public.bp_tournament_brackets2026 b WHERE b.tournament_id=p_tournament_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_agg(jsonb_build_object(
   'id',m.id,'stage',m.stage,'slot',m.slot,
   'source1',m.source1,'source2',m.source2,
   'pair1_id',public.bp_tournament_source_pair2026(p_tournament_id,m.source1),
   'pair2_id',public.bp_tournament_source_pair2026(p_tournament_id,m.source2),
   'pair1_name',CASE WHEN p1.id IS NULL THEN NULL ELSE p1.player1_name||' y '||p1.player2_name END,
   'pair2_name',CASE WHEN p2.id IS NULL THEN NULL ELSE p2.player1_name||' y '||p2.player2_name END,
   'status',m.match_status,'sets',m.sets,
   'winner_pair_id',m.winner_pair_id
 ) ORDER BY m.stage,m.slot) INTO v_r
 FROM public.bp_tournament_bracket_matches2026 m
 LEFT JOIN public.bp_tournament_pairs p1 ON p1.id=public.bp_tournament_source_pair2026(p_tournament_id,m.source1)
 LEFT JOIN public.bp_tournament_pairs p2 ON p2.id=public.bp_tournament_source_pair2026(p_tournament_id,m.source2)
 WHERE m.tournament_id=p_tournament_id;
 RETURN jsonb_build_object('tournament_id',p_tournament_id,'published',v_t.fixture_published_at IS NOT NULL,
     'placements',v_placements,'matches',coalesce(v_r,'[]'::jsonb));
END $fn$;

-- Ejecución pública SOLO para reporte filtrado; todas las escrituras requieren admin.
REVOKE ALL ON FUNCTION public.bp_tournament_source_pair2026(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_tournament_publish_fixture2026(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_tournament_confirm_placements2026(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_tournament_save_bracket_result2026(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bp_tournament_bracket_report2026(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_publish_fixture2026(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_confirm_placements2026(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_save_bracket_result2026(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bp_tournament_bracket_report2026(uuid) TO anon,authenticated;
COMMIT;