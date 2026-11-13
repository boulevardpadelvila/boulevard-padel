# Boulevard Pádel — Auditoría de seguridad Supabase / localhost (13/11/2026)

## Alcance

Revisión de solo lectura de Supabase real (permisos de PostgreSQL, RLS,
funciones `SECURITY DEFINER`, vistas públicas, Edge Functions) y de las
invocaciones desde los clientes web de GitHub/Cloudflare.

**Compatibilidad local:** `localhost` no es un rol de PostgreSQL ni una
identidad confiable. La misma página pública servida desde Cloudflare o
desde `http://127.0.0.1:5500` usa `anon` al no haber sesión y
`authenticated` cuando el Admin inició sesión. El SQL94 no restringe
orígenes ni crea una excepción privilegiada para `localhost`.
El endpoint `register-tournament-pair` permite actualmente los
orígenes `https://boulevard-padel.pages.dev`,
`http://127.0.0.1:5500` y `http://localhost:5500`; otras dos Edge
Functions públicas mantienen CORS `*` y validación Turnstile. **No se
modificaron las tres Edge Functions**, sus secretos, configuración CORS
o `verify_jwt`.

## Hallazgos y acciones

1. **15 trigger functions + 1 event trigger expuestos por permisos heredados.**
   No son RPC que el frontend deba invocar. SQL94 retira EXECUTE para
   `PUBLIC`, `anon` y `authenticated`, y mantiene `service_role`.
   Los TRIGGER ya declarados siguen funcionando: comprobar en PostgreSQL 17
   temporal con un INSERT y UPDATE actuando como `anon`.
2. **Dos RPC administrativas flexibles invocables formalmente por `anon`.**
   La lógica interna verifica `auth.uid()` y `is_admin()`, pero se agrega
   una protección externa: se revoca EXECUTE para `PUBLIC` y `anon` en
   `create_admin_booking_flexible` y `update_admin_booking_flexible`;
   se conserva para `authenticated` y `service_role`. La cuenta Admin
   iniciada desde localhost funciona con `authenticated`.
3. **Generación de código de reserva accesible directamente.**
   `generate_booking_code()` solo es necesaria dentro de otras funciones
   `SECURITY DEFINER` (propietario postgres) y para servicios internos;
   SQL94 revoca llamadas directas a usuarios públicos y mantiene
   `service_role`.
4. **Búsqueda de objetos no calificada.** `set_updated_at()` solo usa
   `NEW` y `now()`; se fija su `search_path` vacío para suprimir la
   advertencia sin alterar el cuerpo ni sus TRIGGER.
5. **Dos vistas `SECURITY DEFINER` de torneos**:
   `bp_public_tournament_groups` y
   `bp_public_tournament_group_fixture`. Están disponibles para el
   público y devuelven nombres de parejas, fixture y horarios de
   torneos publicados. Las consultas inspeccionadas no incluyen teléfonos
   ni correos, pero actúan con los privilegios del propietario y siguen
   apareciendo como advertencia ERROR en Supabase. **No se modifica su
   modalidad**, porque simplemente establecer `security_invoker=true`
   sin preparar permisos específicos y RLS cortaría el seguimiento de
   torneos en la web. Se deja pendiente diseñar una solución de lectura
   pública equivalente, acotada, con pruebas PostgreSQL y de navegador.
6. **Otras funciones públicas `SECURITY DEFINER`**, p. ej.
   `get_booking_config`, `get_available_slots_flexible`,
   `get_booking_by_code`, `cancel_booking_by_code`,
   `bp_public_tournament_followup`, `bp_public_league_followup`,
   `bp_public_league_final89` y
   `bp_tournament_bracket_report2026`: acceso público intencional,
   no revocar. Funciones `is_admin()` y
   `bp_tournament_is_admin()` son comprobadores de autorización
   usados también en RLS; no revocarles `anon` sin un rediseño probado
   de todas las políticas involucradas.
7. **Contraseñas filtradas deshabilitadas en Auth**, extensión
   `btree_gist` instalada en `public` y hallazgos informativos RLS
   de esquemas privados: requieren una revisión independiente, sin
   mover extensiones ni cambiar Auth de forma impulsiva.

## Seguridad operativa

- La clave `service_role` debe permanecer solamente en Edge Functions
  y servicios seguros; nunca en `js/supabase-config.js`, navegador,
  `localhost` ni un repositorio público.
- Todas las pruebas SQL94 se ejecutan en PostgreSQL 17 **descartable**;
  ningún fixture se ejecuta en producción.
- Antes de aplicar SQL94 en Supabase deben aprobar GitHub Actions
  (Node + PostgreSQL 17) y la suite global/regresión. Posteriormente,
  usar una migración versionada y verificar privilegios efectivos de
  `anon`, `authenticated`, `service_role`, el estado de la base y
  los recuentos de reservas, turnos fijos y torneos.
- Prohibido modificar registros productivos para probar flujos de escritura.
  La comprobación de escritura es exclusivamente en la base descartable.
- **Reversibilidad:** SQL94 es una migración de ACL y una opción de
  configuración de función. Conservar copia del estado de privilegios
  previo; ante un problema comprobado, restaurar grants explícitos según
  el inventario, sin tocar información real.

## Estado al crear el borrador

SQL94 preparado en rama independiente y pendiente de CI / despliegue.
Actualizar este apartado con los resultados reales antes de declarar
que producción está protegida.
