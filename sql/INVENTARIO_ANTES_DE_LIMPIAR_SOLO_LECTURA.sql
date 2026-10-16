-- BOULEVARD PÁDEL — Inventario de producción (SOLO LECTURA)
-- Este archivo NO elimina ni modifica nada. Ejecutar consultas por separado.
-- Antes de limpiar la base, revisar cuáles filas son de prueba y cuáles son reales.

-- A. Cantidades por módulo
SELECT 'reservations' AS tabla, COUNT(*) AS total FROM public.reservations
UNION ALL SELECT 'fixed_turn_requests', COUNT(*) FROM public.fixed_turn_requests
UNION ALL SELECT 'blockouts', COUNT(*) FROM public.blockouts
UNION ALL SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL SELECT 'bp_tournaments', COUNT(*) FROM public.bp_tournaments
UNION ALL SELECT 'bp_tournament_pairs', COUNT(*) FROM public.bp_tournament_pairs
ORDER BY tabla;

-- B. Reservas y origen (incluye canceladas y turnos fijos)
SELECT id, reservation_code, source, status, booking_name,
  (starts_at AT TIME ZONE 'America/Argentina/Cordoba') AS inicio_argentina,
  (ends_at AT TIME ZONE 'America/Argentina/Cordoba') AS fin_argentina,
  fixed_turn_request_id
FROM public.reservations
ORDER BY starts_at DESC;

-- C. Solicitudes semanales (no eliminar sin comprobar relaciones con reservas)
SELECT id, status, duration_minutes, duration_type,
  start_date, end_date, customer_id
FROM public.fixed_turn_requests
ORDER BY start_date DESC;

-- D. Bloqueos, activos e inactivos
SELECT id, active, reason,
  (starts_at AT TIME ZONE 'America/Argentina/Cordoba') AS inicio_argentina,
  (ends_at AT TIME ZONE 'America/Argentina/Cordoba') AS fin_argentina
FROM public.blockouts
ORDER BY starts_at DESC;
