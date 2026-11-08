-- Boulevard Pádel · SQL 80 · Cuatro clasificadas y semifinales directas
-- PREPARADA EN DESARROLLO, NO APLICADA. Requiere autorización por separado.
-- DEFINITIVA: SÍ conservar en GitHub/SQL Editor una vez aprobada y aplicada.
-- NO ejecutarla manualmente dos veces.
-- Cambios acotados al cuadro eliminatorio: NO elimina torneos, reservas,
-- resultados, bloqueos, categorías, jugadores ni inscripciones.
-- Conserva sin migrar ni regenerar los cuadros históricos de 7 clasificados.

ALTER TABLE public.bp_tournament_knockout_brackets
  ADD COLUMN IF NOT EXISTS semifinals jsonb;

ALTER TABLE public.bp_tournament_knockout_brackets
  ALTER COLUMN direct_semifinal_pair_id DROP NOT NULL;

-- Formato histórico: 3 cuartos + un pase libre + sin semifinales directas.
-- Formato nuevo: 2 semifinales directas + sin pase libre ni cuartos.
ALTER TABLE public.bp_tournament_knockout_brackets
  DROP CONSTRAINT IF EXISTS bp_ko_quarters_shape;
ALTER TABLE public.bp_tournament_knockout_brackets
  ADD CONSTRAINT bp_ko_quarters_shape CHECK (
    (semifinals IS NULL
     AND direct_semifinal_pair_id IS NOT NULL
     AND jsonb_typeof(quarterfinals)='array'
     AND jsonb_array_length(quarterfinals)=3)
    OR
    (semifinals IS NOT NULL
     AND direct_semifinal_pair_id IS NULL
     AND quarterfinals='[]'::jsonb
     AND jsonb_typeof(semifinals)='array'
     AND jsonb_array_length(semifinals)=2)
  );

COMMENT ON COLUMN public.bp_tournament_knockout_brackets.semifinals IS
  'Dos cruces directos cuando clasifican cuatro (dos grupos). NULL para cuadros históricos de siete.';

-- Misma función de validación existente: se añade un modo de dos grupos sin
-- quitar seguridad, versiones de resultados ni restricciones de los siete.

