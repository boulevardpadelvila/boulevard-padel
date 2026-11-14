# Boulevard Pádel — Inscripción pública automática y correo a Martín (14/11/2026)

## Regla comercial aprobada

Cuando Martín publique un torneo con inscripciones abiertas, toda pareja
que complete **válidamente** el formulario público se considera inscripta
**inmediatamente**, sin aprobación manual posterior.

**No hay validación automática de requisitos personales o deportivos**:
Martín los define y revisa por su cuenta. Si detecta que una pareja no
cumple sus condiciones, la puede **Eliminar inscripción** desde Admin,
con confirmación. También puede editar nombres y teléfono. Se quitaron
las acciones habituales **Aprobar** y **Rechazar** del panel.

La eliminación conserva las restricciones de integridad ya existentes:
no se pueden borrar indiscriminadamente parejas relacionadas con
grupos publicados o partidos ya empezados. El sistema tampoco
cambia los estados de inscripciones históricas, si hubiera alguna.

## Detalles técnicos

- `supabase/functions/register-tournament-pair/index.ts`: usa
  `status: "approved"` y `source: "web"` después de validar origen,
  token Turnstile, formulario, torneo publicado, apertura, cierre y cupo.
  La función de capacidad PostgreSQL serializa altas concurrentes y
  cierra las inscripciones al alcanzar el último cupo. No hubo DDL
  ni cambios en RLS.
- `js/torneos-public.js`: confirma en pantalla
  **«Inscripción confirmada. ¡La pareja ya quedó inscripta en el torneo!»**
  en lugar de indicar aprobación pendiente.
- `js/admin-parejas.js`: conserva ver parejas, estado, teléfono,
  Editar y Eliminar inscripción; ya no requiere aceptar una a una.
- `js/admin-torneos.js`: texto de contingencia para datos históricos
  pendientes, sin recomendar la aprobación manual nueva.
- El correo se intenta **solamente tras el INSERT exitoso**.
  Se reutilizan los secretos de envío de reservas
  `RESEND_API_KEY` y `FIXED_TURN_FROM_EMAIL`, sin copiar claves
  al frontend ni al repositorio.
  Destinatario directo: `boulevardpadelvila@gmail.com`.
  Asunto: «Boulevard Pádel — Nueva pareja inscripta y aprobada».
  Contenido: torneo, nombres, teléfono, momento de inscripción en
  horario Argentina y enlace al Admin. Martín podrá crear un filtro
  de reenvío en Gmail a la otra casilla.
- Si Resend falla, no está configurado o rechaza el correo,
  **la pareja sigue aprobada y el usuario recibe éxito**.
  La función registra un aviso interno sin revelar claves.
  No se reintenta insertar automáticamente: evita duplicaciones.

## Despliegue y pruebas

- PR: https://github.com/boulevardpadelvila/boulevard-padel/pull/41
  merge en `main` `95dbe05656fd7c8993e29b3f5d4ffc1aa79eb508`.
- Edge Function `register-tournament-pair` versión **4**, estado
  **ACTIVE**, confirmada después de desplegar, con
  `verify_jwt=false` por ser el formulario público ya protegido por
  CORS/Turnstile. No se cambió la política de origen.
- **6 checks verdes antes del merge**: pruebas Node nuevas con Deno,
  Turnstile, Supabase y Resend simulados; suite global de regresión;
  SQL89 y SQL90 en Postgres descartable; Chromium móvil; Cloudflare Pages.
  Se simulan alta aprobada, correo al destinatario correcto,
  cupo/duplicados/cierre, correo caído, ausencia de secretos,
  administrador y origen. El correo fallido **no cancela el registro**.
- **Producción estaba sin torneos y sin parejas** al inspeccionar,
  por lo que no se generaron inscripciones ficticias ni se enviaron
  correos de prueba a Martín.

## Validación con Martín en el primer torneo real

1. Crear/abrir/publicar un torneo con cupo disponible.
2. Inscribir **una pareja real y autorizada** desde web.
3. Confirmar mensaje de inscripción inmediata.
4. Confirmar en Admin que aparece «Aprobada» y que no necesita aprobación.
5. Revisar recepción del correo en `boulevardpadelvila@gmail.com`,
   incluida carpeta Spam. Si no llega, consultar logs de la
   Edge Function y Resend; el registro puede haber sido correcto
   aunque falle el correo.
6. Si Martín desea quitar una pareja por razones personales,
   usar «Eliminar inscripción» antes de publicar grupos/fixture.
7. Sincronizar laptop desde `main` y correr `node --test tests/*.test.js`.

## Alcance

No se modificaron turnero, reservas reales, turnos fijos, datos, SQL,
permisos generales, credenciales, cuentas administrativas o
configuración de Cloudflare. TG Torneos es un producto separado.
