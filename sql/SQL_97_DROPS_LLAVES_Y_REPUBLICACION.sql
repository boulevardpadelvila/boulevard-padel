-- Boulevard Pádel · SQL97 · Llaves PDF Drops y republicación segura · 16/11/2026.
-- Tablas nuevas aisladas del turnero y turnos fijos.
-- El torneo existente NO se cambia al instalar la migración.
CREATE TABLE IF NOT EXISTS public.bp_tournament_bracket_templates2026 (
  pairs smallint PRIMARY KEY CHECK (pairs BETWEEN 6 AND 40),
  template jsonb NOT NULL CHECK (jsonb_typeof(template)='object')
);
ALTER TABLE public.bp_tournament_bracket_templates2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_tournament_bracket_templates2026 FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.bp_tournament_bracket_revisions2026 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.bp_tournaments(id) ON DELETE CASCADE,
  replaced_at timestamptz NOT NULL DEFAULT now(),
  replaced_by uuid NOT NULL,
  previous_plan jsonb NOT NULL,
  new_plan jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS bp97_bracket_revisions_tournament
 ON public.bp_tournament_bracket_revisions2026(tournament_id,replaced_at DESC);
ALTER TABLE public.bp_tournament_bracket_revisions2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bp_tournament_bracket_revisions2026 FROM PUBLIC,anon,authenticated;