CREATE OR REPLACE FUNCTION public.bp_knockout_validate_seven_bracket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_t public.bp_tournaments%ROWTYPE;
  v_group_sizes bigint[];
  v_groups bigint;
  v_matches bigint;
  v_played bigint;
  v_results bigint;
  v_latest timestamptz;
  v_qualifiers uuid[];
  v_participants uuid[];
  v_all uuid[];
  v_unique bigint;
  -- Modo de cuatro semifinalistas: dos grupos de 3/4.
  v_required integer;
  v_group record;
  v_pair_ids uuid[];
  v_first uuid;
  v_second uuid;
  v_four boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.bp_tournament_is_admin(),false) THEN
    RAISE EXCEPTION 'Solo un administrador activo puede confirmar el cuadro.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_t FROM public.bp_tournaments WHERE id=NEW.tournament_id FOR UPDATE;
  IF NOT FOUND OR v_t.format <> 'groups_knockout' OR v_t.status <> 'registration_closed'
     OR v_t.groups_published_at IS NULL OR v_t.fixture_published_at IS NULL THEN
    RAISE EXCEPTION 'Primero cerrá inscripciones, publicá grupos y fixture antes del cuadro final.' USING ERRCODE='23514';
  END IF;
  SELECT array_agg(members ORDER BY members),count(*) INTO v_group_sizes,v_groups
  FROM (SELECT count(gp.pair_id) AS members FROM public.bp_tournament_groups g
    LEFT JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id
    WHERE g.tournament_id=NEW.tournament_id GROUP BY g.id) counted;
  -- El formato de dos grupos habilita exactamente 4 semifinalistas:
  -- 2 del grupo de 3 y 2 del grupo de 4 (o 2 de cada uno si son iguales).
  -- Para el grupo de 4, SOLO gana el pase quien jugó A3 (ganadores vs
  -- ganadores). El ganador A4 queda tercero, no clasifica.
  v_four := v_groups = 2
    AND v_group_sizes IN (
      ARRAY[3::bigint,3::bigint],ARRAY[3::bigint,4::bigint],
      ARRAY[4::bigint,4::bigint]
    );
  IF v_four THEN
    SELECT sum(CASE WHEN n=3 THEN 3 ELSE 4 END)::integer
      INTO v_required FROM unnest(v_group_sizes) AS g(n);
    SELECT count(*),count(*) FILTER (WHERE match_status='played')
      INTO v_matches,v_played
      FROM public.bp_tournament_group_matches
      WHERE tournament_id=NEW.tournament_id;
    SELECT count(*),date_trunc('milliseconds',max(updated_at))
      INTO v_results,v_latest
      FROM public.bp_tournament_match_results
      WHERE tournament_id=NEW.tournament_id;
    IF v_matches<>v_required OR v_played<>v_required OR v_results<>v_required THEN
      RAISE EXCEPTION 'Completá todos los resultados de la fase de grupos.' USING ERRCODE='23514';
    END IF;
    IF v_latest IS DISTINCT FROM NEW.result_revision THEN
      RAISE EXCEPTION 'Los resultados cambiaron. Actualizá antes de confirmar semifinales.' USING ERRCODE='23514';
    END IF;
    v_qualifiers:=ARRAY[]::uuid[];
    FOR v_group IN
      SELECT g.id AS gid,g.group_number,count(gp.pair_id)::integer AS size
      FROM public.bp_tournament_groups g
      LEFT JOIN public.bp_tournament_group_pairs gp ON gp.group_id=g.id
      WHERE g.tournament_id=NEW.tournament_id
      GROUP BY g.id,g.group_number ORDER BY g.group_number
    LOOP
      IF v_group.size=3 THEN
        -- Dos mejores por puntos > diferencia de sets > sets a favor.
        -- Ante empate absoluto del primer/segundo puesto, no inventar orden.
        WITH stats AS (
          SELECT gp.pair_id,count(res.match_id) AS played,
            coalesce(sum(CASE WHEN res.winner_pair_id=gp.pair_id THEN 3 ELSE 0 END),0)::integer AS points,
            coalesce(sum(CASE WHEN res.resolved_pair1_id=gp.pair_id THEN res.sets_pair1 ELSE res.sets_pair2 END),0)::integer AS sf,
            coalesce(sum(CASE WHEN res.resolved_pair1_id=gp.pair_id THEN res.sets_pair2 ELSE res.sets_pair1 END),0)::integer AS sa
          FROM public.bp_tournament_group_pairs gp
          LEFT JOIN public.bp_tournament_match_results res
            ON res.group_id=gp.group_id
            AND gp.pair_id IN(res.resolved_pair1_id,res.resolved_pair2_id)
          WHERE gp.group_id=v_group.gid
          GROUP BY gp.pair_id
        ), ranks AS (
          SELECT pair_id,played,
            row_number() OVER(ORDER BY points DESC,(sf-sa) DESC,sf DESC,pair_id) AS pos,
            count(*) OVER(PARTITION BY points,(sf-sa),sf) AS tied
          FROM stats
        )
        SELECT array_agg(pair_id ORDER BY pos) INTO v_pair_ids
        FROM ranks WHERE pos<=2 AND played=2 AND tied=1;
        IF coalesce(array_length(v_pair_ids,1),0)<>2 THEN
          RAISE EXCEPTION 'El grupo % tiene un empate de posiciones que requiere definición.',v_group.group_number USING ERRCODE='23514';
        END IF;
      ELSE
        -- El partido A3 (ronda 2, partido 1) determina 1º y 2º.
        -- A1 y A2 originan los dos ganadores enfrentados en A3.
        SELECT res.winner_pair_id,
          CASE WHEN res.winner_pair_id=res.resolved_pair1_id
            THEN res.resolved_pair2_id ELSE res.resolved_pair1_id END
        INTO v_first,v_second
        FROM public.bp_tournament_group_matches m
        JOIN public.bp_tournament_match_results res ON res.match_id=m.id
        WHERE m.group_id=v_group.gid
          AND m.round_number=2 AND m.match_number=1
          AND res.winner_pair_id IN(res.resolved_pair1_id,res.resolved_pair2_id)
          AND EXISTS (
            SELECT 1 FROM public.bp_tournament_group_matches a
            JOIN public.bp_tournament_match_results ar ON ar.match_id=a.id
            WHERE a.group_id=v_group.gid AND a.round_number=1 AND a.match_number=1
              AND ar.winner_pair_id IN(res.resolved_pair1_id,res.resolved_pair2_id)
          )
          AND EXISTS (
            SELECT 1 FROM public.bp_tournament_group_matches a
            JOIN public.bp_tournament_match_results ar ON ar.match_id=a.id
            WHERE a.group_id=v_group.gid AND a.round_number=1 AND a.match_number=2
              AND ar.winner_pair_id IN(res.resolved_pair1_id,res.resolved_pair2_id)
          );
        IF v_first IS NULL OR v_second IS NULL OR v_first=v_second
          OR NOT EXISTS (
            SELECT 1 FROM public.bp_tournament_group_pairs gp
            WHERE gp.group_id=v_group.gid AND gp.pair_id=v_first
          ) OR NOT EXISTS (
            SELECT 1 FROM public.bp_tournament_group_pairs gp
            WHERE gp.group_id=v_group.gid AND gp.pair_id=v_second
          ) THEN
          RAISE EXCEPTION 'No se pudo verificar el partido de ganadores del grupo %.',v_group.group_number USING ERRCODE='23514';
        END IF;
        v_pair_ids:=ARRAY[v_first,v_second];
      END IF;
      v_qualifiers:=v_qualifiers || v_pair_ids;
    END LOOP;
    IF coalesce(array_length(v_qualifiers,1),0)<>4 THEN
      RAISE EXCEPTION 'Se requieren dos clasificadas de cada grupo.' USING ERRCODE='23514';
    END IF;
    IF NEW.direct_semifinal_pair_id IS NOT NULL
      OR NEW.quarterfinals IS DISTINCT FROM '[]'::jsonb
      OR NEW.semifinals IS NULL OR jsonb_typeof(NEW.semifinals)<>'array'
      OR jsonb_array_length(NEW.semifinals)<>2
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(NEW.semifinals) q(slot)
        WHERE jsonb_typeof(q.slot)<>'array' OR jsonb_array_length(q.slot)<>2
      ) THEN
      RAISE EXCEPTION 'Se necesitan exactamente dos semifinales, sin cuartos ni pase libre.' USING ERRCODE='23514';
    END IF;
    BEGIN
      SELECT array_agg(item.value::uuid)
      INTO v_participants
      FROM jsonb_array_elements(NEW.semifinals) q(slot)
      CROSS JOIN LATERAL jsonb_array_elements_text(q.slot) item(value);
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Identificadores de parejas inválidos.' USING ERRCODE='23514';
    END;
    SELECT count(DISTINCT id) INTO v_unique FROM unnest(v_participants) v(id);
    IF coalesce(array_length(v_participants,1),0)<>4 OR v_unique<>4
       OR NOT(v_participants @> v_qualifiers AND v_qualifiers @> v_participants) THEN
       RAISE EXCEPTION 'Las semifinales deben incluir a las cuatro clasificadas sin repetir.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); END IF;
    NEW.updated_at:=now();
    RETURN NEW;
  END IF;
  -- Mantener estrictamente el formato histórico de tres grupos (3,3,4)
  -- y sus siete clasificadas: sin convertir ni modificar cuadros existentes.
  IF v_groups <> 3 OR v_group_sizes IS DISTINCT FROM ARRAY[3::bigint,3::bigint,4::bigint] THEN
    RAISE EXCEPTION 'Formato eliminatorio aún no disponible para esa combinación de grupos.' USING ERRCODE='23514';
  END IF;
  IF NEW.semifinals IS NOT NULL THEN
    RAISE EXCEPTION 'El formato histórico de siete usa tres cuartos y un pase libre.' USING ERRCODE='23514';
  END IF;
  SELECT count(*),count(*) FILTER (WHERE match_status='played') INTO v_matches,v_played
  FROM public.bp_tournament_group_matches WHERE tournament_id=NEW.tournament_id;
  SELECT count(*),date_trunc('milliseconds',max(updated_at)) INTO v_results,v_latest
  FROM public.bp_tournament_match_results WHERE tournament_id=NEW.tournament_id;
  IF v_matches <> 10 OR v_played <> 10 OR v_results <> 10 THEN
    RAISE EXCEPTION 'Se necesitan los diez resultados de grupos para formar eliminatorias.' USING ERRCODE='23514';
  END IF;
  IF v_latest IS DISTINCT FROM NEW.result_revision THEN
    RAISE EXCEPTION 'Los resultados cambiaron. Actualizá el cuadro antes de confirmarlo.' USING ERRCODE='23514';
  END IF;
  WITH stats AS (
    SELECT gp.group_id,gp.pair_id,count(r.match_id) AS played,
      coalesce(sum(CASE WHEN r.winner_pair_id=gp.pair_id THEN 3 ELSE 0 END),0)::integer AS points,
      coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id THEN r.sets_pair1 ELSE r.sets_pair2 END),0)::integer AS sf,
      coalesce(sum(CASE WHEN r.resolved_pair1_id=gp.pair_id THEN r.sets_pair2 ELSE r.sets_pair1 END),0)::integer AS sa
    FROM public.bp_tournament_group_pairs gp
    LEFT JOIN public.bp_tournament_match_results r ON r.group_id=gp.group_id
      AND gp.pair_id IN (r.resolved_pair1_id,r.resolved_pair2_id)
    WHERE gp.tournament_id=NEW.tournament_id GROUP BY gp.group_id,gp.pair_id
  ), ranked AS (
    SELECT s.*,row_number() OVER(PARTITION BY group_id ORDER BY points DESC,(sf-sa) DESC,sf DESC,pair_id) AS pos,
      count(*) OVER(PARTITION BY group_id,points,(sf-sa),sf) AS tied,
      count(*) OVER(PARTITION BY group_id) AS group_size
    FROM stats s
  )
  SELECT array_agg(pair_id) INTO v_qualifiers FROM ranked
  WHERE pos <= CASE WHEN group_size=3 THEN 2 ELSE 3 END AND tied=1 AND played=2;
  IF coalesce(array_length(v_qualifiers,1),0)<>7 THEN
    RAISE EXCEPTION 'Hay posiciones empatadas o marcadores inconsistentes: falta resolver la clasificación.' USING ERRCODE='23514';
  END IF;
  IF jsonb_typeof(NEW.quarterfinals)<>'array' OR jsonb_array_length(NEW.quarterfinals)<>3
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.quarterfinals) q(slot)
      WHERE jsonb_typeof(slot)<>'array' OR jsonb_array_length(slot)<>2) THEN
    RAISE EXCEPTION 'Se necesitan tres cuartos de final con dos parejas cada uno.' USING ERRCODE='23514';
  END IF;
  BEGIN
    SELECT array_agg(v.value::uuid) INTO v_participants
    FROM jsonb_array_elements(NEW.quarterfinals) q(slot)
    CROSS JOIN LATERAL jsonb_array_elements_text(q.slot) v(value);
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Identificadores inválidos de parejas.' USING ERRCODE='23514';
  END;
  v_all:=array_append(v_participants,NEW.direct_semifinal_pair_id);
  SELECT count(DISTINCT id) INTO v_unique FROM unnest(v_all) q(id);
  IF coalesce(array_length(v_all,1),0)<>7 OR v_unique<>7
    OR NOT(v_all @> v_qualifiers AND v_qualifiers @> v_all) THEN
    RAISE EXCEPTION 'Usá exactamente las siete parejas clasificadas, sin repetir ninguna.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.bp_ko_seed_matches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NEW.semifinals IS NOT NULL THEN
   INSERT INTO public.bp_tournament_knockout_matches(tournament_id,stage,slot)
   VALUES (NEW.tournament_id,'semifinal',1),(NEW.tournament_id,'semifinal',2),
          (NEW.tournament_id,'final',1)
   ON CONFLICT(tournament_id,stage,slot) DO NOTHING;
   RETURN NEW;
 END IF;
 INSERT INTO public.bp_tournament_knockout_matches(tournament_id,stage,slot)
 VALUES
 (NEW.tournament_id,'quarterfinal',1),(NEW.tournament_id,'quarterfinal',2),
 (NEW.tournament_id,'quarterfinal',3),(NEW.tournament_id,'semifinal',1),
 (NEW.tournament_id,'semifinal',2),(NEW.tournament_id,'final',1)
 ON CONFLICT(tournament_id,stage,slot) DO NOTHING;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.bp_ko_freeze_started_bracket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF (NEW.quarterfinals IS DISTINCT FROM OLD.quarterfinals
    OR NEW.semifinals IS DISTINCT FROM OLD.semifinals
    OR NEW.direct_semifinal_pair_id IS DISTINCT FROM OLD.direct_semifinal_pair_id)
   AND EXISTS (SELECT 1 FROM public.bp_tournament_knockout_matches m
     WHERE m.tournament_id=OLD.tournament_id AND
       (m.schedule_status='scheduled' OR m.match_status='played')) THEN
   RAISE EXCEPTION 'Primero postergá los partidos de eliminatorias. Si ya tienen resultados, no se pueden cambiar los cruces.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $function$
