#!/usr/bin/env bash
# P89: ensayo transaccional entre generación de semifinales y nuevo INSERT.
# CI usa PostgreSQL temporal; NUNCA usar contra la base productiva.
set -euo pipefail

psql -X -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO public.bp_tournaments(id,name,format,status,is_published)
VALUES('00000000-0000-0000-0000-000000000102','Liga concurrencia P89','league','in_progress',false);
INSERT INTO public.bp_tournament_pairs(id,tournament_id,status,player1_name,player2_name)
SELECT x.id,'00000000-0000-0000-0000-000000000102'::uuid,
       'approved',x.p1,x.p2
FROM (VALUES
 ('00000000-0000-0000-0000-000000000011'::uuid,'Pareja 11','Jugador 11'),
 ('00000000-0000-0000-0000-000000000012'::uuid,'Pareja 12','Jugador 12'),
 ('00000000-0000-0000-0000-000000000013'::uuid,'Pareja 13','Jugador 13'),
 ('00000000-0000-0000-0000-000000000014'::uuid,'Pareja 14','Jugador 14')
) AS x(id,p1,p2);
INSERT INTO public.bp_league_matches(tournament_id,pair1_id,pair2_id,
  match_number,round_number,leg,match_status,sets,sets_pair1,sets_pair2,winner_pair_id)
SELECT '00000000-0000-0000-0000-000000000102'::uuid,p1,p2,n,n,1,
  'played','[[6,0],[6,0]]'::jsonb,2,0,p1
FROM (VALUES
 (1,'00000000-0000-0000-0000-000000000011'::uuid,'00000000-0000-0000-0000-000000000012'::uuid),
 (2,'00000000-0000-0000-0000-000000000011'::uuid,'00000000-0000-0000-0000-000000000013'::uuid),
 (3,'00000000-0000-0000-0000-000000000011'::uuid,'00000000-0000-0000-0000-000000000014'::uuid),
 (4,'00000000-0000-0000-0000-000000000012'::uuid,'00000000-0000-0000-0000-000000000013'::uuid),
 (5,'00000000-0000-0000-0000-000000000012'::uuid,'00000000-0000-0000-0000-000000000014'::uuid),
 (6,'00000000-0000-0000-0000-000000000013'::uuid,'00000000-0000-0000-0000-000000000014'::uuid)
) AS m(n,p1,p2);
SQL

loga="$(mktemp)"
logb="$(mktemp)"
trap 'rm -f "$loga" "$logb"' EXIT

# Transacción A genera semifinale y retiene el lock de torneo hasta COMMIT.
(
  psql -X -v ON_ERROR_STOP=1 <<'SQL'
SELECT set_config('app.test_uid','10000000-0000-0000-0000-000000000001',false);
SELECT set_config('app.test_admin','on',false);
BEGIN;
SELECT public.bp_league_prepare_final89('00000000-0000-0000-0000-000000000102');
SELECT pg_sleep(2);
COMMIT;
SQL
) >"$loga" 2>&1 &
pida=$!

sleep 0.4

# Transacción B intenta añadir partido regular durante la generación.
# Debe esperar a A y rechazarse luego de la finalización de A.
if psql -X -v ON_ERROR_STOP=1 <<'SQL' >"$logb" 2>&1; then
INSERT INTO public.bp_league_matches(tournament_id,pair1_id,pair2_id,match_number,round_number,leg)
VALUES ('00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000012',7,7,1);
SQL
  echo "ERROR: INSERT concurrente permitido" >&2
  cat "$logb" >&2
  wait "$pida" || true
  exit 1
fi

if ! grep -Fq 'no se puede agregar un partido regular' "$logb"; then
  echo "ERROR: el INSERT falló por un motivo distinto a la guardia P89" >&2
  cat "$logb" >&2
  wait "$pida" || true
  exit 1
fi
if ! wait "$pida"; then
  echo "ERROR: falló la generación de fase final durante el ensayo" >&2
  cat "$loga" >&2
  exit 1
fi

regular="$(psql -X -tAc "SELECT count(*) FROM public.bp_league_matches WHERE tournament_id='00000000-0000-0000-0000-000000000102'")"
finales="$(psql -X -tAc "SELECT count(*) FROM public.bp_league_final_matches WHERE tournament_id='00000000-0000-0000-0000-000000000102'")"
if [[ "$regular" != "6" || "$finales" != "3" ]]; then
  echo "ERROR: fixture regular alterado o fase final incompleta: regular=$regular, finales=$finales" >&2
  exit 1
fi

echo "P89 CONCURRENCIA OK: INSERT espera, se rechaza después de la generación; 6 regulares y 3 finales."