-- Valores transcritos de las 35 páginas (cada página corresponde a n-5).
INSERT INTO public.bp_tournament_bracket_templates2026 (pairs,template) VALUES
 (6, '{"preliminariesMatches":[],"firstRoundMatches":[["1° A","2° B"],["2° A","1° B"]]}'::jsonb),
 (7, '{"preliminariesMatches":[["3° A","2° B"]],"firstRoundMatches":[["1° A","P1"],["2° A","1° B"]]}'::jsonb),
 (8, '{"preliminariesMatches":[["3° A","2° B"],["2° A","3° B"]],"firstRoundMatches":[["1° A","P1"],["P2","1° B"]]}'::jsonb),
 (9, '{"preliminariesMatches":[["2° B","2° C"],["1° C","2° A"]],"firstRoundMatches":[["1° A","P1"],["P2","1° B"]]}'::jsonb),
 (10, '{"preliminariesMatches":[["2° B","2° C"],["1° C","2° A"],["3° A","1° B"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"]]}'::jsonb),
 (11, '{"preliminariesMatches":[],"firstRoundMatches":[["1° A","3° B"],["2° B","2° C"],["1° C","2° A"],["3° A","1° B"]]}'::jsonb),
 (12, '{"preliminariesMatches":[],"firstRoundMatches":[["1° A","2° B"],["2° C","1° D"],["1° C","2° D"],["2° A","1° B"]]}'::jsonb),
 (13, '{"preliminariesMatches":[["3° A","2° B"]],"firstRoundMatches":[["1° A","P1"],["2° C","1° D"],["1° C","2° D"],["2° A","1° B"]]}'::jsonb),
 (14, '{"preliminariesMatches":[["3° A","2° B"],["2° A","3° B"]],"firstRoundMatches":[["1° A","P1"],["2° C","1° D"],["1° C","2° D"],["P2","1° B"]]}'::jsonb),
 (15, '{"preliminariesMatches":[["2° B","2° C"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["1° E","1° D"],["1° C","2° E"],["P2","1° B"]]}'::jsonb),
 (16, '{"preliminariesMatches":[["2° B","2° C"],["3° A","2° E"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["1° E","1° D"],["1° C","P2"],["P3","1° B"]]}'::jsonb),
 (17, '{"preliminariesMatches":[["2° B","2° C"],["1° E","3° B"],["3° A","2° E"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["P2","1° D"],["1° C","P3"],["P4","1° B"]]}'::jsonb),
 (18, '{"preliminariesMatches":[["2° C","2° F"],["1° E","2° B"],["2° A","1° F"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["P2","1° D"],["1° C","P3"],["P4","1° B"]]}'::jsonb),
 (19, '{"preliminariesMatches":[["2° C","2° F"],["1° E","2° B"],["3° A","1° D"],["2° A","1° F"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["1° C","P4"],["P5","1° B"]]}'::jsonb),
 (20, '{"preliminariesMatches":[["2° C","2° F"],["1° E","2° B"],["3° A","1° D"],["1° C","3° B"],["2° A","1° F"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["P4","P5"],["P6","1° B"]]}'::jsonb),
 (21, '{"preliminariesMatches":[["2° F","2° G"],["1° E","2° C"],["2° B","1° D"],["1° C","2° A"],["2° D","1° F"],["1° G","2° E"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["P4","P5"],["P6","1° B"]]}'::jsonb),
 (22, '{"preliminariesMatches":[["2° F","2° G"],["1° E","2° C"],["2° B","1° D"],["1° C","2° A"],["2° D","1° F"],["1° G","2° E"],["3° A","1° B"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["P4","P5"],["P6","P7"]]}'::jsonb),
 (23, '{"preliminariesMatches":[],"firstRoundMatches":[["1° A","3° B"],["2° F","2° G"],["1° E","2° C"],["2° B","1° D"],["1° C","2° A"],["2° D","1° F"],["1° G","2° E"],["3° A","1° B"]]}'::jsonb),
 (24, '{"preliminariesMatches":[],"firstRoundMatches":[["1° A","2° B"],["2° G","1° H"],["1° E","2° F"],["2° C","1° D"],["1° C","2° D"],["2° E","1° F"],["1° G","2° H"],["2° A","1° B"]]}'::jsonb),
 (25, '{"preliminariesMatches":[["3° A","2° B"]],"firstRoundMatches":[["1° A","P1"],["2° G","1° H"],["1° E","2° F"],["2° C","1° D"],["1° C","2° D"],["2° E","1° F"],["1° G","2° H"],["2° A","1° B"]]}'::jsonb),
 (26, '{"preliminariesMatches":[["3° A","2° B"],["2° A","3° B"]],"firstRoundMatches":[["1° A","P1"],["2° G","1° H"],["1° E","2° F"],["2° C","1° D"],["1° C","2° D"],["2° E","1° F"],["1° G","2° H"],["P2","1° B"]]}'::jsonb),
 (27, '{"preliminariesMatches":[["2° B","2° C"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","2° G"],["2° F","1° D"],["1° C","2° E"],["2° H","1° F"],["1° G","2° I"],["P2","1° B"]]}'::jsonb),
 (28, '{"preliminariesMatches":[["2° B","2° C"],["3° A","2° E"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","2° G"],["2° F","1° D"],["1° C","P2"],["2° H","1° F"],["1° G","2° I"],["P3","1° B"]]}'::jsonb),
 (29, '{"preliminariesMatches":[["2° B","2° C"],["2° F","3° B"],["3° A","2° E"],["2° D","2° A"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","2° G"],["P2","1° D"],["1° C","P3"],["2° H","1° F"],["1° G","2° I"],["P4","1° B"]]}'::jsonb),
 (30, '{"preliminariesMatches":[["2° C","2° F"],["2° G","2° B"],["2° A","2° H"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","2° J"],["P2","1° D"],["1° C","P3"],["2° I","1° F"],["1° G","1° J"],["P4","1° B"]]}'::jsonb),
 (31, '{"preliminariesMatches":[["2° C","2° F"],["2° G","2° B"],["2° A","2° H"],["2° I","3° A"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","2° J"],["P2","1° D"],["1° C","P3"],["P4","1° F"],["1° G","1° J"],["P5","1° B"]]}'::jsonb),
 (32, '{"preliminariesMatches":[["2° C","2° F"],["3° B","2° J"],["2° G","2° B"],["2° A","2° H"],["2° I","3° A"],["2° E","2° D"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","P2"],["P3","1° D"],["1° C","P4"],["P5","1° F"],["1° G","1° J"],["P6","1° B"]]}'::jsonb),
 (33, '{"preliminariesMatches":[["2° F","2° G"],["2° B","2° K"],["2° J","2° C"],["2° D","2° I"],["1° K","2° A"],["2° H","2° E"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","P2"],["P3","1° D"],["1° C","P4"],["P5","1° F"],["1° G","1° J"],["P6","1° B"]]}'::jsonb),
 (34, '{"preliminariesMatches":[["2° F","2° G"],["2° B","2° K"],["2° J","2° C"],["2° D","2° I"],["1° K","2° A"],["3° A","1° J"],["2° H","2° E"]],"firstRoundMatches":[["1° A","P1"],["1° I","1° H"],["1° E","P2"],["P3","1° D"],["1° C","P4"],["P5","1° F"],["1° G","P6"],["P7","1° B"]]}'::jsonb),
 (35, '{"preliminariesMatches":[["2° F","2° G"],["1° I","3° B"],["2° B","2° K"],["2° J","2° C"],["2° D","2° I"],["1° K","2° A"],["3° A","1° J"],["2° H","2° E"]],"firstRoundMatches":[["1° A","P1"],["P2","1° H"],["1° E","P3"],["P4","1° D"],["1° C","P5"],["P6","1° F"],["1° G","P7"],["P8","1° B"]]}'::jsonb),
 (36, '{"preliminariesMatches":[["2° G","2° J"],["1° I","2° B"],["2° C","1° L"],["2° K","2° F"],["2° E","2° L"],["1° K","2° D"],["2° A","1° J"],["2° I","2° H"]],"firstRoundMatches":[["1° A","P1"],["P2","1° H"],["1° E","P3"],["P4","1° D"],["1° C","P5"],["P6","1° F"],["1° G","P7"],["P8","1° B"]]}'::jsonb),
 (37, '{"preliminariesMatches":[["2° G","2° J"],["1° I","2° B"],["3° A","1° H"],["2° C","1° L"],["2° K","2° F"],["2° E","2° L"],["1° K","2° D"],["2° A","1° J"],["2° I","2° H"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["1° E","P4"],["P5","1° D"],["1° C","P6"],["P7","1° F"],["1° G","P8"],["P9","1° B"]]}'::jsonb),
 (38, '{"preliminariesMatches":[["2° G","2° J"],["1° I","2° B"],["3° A","1° H"],["2° C","1° L"],["2° K","2° F"],["2° E","2° L"],["1° K","2° D"],["1° G","3° B"],["2° A","1° J"],["2° I","2° H"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["1° E","P4"],["P5","1° D"],["1° C","P6"],["P7","1° F"],["P8","P9"],["P10","1° B"]]}'::jsonb),
 (39, '{"preliminariesMatches":[["2° J","2° K"],["1° I","2° C"],["2° B","1° H"],["2° F","1° L"],["1° M","2° G"],["2° H","2° M"],["1° K","2° E"],["1° G","2° A"],["2° D","1° J"],["2° L","2° I"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["1° E","P4"],["P5","1° D"],["1° C","P6"],["P7","1° F"],["P8","P9"],["P10","1° B"]]}'::jsonb),
 (40, '{"preliminariesMatches":[["2° J","2° K"],["1° I","2° C"],["2° B","1° H"],["2° F","1° L"],["1° M","2° G"],["2° H","2° M"],["1° K","2° E"],["3° A","1° F"],["1° G","2° A"],["2° D","1° J"],["2° L","2° I"]],"firstRoundMatches":[["1° A","P1"],["P2","P3"],["1° E","P4"],["P5","1° D"],["1° C","P6"],["P7","P8"],["P9","P10"],["P11","1° B"]]}'::jsonb)