;

-- Proteger la nueva columna de semifinales igual que los cuadros antiguos.
-- Reconstrucción exacta del MISMO trigger (no cambia otras protecciones).
-- DDL transaccional: si alguna instrucción falla, todo revierte.
DROP TRIGGER IF EXISTS bp_ko_freeze_started_bracket_trg
  ON public.bp_tournament_knockout_brackets;
CREATE TRIGGER bp_ko_freeze_started_bracket_trg
  BEFORE UPDATE OF quarterfinals, direct_semifinal_pair_id, semifinals
  ON public.bp_tournament_knockout_brackets
  FOR EACH ROW EXECUTE FUNCTION public.bp_ko_freeze_started_bracket();

CREATE OR REPLACE FUNCTION public.bp_admin_save_knockout_result(p_match_id uuid, p_sets jsonb, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_m public.bp_tournament_knockout_matches%ROWTYPE;
 v_b public.bp_tournament_knockout_brackets%ROWTYPE;
 v_old public.bp_tournament_knockout_results%ROWTYPE;
 v_p1 uuid;v_p2 uuid;v_s1 integer:=0;v_s2 integer:=0;
 v_winner uuid;v_set jsonb;v_x integer;v_y integer;v_high integer;v_low integer;
 v_i integer;v_length integer;v_existing boolean:=false;v_prev timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.bp_tournament_is_admin() THEN
   RAISE EXCEPTION 'Acceso denegado.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_m FROM public.bp_tournament_knockout_matches WHERE id=p_match_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partido no encontrado.'; END IF;
 PERFORM 1 FROM public.bp_tournaments WHERE id=v_m.tournament_id
   AND status IN ('registration_closed','in_progress') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El torneo no está en curso.'; END IF;
 SELECT * INTO v_m FROM public.bp_tournament_knockout_matches WHERE id=p_match_id FOR UPDATE;
 SELECT * INTO v_b FROM public.bp_tournament_knockout_brackets WHERE tournament_id=v_m.tournament_id;
 SELECT date_trunc('milliseconds',max(updated_at)) INTO v_prev
   FROM public.bp_tournament_match_results WHERE tournament_id=v_m.tournament_id;
 IF v_prev IS DISTINCT FROM v_b.result_revision THEN
   RAISE EXCEPTION 'Cambió un resultado de grupos. Revisá la clasificación antes de continuar.' USING ERRCODE='23514';
 END IF;
 IF v_m.stage='quarterfinal' THEN
   v_p1:=(v_b.quarterfinals->(v_m.slot-1)->>0)::uuid;
   v_p2:=(v_b.quarterfinals->(v_m.slot-1)->>1)::uuid;
 ELSIF v_m.stage='semifinal' THEN
   IF v_b.semifinals IS NOT NULL THEN
     v_p1:=(v_b.semifinals->(v_m.slot-1)->>0)::uuid;
     v_p2:=(v_b.semifinals->(v_m.slot-1)->>1)::uuid;
   ELSIF v_m.slot=1 THEN
     v_p1:=v_b.direct_semifinal_pair_id;
     SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=1;
   ELSE
     SELECT r.winner_pair_id INTO v_p1 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=2;
     SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='quarterfinal' AND k.slot=3;
   END IF;
 ELSE
   SELECT r.winner_pair_id INTO v_p1 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='semifinal' AND k.slot=1;
   SELECT r.winner_pair_id INTO v_p2 FROM public.bp_tournament_knockout_results r
     JOIN public.bp_tournament_knockout_matches k ON k.id=r.match_id
     WHERE k.tournament_id=v_m.tournament_id AND k.stage='semifinal' AND k.slot=2;
 END IF;
 IF v_p1 IS NULL OR v_p2 IS NULL OR v_p1=v_p2 THEN
   RAISE EXCEPTION 'Primero cargá los resultados que determinan los rivales.' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(p_sets)<>'array' OR jsonb_array_length(p_sets) NOT IN (2,3) THEN
   RAISE EXCEPTION 'Se necesitan dos o tres sets.' USING ERRCODE='23514';
 END IF;
 v_length:=jsonb_array_length(p_sets);
 FOR v_i IN 0..v_length-1 LOOP
   v_set:=p_sets->v_i;
   IF jsonb_typeof(v_set)<>'array' OR jsonb_array_length(v_set)<>2 OR
      jsonb_typeof(v_set->0)<>'number' OR jsonb_typeof(v_set->1)<>'number' OR
      (v_set->>0)!~'^[0-9]{1,2}$' OR (v_set->>1)!~'^[0-9]{1,2}$' THEN
      RAISE EXCEPTION 'Cada set necesita dos números enteros.' USING ERRCODE='23514';
   END IF;
   v_x:=(v_set->>0)::integer;v_y:=(v_set->>1)::integer;
   v_high:=greatest(v_x,v_y);v_low:=least(v_x,v_y);
   IF NOT ((v_high=6 AND v_low<=4) OR (v_high=7 AND v_low IN (5,6))) THEN
     RAISE EXCEPTION 'El set debe ser normal: 6-0 a 6-4, 7-5 o 7-6.' USING ERRCODE='23514';
   END IF;
   IF v_s1=2 OR v_s2=2 THEN RAISE EXCEPTION 'Sobran sets: ya había un ganador.' USING ERRCODE='23514'; END IF;
   IF v_x>v_y THEN v_s1:=v_s1+1;ELSE v_s2:=v_s2+1;END IF;
 END LOOP;
 IF v_s1<>2 AND v_s2<>2 THEN RAISE EXCEPTION 'Falta definir el partido.' USING ERRCODE='23514'; END IF;
 v_winner:=CASE WHEN v_s1=2 THEN v_p1 ELSE v_p2 END;
 SELECT * INTO v_old FROM public.bp_tournament_knockout_results WHERE match_id=p_match_id FOR UPDATE;
 v_existing:=FOUND;
 IF v_existing THEN
   IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 1000 THEN
     RAISE EXCEPTION 'La corrección requiere un motivo (5 a 1000 caracteres).' USING ERRCODE='23514';
   END IF;
   IF v_old.sets=p_sets THEN RAISE EXCEPTION 'El resultado no presenta cambios.' USING ERRCODE='23514'; END IF;
   IF (v_old.resolved_pair1_id,v_old.resolved_pair2_id)
     IS DISTINCT FROM (v_p1,v_p2) THEN
     RAISE EXCEPTION 'Cambiaron los participantes: revisá el cuadro.' USING ERRCODE='23514';
   END IF;
   IF v_old.winner_pair_id IS DISTINCT FROM v_winner AND EXISTS(
     SELECT 1 FROM public.bp_tournament_knockout_matches nextm
     JOIN public.bp_tournament_knockout_results nr ON nr.match_id=nextm.id
     WHERE nextm.tournament_id=v_m.tournament_id AND
       ((v_m.stage='quarterfinal' AND nextm.stage IN ('semifinal','final'))
        OR (v_m.stage='semifinal' AND nextm.stage='final'))
   ) THEN
     RAISE EXCEPTION 'Hay resultados posteriores: no se puede cambiar al ganador de origen.' USING ERRCODE='23514';
   END IF;
   INSERT INTO public.bp_tournament_knockout_result_revisions(match_id,old_sets,new_sets,reason,changed_by)
   VALUES(p_match_id,v_old.sets,p_sets,btrim(p_reason),auth.uid());
   UPDATE public.bp_tournament_knockout_results SET sets=p_sets,sets_pair1=v_s1,sets_pair2=v_s2,
     winner_pair_id=v_winner,updated_at=now(),updated_by=auth.uid() WHERE match_id=p_match_id;
 ELSE
   IF v_m.match_status<>'pending' THEN RAISE EXCEPTION 'Partido inconsistente.'; END IF;
   INSERT INTO public.bp_tournament_knockout_results(
     match_id,tournament_id,sets,sets_pair1,sets_pair2,resolved_pair1_id,resolved_pair2_id,
     winner_pair_id,created_by,updated_by)
   VALUES(p_match_id,v_m.tournament_id,p_sets,v_s1,v_s2,v_p1,v_p2,v_winner,auth.uid(),auth.uid());
   UPDATE public.bp_tournament_knockout_matches SET match_status='played',updated_at=now()
     WHERE id=p_match_id;
 END IF;
 RETURN jsonb_build_object('match_id',p_match_id,'winner_pair_id',v_winner,'sets_pair1',v_s1,'sets_pair2',v_s2);
END $function$
;

CREATE OR REPLACE FUNCTION public.bp_public_tournament_followup(p_tournament_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
    'semifinals', b.semifinals,
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
$function$
;

-- Actualizar la caché de esquema para la API PostgREST tras la nueva columna.
NOTIFY pgrst, 'reload schema';
