-- SQL93 · Boulevard Pádel · Validación de zonas A/B/C al publicar grupos (13/11/2026).
-- Sustituye únicamente el cuerpo de un trigger existente, conservando su firma,
-- privilegios de invocador y search_path; NO altera reservas ni datos de torneos.
-- Se ejecuta solo durante la transición privado -> publicado.
CREATE OR REPLACE FUNCTION public.bp_tournament_validate_group_sizes_3_4()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
    v_approved bigint;
    v_group_count bigint;
    v_min bigint;
    v_max bigint;
    v_assigned bigint;
    v_invalid_order bigint;
BEGIN
    -- Una corrección que vuelve los grupos a privados no debe bloquearse.
    IF OLD.groups_published_at IS NULL AND NEW.groups_published_at IS NOT NULL THEN
        SELECT count(*) INTO v_approved
        FROM public.bp_tournament_pairs p
        WHERE p.tournament_id = NEW.id
          AND p.status = 'approved';

        SELECT
            count(*),
            min(s.members),
            max(s.members),
            coalesce(sum(s.members), 0),
            count(*) FILTER (
                WHERE s.group_number <> s.position
                   OR s.members <> CASE
                        WHEN s.position <= (v_approved % 3) THEN 4
                        ELSE 3
                      END
            )
        INTO v_group_count, v_min, v_max, v_assigned, v_invalid_order
        FROM (
            SELECT
                g.group_number,
                row_number() OVER (ORDER BY g.group_number) AS position,
                count(gp.id) AS members
            FROM public.bp_tournament_groups g
            LEFT JOIN public.bp_tournament_group_pairs gp
              ON gp.group_id = g.id
             AND gp.tournament_id = g.tournament_id
            WHERE g.tournament_id = NEW.id
            GROUP BY g.id, g.group_number
        ) s;

        -- Se conserva la protección anterior para las modalidades históricas.
        IF v_approved < 3 OR v_approved = 5
           OR v_group_count <> (v_approved / 3)::bigint
           OR v_min IS NULL OR v_max IS NULL
           OR v_min < 3 OR v_max > 4 THEN
            RAISE EXCEPTION
                'Los grupos deben tener 3 o 4 parejas, con la distribución automática prevista para los inscriptos aprobados.'
                USING ERRCODE = '23514';
        END IF;

        -- Reglamento 2026: A, B, C... completos y, si hay zonas de 4,
        -- necesariamente ocupan las primeras letras sin intercalar zonas de 3.
        IF NEW.format = 'groups_knockout' AND NEW.rules_version = 2026 THEN
            IF v_approved NOT BETWEEN 6 AND 40
               OR v_assigned <> v_approved
               OR v_invalid_order <> 0 THEN
                RAISE EXCEPTION
                    'Distribución inválida: los grupos de 4 parejas deben ser los primeros (A, B, C...) y los restantes deben tener 3. Reorganizá las parejas antes de publicar.'
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- Ya existe en producción:
-- bp_tournaments_sizes_3_4_guard_trg BEFORE UPDATE OF groups_published_at
-- No recrear triggers ni cambiar GRANT/RLS; su llamada a esta función queda activa.