ON CONFLICT(pairs) DO UPDATE SET template=EXCLUDED.template;

-- Verificación de cantidad y correspondencia en la propia migración.
DO $bp97_check$
BEGIN
 IF (SELECT count(*) FROM public.bp_tournament_bracket_templates2026)<>35 THEN
   RAISE EXCEPTION 'La tabla de plantillas del reglamento no tiene 35 entradas.';
 END IF;
END $bp97_check$;

CREATE OR REPLACE FUNCTION public.bp_tournament_publish_fixture2026(p_tournament_id uuid, p_plan jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_t public.bp_tournaments%ROWTYPE;
 v_sizes integer[];v_size integer;v_n integer;v_group_count int;v_fours int;
 v_qualified int:=0;v_base int:=1;v_pre int;v_direct int;
 v_arr jsonb;v_match jsonb;v_source text;v_source1 text;v_source2 text;
 v_stage int;v_i int;v_j int;v_expected int;v_prior int;v_letter text;v_group_idx int;v_rank int;
 v_seen text[]:=ARRAY[]::text[];v_pseeds text[]:=ARRAY[]::text[];v_direct_labels text[]:=ARRAY[]::text[];
 v_references text[]:=ARRAY[]::text[];v_qualifier text[]:=ARRAY[]::text[];
 v_time timestamptz;
 v_template jsonb;
 v_previous_plan jsonb;
 v_previous_placements jsonb;
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
 -- La llave anterior se valida y se reutiliza/reemplaza al final de las comprobaciones.
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
   IF v_size<>(CASE WHEN v_i<=v_fours THEN 4 ELSE 3 END) THEN
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

 -- Verificar contra las 35 llaves del PDF. Una propuesta arbitraria del
 -- navegador no puede modificar un cruce, un pase o el orden del cuadro.
 SELECT tpl.template INTO v_template
 FROM public.bp_tournament_bracket_templates2026 tpl WHERE tpl.pairs=v_n;
 IF v_template IS NULL OR
    p_plan->'preliminariesMatches' IS DISTINCT FROM v_template->'preliminariesMatches' OR
    p_plan->'firstRoundMatches' IS DISTINCT FROM v_template->'firstRoundMatches' THEN
   RAISE EXCEPTION 'La llave no coincide con el PDF oficial Drops 6 a 40 parejas.' USING ERRCODE='23514';
 END IF;
 IF public.bp_tournament_has_started_match(p_tournament_id) THEN
   RAISE EXCEPTION 'Ya hay partidos disputados: no es posible republicar los cruces.' USING ERRCODE='23514';
 END IF;
 -- Si la llave anterior es exactamente la misma, conservar TODOS sus IDs.
 SELECT b.plan,b.placements INTO v_previous_plan,v_previous_placements
 FROM public.bp_tournament_brackets2026 b
 WHERE b.tournament_id=p_tournament_id FOR UPDATE;
 IF v_previous_plan IS NOT NULL THEN
   IF v_previous_plan=p_plan THEN
     v_time:=public.bp_tournament_publish_group_fixture(p_tournament_id);
     RETURN jsonb_build_object('tournament_id',p_tournament_id,'published_at',v_time,
       'qualified',v_qualified,'preliminaries',v_pre,'direct',v_direct,
       'reused_existing_bracket',true);
   END IF;
   -- Nunca borrar resultados, clasificaciones ni programaciones de cancha.
   IF v_previous_placements IS NOT NULL
      OR EXISTS(SELECT 1 FROM public.bp_tournament_bracket_matches2026 m
                WHERE m.tournament_id=p_tournament_id
                  AND (m.match_status<>'pending' OR m.sets IS NOT NULL
                   OR m.winner_pair_id IS NOT NULL))
      OR EXISTS(SELECT 1 FROM public.bp_tournament_bracket_schedule2026 s
                WHERE s.tournament_id=p_tournament_id)
   THEN
     RAISE EXCEPTION 'Existe una llave con resultados, posiciones o programaciones; no se puede reemplazar automáticamente.' USING ERRCODE='23514';
   END IF;
   -- Conservar el plan anterior en auditoría ANTES de reemplazar los cruces.
   INSERT INTO public.bp_tournament_bracket_revisions2026(
     tournament_id,replaced_by,previous_plan,new_plan)
   VALUES(p_tournament_id,auth.uid(),v_previous_plan,p_plan);
   -- CASCADE borra solo los partidos sin jugar de esta llave; jamás toca
   -- grupos, inscripciones, reservas, turnos fijos ni otros torneos.
   DELETE FROM public.bp_tournament_brackets2026 b
   WHERE b.tournament_id=p_tournament_id;
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
END $function$;
