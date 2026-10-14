# Bitácora de Desarrollo — Boulevard Pádel

> **Estado vigente (12/10/2026, cierre de esta sesión):** gestión de reservas del portal Admin implementada y probada (consulta, alta, edición, reprogramación, cancelación, vistas activas/canceladas e independencia por reserva). Se preparó una mejora visual de los tres botones de confirmación pública, pendiente de validación en navegador. Próximo módulo: Horarios y disponibilidad. Las referencias anteriores a tareas pendientes reflejan el estado histórico de cada fecha, no el estado vigente.

## Documento maestro del proyecto

**Proyecto:** Boulevard Pádel — Sitio web, turnero, portal Admin y torneos  
**Cliente:** Boulevard Pádel  
**Instagram:** `@padel_bv`  
**Ubicación:** Vila, Santa Fe  
**Dirección pública:** Bvd. Córdoba Este - Vila - Santa Fe  
**WhatsApp del complejo:** +54 3492 258212  
**Frontend:** HTML / CSS / JavaScript  
**Backend:** Supabase / PostgreSQL  
**Hosting:** Cloudflare Pages  
**Repositorio GitHub:** `boulevardpadelvila/boulevard-padel`  
**Rama:** `main`  
**URL de producción actual:** `https://boulevard-padel.pages.dev`  
**Dominio propio previsto:** `boulevardpadel.com.ar`  
**Estado general al 12/10/2026:** turnero público terminado y probado en producción; responsive del logo principal corregido. Base de datos limpia de datos de prueba. Antes de iniciar `/admin`, queda un endurecimiento de seguridad pendiente: revocar el acceso directo de `anon/authenticated` a `create_booking()` para que toda reserva pública pase obligatoriamente por Turnstile + Edge Function.

> Esta es la bitácora maestra. Debe conservarse y actualizarse siempre sobre el mismo archivo `BITACORA_DESARROLLO.md`. No crear copias paralelas con otros nombres. Su objetivo es permitir retomar el proyecto en cualquier momento, incluso desde un chat nuevo, sin perder decisiones, arquitectura, cambios, pruebas, errores ni pendientes.

---

# 20/09/2026 — Inicio del proyecto y repositorio

## Objetivo

Comenzar el desarrollo del sitio web de Boulevard Pádel y dejar preparada una base profesional para trabajar con control de versiones y despliegue web.

## Identidad del proyecto

- Nombre comercial: **Boulevard Pádel**.
- Complejo con **una cancha** en la etapa actual.
- Instagram: `@padel_bv`.
- Ubicación: Vila, Santa Fe.
- Dirección pública definida para pie/contacto: **Bvd. Córdoba Este - Vila - Santa Fe**.
- WhatsApp público del complejo: **+54 3492 258212**.
- Lema utilizado: **“Más Pádel, Más Momentos.”**
- Frase principal del hero: **“MÁS PÁDEL, MÁS MOMENTOS”**.
- Frase de cierre: **“¡NOS VEMOS EN LA CANCHA!”**.

## Repositorio y Git

Se creó el repositorio público:

- GitHub: `boulevardpadelvila`
- Repositorio: `boulevard-padel`
- Rama principal: `main`

Configuración Git del proyecto:

- `user.name`: `Boulevard Padel`
- `user.email`: `boulevardpadelvila@gmail.com`

Acceso SSH dedicado:

```text
Host github-boulevardpadel
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_boulevardpadel
    IdentitiesOnly yes
```

Remote:

```text
git@github-boulevardpadel:boulevardpadelvila/boulevard-padel.git
```

Primer push exitoso registrado en esta etapa.

## Ruta local de trabajo

```text
/home/jotape/Clientes-TGJotaPe/BoulevardPadel
```

---

# 20–21/09/2026 — Sitio público base

## Objetivo

Construir la primera versión pública completa y coherente con la identidad visual del complejo.

## Estructura pública definida

El sitio se organizó inicialmente en:

- Inicio
- La cancha
- Reservas
- Contacto

Se dejó previsto agregar más adelante:

- Campeonatos / Torneos

## Identidad visual

Paleta base:

- negro / carbón;
- blanco roto;
- oliva apagado.

Variables CSS de referencia:

```css
:root {
  --color-bg: #f3f2ee;
  --color-surface: #ffffff;
  --color-dark: #0b0c0a;
  --color-dark-soft: #1c1c19;
  --color-olive: #7d8258;
  --color-olive-light: #9b9d7a;
  --color-text: #22231f;
  --color-muted: #707168;
  --color-border: rgba(11, 12, 10, 0.12);
  --font-heading: "Montserrat", sans-serif;
  --font-body: "Inter", sans-serif;
  --container: 1180px;
  --radius: 18px;
  --transition: 0.25s ease;
}
```

Para títulos principales se adoptó **Barlow Condensed**.

## Logo e imágenes

Archivos principales:

```text
assets/img/logo-boulevard-padel.jpg
assets/img/cancha-boulevard.jpg
```

Cambios realizados:

- se reemplazó el círculo textual “BP” por el logo real;
- el logo se incorporó al header;
- el logo también se integró visualmente al hero;
- se preparó el mismo recurso para favicon / apple touch icon;
- la sección **La cancha** utiliza una foto real del complejo como fondo, sin textos superpuestos innecesarios.

## Hero

Se trabajó la composición hasta dejar:

```text
MÁS PÁDEL
MÁS MOMENTOS
```

Decisiones:

- evitar exceso de texto;
- usar una composición limpia;
- conservar el mensaje “¡NOS VEMOS EN LA CANCHA!” en una sola línea cuando el ancho lo permite;
- mejorar tipografías y jerarquías;
- mantener la identidad oliva/oscura sin sobrecargar.

---

# Septiembre 2026 — Maquetación y refinamiento del sitio público

## Alternancia visual de secciones

Se definió una alternancia claro/oscuro:

- Hero: claro.
- La cancha: oscuro / fotografía.
- Reservas: claro.
- Contacto: oscuro.

Se buscó que cada sección ocupe visualmente un alto completo y que no aparezcan varias secciones comprimidas en una misma pantalla.

## Contacto

La sección de contacto evolucionó a un bloque más completo con:

- Boulevard Pádel;
- ubicación;
- Instagram;
- WhatsApp;
- acceso a reservas.

Datos públicos:

```text
Bvd. Córdoba Este - Vila - Santa Fe
@padel_bv
+54 3492 258212
```

## Footer

Se agregó:

- marca Boulevard Pádel;
- lema;
- dirección;
- crédito de desarrollo a TecnoGestión JotaPe;
- botón **“Acerca de este sitio”**.

## Modal “Acerca de este sitio”

Se creó un modal propio con:

- identificación del sitio;
- propiedad intelectual;
- crédito de diseño y desarrollo a TecnoGestión JotaPe;
- web/contacto de TecnoGestión;
- iconografía;
- líneas decorativas superior/inferior;
- mayor separación visual del título **“Propiedad Intelectual”**.

## Navegación

Se ajustó el comportamiento de botones y enlaces para que:

- Reservas dirija correctamente al turnero;
- Contacto permita llegar de forma natural a la zona inferior del sitio;
- la navegación sea usable tanto en escritorio como en móvil.

---

# Septiembre 2026 — Prototipo inicial del turnero

## Archivos

Se trabajó inicialmente con:

```text
reservar.html
css/turnero.css
js/reservas.js
```

## Flujo visual acordado

El turnero se estructuró en tres pasos:

1. Elegir día.
2. Elegir horario.
3. Completar datos.

Comportamientos:

- clic en día → desplazamiento al bloque de horarios;
- clic en horario → desplazamiento al formulario de datos;
- navegación sin recargas innecesarias;
- estilo consistente con el sitio público.

## Estado del prototipo

En esta etapa:

- los días/horarios eran visuales;
- la ocupación estaba simulada;
- no existía persistencia real;
- no existía backend;
- no existía Admin.

Este prototipo se conservó como base estética porque se prefirió su presentación con tarjetas horizontales por encima de un selector de fecha nativo.

---

# Septiembre–octubre 2026 — Aprobación del cliente y arquitectura definitiva

## Aprobación comercial

El cliente aceptó la propuesta y se definió avanzar con:

- sitio público completo;
- turnero real;
- panel Admin;
- módulo de campeonatos/torneos.

## Arquitectura definitiva acordada

Frontend:

```text
HTML + CSS + JavaScript
```

Hosting:

```text
Cloudflare Pages
```

Backend:

```text
Supabase / PostgreSQL
```

Autenticación:

```text
Supabase Auth para Admin
```

Decisión importante:

- evitar Google Sheets / Apps Script visibles como backend del sistema definitivo;
- mantener el frontend liviano;
- utilizar Supabase con RLS;
- realizar operaciones complejas mediante RPC / funciones controladas.

## Cloudflare Pages

Proyecto:

```text
boulevard-padel
```

Configuración:

- branch: `main`;
- framework: None;
- build command: `exit 0`;
- output directory: `.`;
- despliegue público: `https://boulevard-padel.pages.dev`.

GitHub Pages no se utiliza.

---

# Octubre 2026 — Requerimientos funcionales definitivos

## Reservas comunes

El usuario público:

- no necesita cuenta;
- no instala ninguna aplicación;
- selecciona fecha;
- selecciona horario;
- ingresa nombre y celular;
- confirma;
- recibe código de reserva.

## Rango de fechas

Decisión:

- el Admin podrá definir fecha inicial y fecha final;
- si no define fecha inicial, se toma hoy;
- si no define fecha final, se habilitan por defecto **2 meses**.

## Duración provisoria

```text
90 minutos
```

## Horarios provisorios

Se adoptó temporalmente:

```text
09:00
10:30
12:00
13:30
15:00
16:30
18:00
19:30
21:00
```

Apertura:

```text
09:00
```

Cierre:

```text
22:30
```

Todos los días inicialmente abiertos.

## Turnos fijos

Se acordó soportar:

- solicitud de turno fijo;
- período determinado con fecha de inicio y fin;
- período indeterminado;
- estado inicial pendiente;
- aprobación final por Admin;
- posibilidad futura de editar, suspender, cancelar o finalizar.

---

# Planificación funcional — Portal Admin

Antes de implementarlo se definió como objetivo un portal muy simple de usar.

## Menú previsto

- Dashboard
- Reservas
- Horarios
- Torneos
- Clientes
- Configuración
- Cerrar sesión

## Dashboard previsto

Debe permitir ver rápidamente:

- reservas del día;
- próximo turno;
- horarios libres;
- bloqueos relevantes;
- torneos activos.

## Reservas

El Admin deberá poder:

- crear reserva manual;
- editar;
- reprogramar;
- cancelar;
- consultar estado;
- gestionar reservas fijas;
- gestionar solicitudes de turnos fijos.

## Horarios

El Admin deberá poder:

- definir apertura/cierre por día de semana;
- cerrar un día completo;
- cerrar una semana o rango;
- bloquear una franja horaria;
- bloquear por mantenimiento;
- bloquear por vacaciones;
- bloquear por evento;
- bloquear por torneo.

## Configuración

Debe incluir:

- período habilitado de reservas;
- duración de turnos;
- límite de cancelación;
- habilitación de solicitudes de turnos fijos.

---

# Planificación funcional — Campeonatos y Torneos

Se decidió no implementar este módulo hasta estabilizar turnero y Admin.

## Estructura prevista

```text
Evento
  → Categorías
    → Zonas
      → Clasificación
        → Llave final
```

Un mismo evento podrá tener múltiples categorías.

## Ramas / género

- Caballeros
- Damas
- Mixto

## Categorías configurables

Ejemplos:

- 3ra
- 4ta
- 5ta
- 6ta
- 7ma
- Libre

También condiciones especiales:

- +40;
- Suma X;
- condición personalizada.

## Formatos previstos

- Zona + Llave Final.
- Eliminación Directa.

No hardcodear un único sistema de zona: permitir reglas configurables.

## Partidos

Estados previstos:

- Programado
- En juego
- Finalizado
- Suspendido
- Reprogramado

Formato de partido configurable:

- mejor de 3 sets;
- 2 sets + match tie-break a 10;
- sets cortos;
- formato personalizado;
- Punto de Oro opcional.

## Clasificación

Criterios configurables:

- puntos;
- partidos ganados;
- diferencia de sets;
- diferencia de games;
- enfrentamiento directo;
- otros criterios futuros.

## Público

Página de evento con:

- categorías;
- “Partidos de hoy”;
- pestañas Partidos / Zonas / Llave;
- historial;
- próximos;
- finalizados.

En móvil, la llave debe mostrarse por etapas, sin comprimir un cuadro completo horizontalmente.

## Admin de torneos

Flujo previsto:

- crear evento;
- crear categorías;
- cargar parejas;
- generar zonas automática o manualmente;
- generar fixture;
- programar fecha/hora/cancha;
- ingresar resultado rápidamente;
- recalcular tabla;
- clasificar;
- completar llave.

---

# 11/10/2026 — Inicio de la etapa definitiva del backend

## Objetivo de la sesión

Comenzar la implementación real del sistema de reservas, definir una base sólida en Supabase y dejar preparado el backend antes de modificar el turnero público o construir el portal Admin.

## Decisiones tomadas

- Mantener el website público actual, ya aprobado por el cliente.
- No avanzar todavía con Campeonatos y Torneos hasta dejar estable el turnero y el Admin.
- Utilizar Supabase/PostgreSQL como backend definitivo.
- Mantener GitHub + Cloudflare Pages separados de Supabase.
- Configurar las tablas con RLS desde el inicio.
- No exponer automáticamente tablas nuevas mediante Data API.
- Rango por defecto: hoy + 2 meses.
- Duración provisoria: 90 minutos.
- Preparar arquitectura para múltiples canchas aunque actualmente haya una sola.

## Supabase

Organización:

```text
Boulevard Pádel
```

Proyecto:

```text
boulevard-padel
```

Configuración:

- Plan: Free
- Región: South America (São Paulo)
- Data API: habilitada
- Automatically expose new tables: deshabilitado
- Automatic RLS: habilitado
- Estado: Healthy

URL del proyecto:

```text
https://anoaatioqbxuuxyfiovi.supabase.co
```

La Publishable Key se utiliza en frontend.

**Nunca colocar en frontend/GitHub:**

- `service_role`;
- `sb_secret_...`;
- password de base de datos;
- Secret Key de Turnstile.

---

# 11/10/2026 — Consultas SQL 01 a 07

## 01_base_inicial_boulevard_padel

Se crearon:

- `profiles`
- `courts`
- `booking_settings`
- `weekly_hours`
- `customers`
- `fixed_turn_requests`
- `reservations`
- `blockouts`

Enums:

- `user_role`: admin, staff
- `reservation_status`: confirmed, cancelled, completed, no_show
- `reservation_source`: web, admin, fixed
- `block_type`: manual, maintenance, event, tournament, other
- `fixed_turn_status`: pending, approved, rejected, suspended, cancelled, ended
- `fixed_turn_duration_type`: defined, indefinite

También:

- `set_updated_at()`;
- triggers;
- RLS;
- `public.is_admin()`;
- políticas iniciales;
- configuración del turnero;
- cancha inicial.

## Usuario administrador

Supabase Auth:

```text
boulevardpadelvila@gmail.com
```

Perfil:

```text
Administrador Boulevard Pádel
role = admin
active = true
```

## 02_crear_admin_boulevard_padel

Se vinculó el usuario de Auth con `public.profiles`.

## 03_horarios_provisorios_cancha_1

Se cargaron siete registros en `weekly_hours`.

Todos los días:

```text
09:00 a 22:30
```

Slots:

```text
09:00
10:30
12:00
13:30
15:00
16:30
18:00
19:30
21:00
```

## 04_api_publica_turnero

Se crearon:

```text
get_booking_config()
get_available_slots(date)
```

`get_booking_config()` devuelve:

- booking_start_date efectiva;
- booking_end_date efectiva;
- default_window_months;
- slot_duration_minutes;
- timezone;
- fixed_turn_requests_enabled.

`get_available_slots(date)`:

- genera slots desde `weekly_hours`;
- convierte hora local a timestamptz;
- excluye pasado;
- excluye reservas no canceladas;
- excluye blockouts.

Permisos:

- `anon`
- `authenticated`

Las tablas continúan protegidas por RLS.

## 05_pruebas_api_turnero

Se verificó:

- ventana por defecto de 2 meses;
- duración de 90 minutos;
- timezone `America/Argentina/Cordoba`;
- 9 horarios diarios;
- conversión correcta local ↔ UTC.

## 06_api_crear_reserva

Se creó:

```text
create_booking(...)
```

Valida:

- nombre;
- teléfono;
- rango habilitado;
- pasado;
- día abierto;
- apertura/cierre;
- alineación del slot;
- blockouts;
- reservas superpuestas.

Además:

- crea o actualiza cliente por teléfono;
- crea reserva `confirmed`;
- origen `web`;
- evita doble reserva.

Se agregó protección de superposición mediante constraint GiST y extensión `btree_gist`.

## 07_prueba_reserva_real

Prueba inicial:

```text
Cliente de Prueba
+543492000000
09:00 a 10:30
```

Código inicial:

```text
BP-8ECDC367
```

Se comprobó:

- creación del cliente;
- creación de reserva;
- horario desaparece;
- doble intento devuelve `Este horario acaba de ser reservado`.

---

# 11/10/2026 — Integración frontend ↔ Supabase

## Archivo de configuración

Se creó:

```text
js/supabase-config.js
```

Carga:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Orden de scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script src="js/reservas.js"></script>
```

Se corrigió un error inicial 404 porque `supabase-config.js` no estaba en la ruta esperada.

## Selección de fechas

Se probó inicialmente un `<input type="date">`, pero se descartó porque visualmente no resultaba coherente con el diseño original.

Se recuperaron tarjetas horizontales:

- desplazamiento lateral;
- flechas;
- touch en móvil;
- rango dinámico;
- selección → carga de horarios reales.

## Reserva real

Flujo:

1. elegir fecha;
2. elegir horario;
3. nombre;
4. celular;
5. confirmar;
6. guardar en Supabase;
7. mostrar código real.

---

# 11/10/2026 — Consulta y cancelación

## Decisión de seguridad

Se evaluó inicialmente buscar por teléfono + fecha.

Se descartó porque cualquier persona que conozca el teléfono podría intentar cancelar una reserva ajena.

Decisión final:

- el **código de reserva es la llave de gestión**;
- no se necesita teléfono para consultar/cancelar;
- el código puede compartirse entre integrantes del grupo;
- quien posea el código puede gestionar esa reserva;
- si se pierde, el usuario debe comunicarse con Boulevard Pádel.

## 08_consulta_y_cancelacion_reservas

Se agregó:

```text
cancellation_hours_before = 12
```

en `booking_settings`.

Funciones:

```text
get_booking_by_code(text)
cancel_booking_by_code(text)
```

## Regla de cancelación

- más de 12 horas → puede cancelar;
- exactamente 12 horas → puede cancelar;
- menos de 12 horas → no puede cancelar online.

Prueba exacta de 12 horas realizada dentro de transacción temporal con `ROLLBACK`:

```text
can_cancel = true
```

## Cancelación

Al cancelar:

- no se borra la reserva;
- `status = cancelled`;
- queda historial;
- el horario vuelve a estar disponible inmediatamente.

---

# 11/10/2026 — Código de reserva robusto

## 09_codigo_reserva_seguro

Se cambió el formato:

```text
BP-XXXX-XXXX-XXXX
```

Ejemplos reales de prueba:

```text
BP-E06B-0167-3635
BP-C6DA-A24E-0A8A
BP-D087-1B55-3EB2
```

Se creó:

```text
generate_booking_code()
```

Características:

- genera código aleatorio;
- comprueba inexistencia previa;
- `reservation_code` conserva restricción UNIQUE.

## Error corregido

Durante la actualización se usó erróneamente:

```text
wh.day_of_week
```

La tabla real utiliza:

```text
weekday
```

Además se agregó correctamente:

```text
court_id
```

al filtro de `weekly_hours`.

---

# 11/10/2026 — Fix de cancelación

## 10_fix_cancelacion_reserva

Error:

```text
column reference "reservation_code" is ambiguous
```

Código PostgreSQL:

```text
42702
```

Se corrigió calificando columnas con alias de `reservations`.

Resultado:

- cancelación correcta;
- estado pasa a Cancelada;
- horario reaparece.

---

# 11/10/2026 — Pantalla de confirmación

El código se convirtió en elemento principal.

Se agregó:

- título **TU CÓDIGO DE RESERVA**;
- mensaje de conservarlo;
- advertencia sobre compartirlo;
- botón **Copiar código**;
- botón **Compartir**;
- fallback a portapapeles;
- mensaje para contactar al complejo si se pierde.

---

# 11/10/2026 — “Consultar / cancelar”

Se agregó una vista específica.

Entrada:

```text
Código de reserva
```

Muestra:

- código;
- estado;
- día;
- horario;
- posibilidad de cancelación.

Si está cancelada:

- informa “Esta reserva ya fue cancelada”;
- no muestra otra vez el botón Cancelar.

Refuerzo CSS:

```css
.booking-manage__cancel[hidden] {
  display: none !important;
}
```

---

# 11/10/2026 — Modal de cancelación

Se eliminó `window.confirm()`.

Modal propio con:

- título;
- fecha;
- horario;
- aviso de liberación del horario;
- Volver;
- Confirmar cancelación;
- cierre con `×`;
- clic en backdrop;
- tecla Esc.

Botones de gestión:

```text
[ VOLVER AL TURNERO ] [ CANCELAR TURNO ]
```

en una sola fila en escritorio.

---

# 11/10/2026 — “Hacer otra reserva”

Se eliminó:

```javascript
window.location.reload();
```

porque en móvil Chrome restauraba una posición de scroll incorrecta.

Nuevo comportamiento:

- reinicia fecha;
- reinicia horario;
- limpia formulario;
- bloquea pasos;
- conserva calendario;
- oculta confirmación;
- vuelve al inicio con scroll suave;
- posteriormente también reinicia Turnstile.

---

# 11/10/2026 — Responsive

Pruebas:

```text
390 × 844
430 × 932
768 × 1024
```

Resultado:

- navegación correcta;
- fechas horizontales correctas;
- horarios correctos;
- formulario correcto;
- confirmación correcta;
- consultar/cancelar correcto;
- modal correcto.

---

# 11/10/2026 — Cloudflare Turnstile

## Objetivo

Evitar bots y reservas automatizadas antes de declarar terminado el turnero.

## Widget

Cloudflare:

```text
Application security → Turnstile
```

Widget creado:

```text
Boulevard Padel Reservas
```

Hostname de producción autorizado:

```text
boulevard-padel.pages.dev
```

Modo:

```text
Managed
```

No se habilitó “Skip future security rule challenges”.

## Desarrollo local

Se utilizaron claves oficiales de prueba de Cloudflare para validar la integración en:

```text
127.0.0.1:5500
```

El aviso rojo “solo para pruebas” era esperado.

Con la Site Key real en localhost se comprobó error:

```text
Turnstile 110200
```

Causa:

```text
Domain not authorized
```

Conclusión:

- claves de prueba para localhost;
- claves reales para producción;
- no autorizar innecesariamente `127.0.0.1` en el widget productivo.

## Integración visual

En `reservar.html` se incorporó el script oficial:

```html
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>
```

Se creó un bloque visual:

```text
VERIFICACIÓN DE SEGURIDAD
[ Turnstile ]
Protegemos las reservas contra envíos automáticos.
```

Se integró al estilo del turnero con borde, fondo suave, centrado y responsive.

---

# 11/10/2026 — Edge Function segura

## Secreto

Supabase Edge Functions → Secrets:

```text
TURNSTILE_SECRET_KEY
```

Primero se probó con Secret Key oficial de prueba.

Finalmente se reemplazó por la Secret Key real.

El valor secreto nunca se debe guardar en frontend, GitHub ni esta bitácora.

## Función

Se creó la Edge Function:

```text
create-booking-secure
```

Responsabilidades:

1. recibe datos de reserva;
2. recibe token Turnstile;
3. verifica token mediante Cloudflare `siteverify`;
4. si la verificación falla, rechaza;
5. crea cliente/reserva llamando a `create_booking()`;
6. devuelve resultado al frontend.

## JWT

En Settings de la Edge Function se desactivó:

```text
Verify JWT with legacy secret
```

Razón:

- la reserva pública no requiere login;
- la función realiza validación propia mediante Turnstile.

## Secrets Supabase disponibles

Se verificó presencia de:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEYS
```

Aunque `SUPABASE_SERVICE_ROLE_KEY` aparece marcado como legacy/deprecated, se utilizó para esta implementación inicial de backend seguro.

## Error de permiso

Primera llamada real:

```text
permission denied for function create_booking
```

Se resolvió con:

## 11_permiso_service_role_create_booking

```sql
grant execute
on function public.create_booking(
  text,
  text,
  timestamptz,
  text
)
to service_role;
```

Después de esto:

```text
Turnstile
→ Edge Function
→ create_booking()
→ Supabase
→ código de reserva
```

funcionó correctamente.

---

# 11/10/2026 — Producción

Se realizó commit/push a `main`.

La versión con Turnstile real se probó en:

```text
https://boulevard-padel.pages.dev/reservar
```

Resultado:

- Turnstile real: operación exitosa;
- sin aviso de prueba;
- reserva creada;
- código generado;
- flujo completo correcto.

Código de prueba de producción:

```text
BP-D087-1B55-3EB2
```

---

# 11/10/2026 — Prueba integral final

Se verificó el circuito completo:

1. crear reserva;
2. el horario desaparece;
3. copiar código;
4. consultar reserva;
5. verificar datos;
6. cancelar;
7. estado pasa a `cancelled`;
8. volver al turnero;
9. el horario reaparece.

Resultado:

```text
APROBADO
```

---

# 11/10/2026 — Limpieza final de pruebas

Como todas las reservas y clientes existentes eran de prueba, se limpiaron completamente:

```text
reservations = 0
customers = 0
```

Se comprobó:

```text
Reservas: 0
Clientes: 0
```

No se modificaron:

- configuración;
- cancha;
- horarios;
- Admin;
- funciones;
- políticas;
- bloqueos;
- estructura de base.

La query de limpieza era temporal y puede eliminarse del SQL Editor.

---

# 12/10/2026 — Corrección responsive del logo principal

## Problema detectado

En `index.html`, el logo grande del hero se veía correctamente circular en escritorio, pero en celular aparecía deformado verticalmente, con aspecto ovalado.

El HTML ya definía la imagen con proporción cuadrada:

```html
<div class="hero__logo">
  <img
    src="assets/img/logo-boulevard-padel.jpg"
    alt="Logo Boulevard Pádel"
    width="360"
    height="360"
    fetchpriority="high"
  />
</div>
```

La deformación se producía al reducir el ancho desde las reglas responsive sin forzar que el alto se recalculara proporcionalmente.

## Corrección aplicada

En `css/styles.css`, dentro de la regla base:

```css
.hero__logo img {
  width: min(100%, 360px);
  height: auto;
  aspect-ratio: 1 / 1;

  object-fit: cover;
  border-radius: 50%;

  box-shadow: 0 24px 70px rgba(11, 12, 10, 0.18);
}
```

Se agregó específicamente:

```css
height: auto;
```

## Resultado

Se probó el sitio en distintos tamaños responsive y el logo conserva correctamente su forma circular.

**Estado del pendiente: RESUELTO.**

---

# Estado definitivo del turnero público al cierre del 11/10/2026

## Funciones terminadas

- calendario real;
- período dinámico;
- disponibilidad real;
- horarios desde Supabase;
- reservas reales;
- prevención de doble reserva;
- códigos robustos;
- copiar código;
- compartir código;
- consulta por código;
- cancelación por código;
- límite configurable de 12 horas;
- liberación automática del horario;
- historial mediante estado `cancelled`;
- modal de cancelación;
- reinicio “Hacer otra reserva” sin recarga;
- responsive móvil/tablet;
- Turnstile;
- Edge Function segura;
- prueba en producción;
- limpieza de datos de prueba.

## Turnero público

**Estado: CERRADO FUNCIONALMENTE / LISTO PARA PRODUCCIÓN EN SU ETAPA ACTUAL.**

No rehacer ni cambiar su arquitectura sin una razón funcional concreta.

---

# Estructura actual relevante

```text
BoulevardPadel/
├── index.html
├── reservar.html
├── README.md
├── BITACORA_DESARROLLO.md
├── css/
│   ├── styles.css
│   └── turnero.css
├── js/
│   ├── main.js
│   ├── reservas.js
│   └── supabase-config.js
└── assets/
    └── img/
        ├── cancha-boulevard.jpg
        └── logo-boulevard-padel.jpg
```

---

# Consultas SQL permanentes registradas

```text
01_base_inicial_boulevard_padel
02_crear_admin_boulevard_padel
03_horarios_provisorios_cancha_1
04_api_publica_turnero
05_pruebas_api_turnero
06_api_crear_reserva
07_prueba_reserva_real
08_consulta_y_cancelacion_reservas
09_codigo_reserva_seguro
10_fix_cancelacion_reserva
11_permiso_service_role_create_booking
```

Las queries puramente temporales de prueba o limpieza no necesitan conservarse.

---

# Principios técnicos acordados

- RLS-first.
- No exponer tablas directamente si una RPC controlada resuelve la operación.
- No guardar secretos en frontend.
- Public key en frontend: permitido.
- Secret/service-role: solo servidor.
- Las reservas públicas no requieren login.
- El frontend productivo crea reservas mediante Turnstile + Edge Function `create-booking-secure`.
- El código de reserva funciona como credencial para consultar/cancelar.
- No borrar reservas reales al cancelar: cambiar estado.
- Preparar arquitectura para múltiples canchas aunque hoy exista una.
- Mantener GitHub + Cloudflare Pages separados de Supabase.
- Evitar complejidad innecesaria para el usuario y para el Admin.

---

# Pendiente de seguridad antes de iniciar `/admin`

Aunque el frontend productivo ya utiliza:

```text
Turnstile
→ Edge Function create-booking-secure
→ create_booking()
```

durante la etapa inicial se otorgó permiso de ejecución de `create_booking(...)` a `anon` y `authenticated`.

Si ese permiso sigue activo, un cliente que conozca la Publishable Key podría intentar llamar directamente a la RPC y evitar Turnstile. Por lo tanto, antes de considerar cerrada la protección anti-bot, ejecutar y probar:

```sql
revoke execute
on function public.create_booking(
  text,
  text,
  timestamptz,
  text
)
from anon, authenticated;
```

Mantener:

```text
service_role → EXECUTE permitido
```

Después:

1. crear una reserva desde la web productiva;
2. confirmar que Turnstile + Edge Function siguen funcionando;
3. verificar que una llamada directa anónima a `create_booking()` ya no tenga permiso.

También conviene revisar si `generate_booking_code()` necesita seguir teniendo `EXECUTE` para `anon/authenticated`; en principio el navegador no la necesita directamente.

Este endurecimiento es el **primer pendiente técnico de la próxima etapa**, antes o inmediatamente al comenzar `/admin`.

---

# Próxima etapa exacta: Portal Admin

Al retomar el proyecto, **no volver a trabajar el turnero público salvo que aparezca un bug**.

Comenzar:

```text
/admin
```

## Primera meta

- pantalla de login;
- Supabase Auth;
- comprobar `profiles.role = admin`;
- comprobar `active = true`;
- redirigir al Dashboard.

## Después

Dashboard:

- reservas del día;
- próximos turnos;
- libres;
- solicitudes pendientes;
- bloqueos;
- torneos activos en el futuro.

Luego:

- Reservas
- Horarios
- Turnos fijos
- Clientes
- Configuración
- Torneos

---

# Pendientes posteriores

## Admin

- login;
- dashboard;
- reservas manuales;
- editar/reprogramar/cancelar;
- horarios semanales;
- bloqueos por fecha/franja;
- cierre de día/rango;
- turnos fijos;
- clientes;
- configuración.

## Turnos fijos

- solicitud pública;
- definido / indeterminado;
- aprobación/rechazo;
- edición;
- suspensión;
- cancelación;
- finalización.

## Torneos

- eventos;
- categorías;
- parejas;
- zonas;
- fixture;
- resultados;
- tablas;
- clasificación;
- llaves;
- partidos de hoy;
- historial;
- futura clasificación/ranking anual opcional.

## Producción final

- dominio propio `boulevardpadel.com.ar`;
- vinculación definitiva en Cloudflare;
- agregar el dominio propio al hostname permitido de Turnstile cuando corresponda;
- prueba final después del cambio de dominio.

---

# Guía para retomar desde un chat nuevo

Al iniciar un nuevo chat, adjuntar o proporcionar este archivo y solicitar:

> “Continuemos el proyecto Boulevard Pádel desde la bitácora. El turnero público está terminado y probado en producción. Primero revisemos el endurecimiento pendiente de `create_booking()` y después comencemos el portal Admin.”

El nuevo chat debe asumir como válidas estas decisiones y no volver a rediseñar lo ya cerrado salvo que se detecte un problema.

## Punto exacto de reanudación

```text
1. Revocar acceso directo anon/authenticated a create_booking() y probar.
2. Construcción del portal /admin.
```

Primer trabajo:

```text
Después del hardening: Login Admin con Supabase Auth
```

---

# Regla de mantenimiento de esta bitácora

Después de cada sesión importante:

- actualizar **este mismo archivo**;
- no crear `BITACORA_FINAL`, `BITACORA_NUEVA`, `BITACORA_V2` ni copias similares;
- conservar la historia previa;
- agregar lo nuevo cronológicamente;
- registrar errores y soluciones;
- registrar pruebas;
- registrar decisiones;
- actualizar estado actual y próximo paso.

**Archivo único:** `BITACORA_DESARROLLO.md`

12/10/2026 13:41

# Boulevard Pádel — Bitácora de desarrollo

**Fecha:** 12/10/2026  
**Estado:** Pausa solicitada antes del almuerzo  
**Punto exacto de reanudación:** finalizada la validación de permisos `SELECT` para `reservations`, `customers` y `courts` (los tres `true`). Empezar a implementar el panel principal del Admin, solo lectura, sin repetir consultas de diagnóstico.

## Objetivo de la sesión

Iniciar el portal de administración de Boulevard Pádel, manteniendo el sitio y turnero público operativos. Priorizar simplicidad, claridad, uso móvil y seguridad; trabajar paso a paso.

## Arquitectura de referencia

- Frontend HTML/CSS/JS; alojamiento previsto en Cloudflare Pages.
- Supabase Auth, PostgreSQL con RLS, Edge Functions para las reservas públicas.
- Protección pública mediante Cloudflare Turnstile y Edge Function `create-booking-secure`.
- Desarrollo local desde Live Server en `http://127.0.0.1:5500/admin/index.html`.

## 1. Seguridad de creación de reservas — Completada y probada

- Se comprobó que `public.create_booking(text,text,timestamptz,text)` tenía `EXECUTE` para `anon`, `authenticated` y `service_role`.
- Se ejecutó la modificación definitiva `REVOKE EXECUTE ON FUNCTION public.create_booking(text,text,timestamptz,text) FROM anon, authenticated;`.
- Comprobación posterior: `anon=false`, `authenticated=false`, `service_role=true`.
- Se hizo una reserva desde el turnero público con Turnstile después del cambio, confirmada correctamente.
- Reserva conservada para desarrollo: `PRUEBA_ADMIN`, martes 13/10/2026, 16:30.
- Nota de seguridad: que la reserva funcione no equivale por sí solo a una auditoría de bypass de Turnstile; verificar integralmente el flujo antes de producción.

## 2. Portal Admin — Etapa 1 finalizada

- Archivos nuevos/actualizados en el proyecto local: `admin/index.html`, `css/admin.css`, `js/admin.js`.
- Inicio de sesión Supabase Auth, validación de perfil, pantalla de bienvenida y cierre de sesión, comprobados funcionalmente.
- Recuperación de contraseña y nueva contraseña probadas; no almacenar ni compartir credenciales en la bitácora.
- Cuenta administradora: `boulevardpadelvila@gmail.com`.
- Auth -> URL Configuration: se agregó `http://127.0.0.1:5500/admin/index.html` como URL de redirección; no se modificó Site URL (`http://localhost:3000` al momento de la consulta).
- Perfil en `public.profiles`: `full_name='Administrador Boulevard Pádel'`, `role='admin'`, `active=true`.
- Falló inicialmente la verificación de perfil con `permission denied for table profiles` (42501). Se solucionó mediante `GRANT SELECT ON TABLE public.profiles TO authenticated;`.
- Se revisaron políticas RLS: `Users can read own profile` y `Admins manage profiles`; función `public.is_admin()` SECURITY DEFINER. Se verificó acceso correcto con la cuenta administradora.
- El cierre de sesión y permanencia fuera de sesión tras recarga fueron probados.

## 3. Portal Admin — Etapa 2: diagnóstico terminado

### Estructura

- `public.reservations`: id, reservation_code, customer_id, court_id, starts_at, ends_at, status, source, fixed_turn_request_id, notes, created_at, updated_at.
- `public.customers`: id, full_name, phone, email, notes, created_at, updated_at.
- Reservas vinculadas por FK a `customers(id)`, `courts(id)` y opcionalmente `fixed_turn_requests(id)`.

### Seguridad y permisos

- Las tablas `courts`, `customers` y `reservations` tienen RLS activo y política `Admins manage ...`, aplicada a `authenticated`, con condición `is_admin()`.
- La primera comprobación de privilegios SQL `SELECT` devolvió `false` en las tres tablas.
- Se ejecutó `GRANT SELECT ON TABLE public.reservations, public.customers, public.courts TO authenticated;`.
- **Última comprobación confirmada**: `reservas=true`, `clientes=true`, `canchas=true`.
- No se concedieron permisos administrativos de escritura en esta etapa.

## 4. Consultas SQL — Criterio de organización

- Guardar solo cambios definitivos útiles; cerrar consultas temporales y de diagnóstico sin guardar.
- Modificaciones definitivas de esta sesión: `12_seguridad_create_booking`, `13_permiso_lectura_profiles`, `14_permiso_lectura_admin_reservas`.
- No es necesario volver a ejecutar diagnósticos ya resueltos al retomar.

## 5. Estado de cambios y pruebas

- Archivos Admin incorporados en el proyecto local. No se hizo commit ni push de los cambios del Admin durante la sesión, según instrucciones.
- La reserva `PRUEBA_ADMIN` permanece cargada, para probar consultas, detalles, edición y cancelación más adelante.
- Toda la información actual del turnero es de prueba. Acordado: conservar datos necesarios durante el desarrollo y limpiar al concluir el Admin y antes de entregar a producción; no borrar estructura ni configuración.

## 6. Próximo paso EXACTO

1. Preparar una primera actualización aislada del Admin para mostrar reservas por fecha desde Supabase, con datos relacionados de cliente y cancha, **solo lectura**.
2. Reutilizar `admin/index.html`, `css/admin.css` y `js/admin.js`, manteniendo el login y cierre de sesión existentes.
3. Mostrar `PRUEBA_ADMIN` seleccionando 13/10/2026; cuidar zona horaria de Argentina al filtrar fechas y formatear horas.
4. Probar interfaz en escritorio y teléfono y verificar que usuarios no administradores no puedan consultar datos; comprobar si aparecen errores de privilegios sin abrir permisos indiscriminadamente.
5. Después, implementar operaciones administrativas de reservas, horarios/bloqueos, turnos fijos y torneos por etapas.

## 7. Otros pendientes conocidos

- Revisar logo circular del hero en vista móvil de `index.html`: se deforma verticalmente; conservar proporción circular con dimensiones, `aspect-ratio` y `object-fit` correctos.
- Completar panel de configuración del complejo y módulo de torneos en fases posteriores.
- Al finalizar: limpieza controlada de registros de prueba; pruebas de seguridad y funcionalidad completas; publicación y commits cuando se autorice.

**Frase para retomar:** «Continuemos Boulevard Pádel desde la bitácora del 12/10/2026. Ya verificamos SELECT=true en las tres tablas. Empecemos el panel Admin de reservas, solo lectura».


---

# 12/10/2026 — Continuación: panel Admin de reservas y cierre funcional

## Objetivo

Convertir el acceso administrativo en una herramienta de gestión cotidiana con diseño sencillo, amplio en escritorio y usable en teléfono. No rehacer el turnero público terminado ni introducir configuraciones duplicadas de horarios.

## Respaldo Git

- Se confirmó `git commit -m "Iniciamos portal Admin con etapas 1 y 2 finalizadas"` y `git push` exitosos a `main`.
- Commit confirmado: `65d9704` (desde `b24d6a6`). El respaldo incluyó el primer portal Admin y los archivos presentes en ese momento; **no significa que los desarrollos posteriores de reservas ya estén publicados**.
- Como Cloudflare Pages despliega desde `main`, comprobar los despliegues cuando se publique el resto. La interfaz de inicio de sesión puede ser accesible, pero datos y operaciones requieren Auth y RLS.
- **Pendiente:** hacer un nuevo commit/push del código local actualizado únicamente después de probar las últimas mejoras.

## Lectura de reservas y diseño del panel

- Consulta real de reservas desde Supabase por fecha, enlazando cliente y cancha; prueba con `PRUEBA_ADMIN` del 13/10 a las 16:30.
- Cambio de fecha actualiza automáticamente; el botón **Actualizar** se conserva porque permite ver reservas nuevas creadas desde otra pestaña sin cambiar de fecha. Se probó con `PRUEBA_ADMIN_2`.
- Se eliminó el ancho excesivamente limitado del panel autenticado: aprovecha el escritorio con márgenes moderados. Formulario de login permanece compacto.
- Encabezado reducido; tarjetas compactas en orden cronológico: **3 por fila en PC, 2 en tablet y 1 en móvil**. Acciones principales al alcance, sin scroll innecesario ni amontonamiento.
- Botones en el encabezado: **+ Nueva reserva** y **Ver canceladas**; misma altura y alineación. **No** se utiliza un filtro múltiple.
- Vista habitual: únicamente reservas activas/confirmadas de la fecha elegida. Al pulsar **Ver canceladas**, lista solo las canceladas de esa fecha; pasa a **Ver activas** para regresar.
- El diseño y comportamiento de estos botones fueron aprobados y probados en navegador.

## Consulta SQL definitiva 15 — `15_crear_reserva_admin`

- Se creó `public.create_admin_booking(p_full_name text, p_phone text, p_starts_at timestamptz, p_notes text DEFAULT NULL)`.
- Requiere usuario autenticado y `public.is_admin() = true`; revoca EXECUTE para `PUBLIC` y `anon`, concede a `authenticated` (con validación interna de administrador).
- Reutiliza `public.create_booking()` para validar nombre, teléfono, configuración, fecha, slots, bloqueos y superposición; cambia a `source = 'admin'` por UUID en la misma transacción.
- Prueba de permisos: `anon=false`, `authenticated=true`.
- Se implementó formulario **+ Nueva reserva** dentro del Admin, consultando `get_available_slots(p_date)`; **no hay horarios hardcodeados**.
- Reserva manual probada: `ADMIN_PRUEBA3`, 14/10/2026 a las 09:00; guardada con `status=confirmed` y `source=admin`. El horario dejó de ofrecerse para otra reserva.
- El turnero público sigue empleando Turnstile + Edge Function y `source=web`.

## Consulta SQL definitiva 16 — `16_editar_reserva_admin`

- Se creó `public.update_admin_booking(...)` con guardas `auth.uid()` + `is_admin()` y permiso EXECUTE limitado a `authenticated`.
- Edición de nombre, teléfono, notas y fecha/hora; conserva código y origen. Se comprueba disponibilidad real para reprogramar y se controla superposición en base de datos.
- UI de edición preserva el turno actual como opción aunque ya no aparezca entre los libres.
- Pruebas: `ADMIN_PRUEBA3` pasó de 09:00 a 10:30; se liberó el horario anterior y se conservó el código. Edición de nombre también funcionó.
- **Problema detectado:** el UPSERT original en `customers` por teléfono podía cambiar la ficha compartida y mostrar nombres alterados en otras reservas; no se consideró cerrado hasta corregirlo.

## Consulta SQL definitiva 17 — `17_cancelar_reserva_admin`

- Se creó `public.cancel_admin_booking(p_reservation_id uuid)` con verificación de administrador activo y bloqueo de la reserva concreta para actualizarla.
- Solo cambia `status` a `cancelled` y `updated_at`; no borra reserva, cliente, código ni origen. La franja queda libre para futuras reservas.
- No se aplica al administrador el límite de 12 horas de la cancelación pública.
- Se conectó **Cancelar** en cada tarjeta confirmada con modal de confirmación. El modal presenta en filas separadas **Nombre, Fecha, Hora, Código** y advierte que queda historial.
- Incidencia corregida: `Uncaught ReferenceError: ZONE is not defined` en `openCancelBooking()`; se sustituyó por la constante real `ARGENTINA_TZ`.
- Prueba real: `ADMIN_PRUEBA_EDITADA`, 14/10/2026 de 10:30 a 12:00, pasó a **Cancelada**, se mostró el mensaje de éxito, los botones quedaron deshabilitados y el horario volvió a estar disponible.

## Consulta SQL definitiva 18 — `18_independencia_y_vista_canceladas`

- Se incorporaron a cada reserva valores propios de nombre y teléfono para evitar que editar una ficha de cliente por teléfono altere los datos visibles de otras reservas.
- Se actualizó la operación de edición y el Admin para utilizar los datos propios de la reserva; se conservaron reservas, clientes e historial existentes.
- Prueba final **superada**: reservas del 15/10/2026 con el mismo teléfono y nombres diferentes; al editar una, las otras conservaron exactamente sus nombres originales.
- Captura final mostró tres tarjetas activas del 15/10/2026, a las 09:00, 10:30 y 13:30, todas con el mismo teléfono y nombres independientes.
- La vista de canceladas de la fecha se probó correctamente con botón para regresar a activas.
- Criterio definitivo: **editar una reserva afecta exclusivamente esa reserva**. Reprogramación y cancelación son operaciones habituales; cambios de nombre son excepcionales.

## Decisiones de producto y almacenamiento

- La configuración centralizada del complejo (`booking_settings`, `weekly_hours`, `blockouts` y la consulta `get_available_slots`) determina días, horarios, duración, período y bloqueos tanto para público como Admin. **No duplicar reglas ni fijar horarios en JavaScript**.
- Al cancelar, conservar el registro y excluirlo de la ocupación activa; no crear tablas extra de historial. Puede servir para estadísticas futuras.
- Se midió `pg_database_size(current_database()) = 11 MB` al 12/10/2026; presupuesto de referencia del plan Free: 500 MB. Controlar crecimiento antes de considerar exportación/depuración o un plan pago. La medición incluye base e índices y no constituye un consumo exclusivo de reservas.
- Los datos actuales son pruebas. Mantener los necesarios para desarrollo; realizar limpieza controlada al terminar Admin antes de la entrega, sin borrar tablas, funciones ni configuración.
- Mantener en Supabase SQL Editor solo consultas permanentes de cambios (01–18, según sean pertinentes). Cerrar consultas temporales sin guardar.

## 12/10/2026 — Ajuste visual preparado del turnero público

- En `reservar.html`, se colocó **Hacer otra reserva** junto a **Copiar código** y **Compartir**, dentro de `.booking-code-box__actions`.
- En `css/turnero.css`, los tres botones ocupan columnas de igual ancho y altura, con texto en una sola línea mediante tipografía condensada responsive. Los eventos y `id` de los botones no se alteraron.
- **Estado: archivos preparados, pendientes de validación visual y funcional en navegador, escritorio y celular.** No marcar como probado hasta recibir confirmación del usuario.

## Estado al cierre de la sesión

**Completado y probado:** autenticación y recuperación Admin; listado por fecha; diseño de tarjetas; actualización manual; creación manual; edición y reprogramación; cancelación; historial; botón de canceladas por fecha; independencia de datos entre reservas con teléfono compartido.

**Preparado, pendiente de probar:** tres botones juntos en la confirmación pública, igual tamaño y textos en una línea.

**Siguiente módulo principal:** **Horarios y disponibilidad** en el Admin: administrar apertura/cierre por día, horarios, períodos habilitados y bloqueos, reflejados automáticamente en ambas interfaces.

**Posteriormente:** solicitudes de turnos fijos, configuraciones restantes, clientes, torneos, pruebas de seguridad completas y eventual dominio propio.

**Próximo paso exacto al retomar:** aplicar `reservar.html` y `css/turnero.css`, probar confirmación de reserva en pantalla grande y móvil; luego hacer commit/push aprobado del estado local, verificar despliegue y continuar con Horarios y disponibilidad. No repetir las consultas SQL de diagnóstico ya resueltas.

**Regla inalterable:** este documento es el único `BITACORA_DESARROLLO.md`; toda actualización futura conservará íntegro lo anterior e incorporará cambios cronológicamente. No crear versiones paralelas.

---

# 12/10/2026 — Cierre de jornada: calendario Admin y diseño de configuración

## Confirmación del turnero público

- Se publicó y comprobó en Cloudflare Pages la disposición de los tres botones **Copiar código**, **Compartir** y **Hacer otra reserva** en una sola fila, con igual ancho y texto en una sola línea.
- Se solicitó compactar verticalmente la pantalla de confirmación para mostrar también los datos del turno sin desplazamiento en escritorio con zoom del navegador al 100 %. Se retiró el texto redundante «Tu turno quedó reservado correctamente».
- Se entregó la actualización `BoulevardPadel_Confirmacion_Compacta.zip` (`reservar.html` y `css/turnero.css`). **Su resultado final en producción y en móvil requiere todavía confirmación**; no se debe dar por comprobado solo por haber preparado el archivo.

## Admin — Calendario de reservas

- El botón **Actualizar** se trasladó junto a **+ Nueva reserva** y **Ver canceladas** en el encabezado de acciones. Se conserva porque nuevas reservas públicas no aparecen solas mientras el Admin mantiene abierta una fecha.
- Se reemplazó el selector de fecha grande por tarjetas horizontales de día/mes con flechas, siguiendo el lenguaje visual del turnero público. Se mantuvo un campo reducido «Ir a una fecha» para consultar fechas distantes y pasadas.
- El usuario confirmó que el nuevo diseño del calendario se ve excelente.

## Admin — Horarios y disponibilidad: primera versión únicamente visual

- Se agregó acceso a **Horarios y disponibilidad** desde el panel Admin; se mantiene la sección **Reservas**.
- Se diseñaron los controles de apertura/cierre de lunes a domingo, hora de inicio y finalización, duración de turnos, anticipación máxima de reserva y cierres/bloqueos excepcionales.
- El usuario aprobó visualmente la nueva sección y solicitó que **Duración de turnos**, **Período de reservas** y **Cierres y bloqueos excepcionales** queden como tres tarjetas en una sola fila en computadora. Se preparó el ajuste visual con una grilla de tres columnas de igual ancho en escritorio; dos o una columna en pantallas intermedias y una columna en móvil.
- **La configuración continúa como maqueta:** no lee ni persiste cambios en Supabase. Los horarios mostrados son provisionales y el botón Guardar permanece deshabilitado. **No asumir que los controles ya cambian la disponibilidad real.**
- Próxima fase: diseñar operaciones administrativas autorizadas para `weekly_hours`, `booking_settings` y `blockouts`, respetando la fuente única de disponibilidad de ambos turneros y validando impactos sobre reservas existentes.

## Estado de publicación y pasos de continuación

- La publicación del Admin y del último ajuste visual de Configuración debe hacerse por GitHub (`main`) y posterior despliegue de Cloudflare Pages. No consignar un push como exitoso hasta verificar su salida.
- La recuperación de contraseña en producción requiere revisar `https://boulevard-padel.pages.dev/admin/index.html` entre las redirecciones autorizadas de Supabase Auth; la URL local de pruebas se conserva.
- La bitácora maestra sigue siendo **exclusivamente** `BITACORA_DESARROLLO.md`. Los avances nuevos se añaden al documento íntegro, sin crear otras bitácoras.
- **Próximo paso al retomar:** confirmar visualmente las tres tarjetas alineadas y el responsive; verificar el commit/push y despliegue; luego comenzar la conexión segura de configuración con Supabase. También se deben probar los accesos y cambios desde producción antes de la entrega.


---

## 14/10/2026 — Maqueta visual del módulo Torneos en el portal Admin

**Objetivo:** adelantar el diseño administrable del futuro módulo de torneos sin implementar todavía backend ni persistencia. Se partió del ZIP actualizado `BoulevardPadel(4).zip` facilitado por el usuario.

**Cambios realizados:**
- Se agregó una tercera sección «Torneos» a la navegación del Admin, junto a «Reservas» y «Horarios y disponibilidad».
- Se incorporó `#admin-torneos-view` al HTML existente del panel, con encabezado explícito de «Vista de diseño · No guarda cambios».
- Se diseñaron tarjetas de resumen sin estadísticas ficticias, formulario preliminar de torneo (nombre, categoría, modalidad, fechas, cupo, estado), área de parejas/inscripciones y recorrido de grupos/fixture.
- Se creó `css/admin-torneos.css` como hoja **exclusiva** para el módulo y su adaptación responsive. Se respetan paleta, fuentes, bordes y patrones del portal existente.
- `js/admin.js` solo se ajustó para navegar entre tres vistas; no hay escrituras, consultas ni llamadas nuevas a Supabase.
- Guardar, agregar pareja y administrar fixture permanecen deshabilitados. Los campos son solo demostrativos y no guardan datos.

**Archivos modificados/añadidos:** `admin/index.html`, `js/admin.js`, `css/admin-torneos.css`, `BITACORA_DESARROLLO.md`.

**Estado y comprobaciones pendientes:** verificar visualmente los tres accesos del menú y la distribución de Torneos en PC/tablet/celular mediante Live Server y en producción tras el push. No se implementaron competiciones, inscripciones, fixture, partidos, resultados, reservas/bloqueos automáticos ni esquema SQL.

**Próxima etapa:** priorizar conexión real de Horarios y disponibilidad con Supabase, controles de cierres/bloqueos y turnos fijos; planificar backend de Torneos posteriormente. La navegación móvil del calendario Admin sigue pendiente de avance de un día por pulsación; no se modifica en esta entrega.

## 14/10/2026 — Ajuste visual rápido del selector de secciones del Admin
- **Objetivo:** mejorar la visual de las tres tarjetas superiores del portal Admin antes del commit/push.
- **Cambios realizados:**
  - Se rediseñaron las pestañas **Reservas**, **Horarios y disponibilidad** y **Torneos** para que funcionen visualmente como tarjetas más altas.
  - Se aumentó el tamaño de la tipografía para aprovechar mejor el espacio disponible.
  - Se agregaron iconos representativos a cada tarjeta para facilitar la identificación rápida de cada sección.
  - Se mejoró la adaptación responsive para que, en pantallas angostas, las tres opciones se muestren con mejor jerarquía visual.
- **Archivos modificados:**
  - `admin/index.html`
  - `css/admin.css`
- **Estado:** ajuste visual aplicado. Pendiente revisión final del usuario en navegador antes de hacer commit/push.

## 14/10/2026 — Navegación adaptable de fechas del Admin
- **Objetivo:** que las flechas del calendario avancen según la cantidad de tarjetas que entran en pantalla.
- **Cambio:** `js/admin.js` calcula las tarjetas completas visibles a partir del ancho real del contenedor, el ancho de cada tarjeta y el espacio entre ellas. En escritorio (ancho de ventana superior a 1024 px) mantiene el avance semanal de 7 días; en tablet y celular desplaza entre 1 y 7 días según el espacio disponible.
- **Sin alterar:** calendario, selección de fecha, lectura de reservas, Supabase ni diseño aprobado.
- **Pruebas:** sintaxis del JavaScript y estructura ZIP verificadas; queda comprobar el desplazamiento en navegadores reales de escritorio, tablet y celular antes de cerrar el ajuste.

## 14/10/2026 — Primera conexión real de «Horarios y disponibilidad» con Supabase
- **Objetivo:** reemplazar los datos provisionales de la maqueta por la configuración existente, habilitando lectura y guardado únicamente desde la sesión Admin.
- **Diagnóstico SQL confirmado:** `booking_settings` id 1, turnos de 90 min, ventana de 2 meses, zona `America/Argentina/Cordoba`, cancelación 12 h; `weekly_hours` con una cancha y siete días activos de 09:00 a 22:30. Las tres tablas tienen RLS y política `is_admin()`; se concedió a `authenticated` SELECT y UPDATE en `booking_settings` y `weekly_hours` mediante el script definitivo `19_permisos_configuracion_admin`.
- **Frontend:** `admin/index.html` identifica botón de guardar y mensajes de estado; opciones de duración/ventana con valores numéricos. `js/admin.js` carga `booking_settings` y `weekly_hours` desde Supabase al abrir la sección, sincroniza interruptores/horas/selectores y habilita guardado únicamente tras lectura válida. Se comprueban siete días de una misma cancha, horarios válidos, duración 60/90/120 min y ventana 1/2/3 meses; se pide confirmación explícita antes de escribir. No se habilitaron inserción, eliminación ni modificaciones de `blockouts`.
- **Importante:** la escritura por REST consta de una actualización de configuración general y siete actualizaciones de días; **no es transaccional**. Si falla durante el proceso pueden quedar algunos valores actualizados; se vuelve a leer la configuración, se informa del fallo y debe revisarse antes de reintentar. En una etapa posterior se recomienda RPC transaccional Admin para un guardado atómico.
- **Estado y pruebas:** sintaxis JS comprobada localmente. Pendiente prueba de lectura, guardado y efecto sobre la disponibilidad pública con sesión Admin real; no se alteraron los datos del proyecto desde esta sesión.
- **Siguientes pasos:** validar lectura y guardado con un cambio reversible sin reservas afectadas; implementar bloqueos excepcionales y la interfaz de turnos fijos; más adelante, planificar backend de Torneos.

## 14/10/2026 — Preparación del guardado atómico de horarios
- **Objetivo:** evitar cambios parciales al guardar la configuración general y los siete días de la cancha.
- **Backend propuesto:** `sql/20_guardado_atomico_configuracion_admin.sql` crea `public.save_admin_booking_config(...)` con `SECURITY INVOKER`, comprobación `is_admin()`, validación de 7 días únicos, intervalos válidos y duración/período permitidos. La función actualiza ocho filas en una sola transacción PostgreSQL; cualquier error deshace toda la operación. Se restringe EXECUTE a `authenticated` y se conservan RLS y permisos anteriores.
- **Frontend:** `js/admin.js` sustituye las ocho llamadas REST por una sola llamada RPC y conserva la lectura desde Supabase, el formulario, la confirmación y el mensaje final.
- **Estado:** archivos preparados y sintaxis JavaScript validada. **No se ejecutó el SQL ni se probó la RPC contra Supabase**; primero el usuario debe ejecutar el script en SQL Editor y después incorporar el JS. No se tocaron reservas ni valores existentes.
- **Pendientes prioritarios:** comprobar guardado real sin cambios y cambio reversible; verificar que el turnero público respete horarios modificados; implementar cierres parciales y completos con comprobación de conflictos con reservas; completar pruebas antes de entrega.

## 14/10/2026 — Corrección visual del botón Guardar configuración
- **Incidencia:** el botón aparecía gris incluso después del mensaje de carga exitosa desde Supabase.
- **Causa:** una regla CSS heredada de la maqueta asignaba `opacity:.55` y `cursor:not-allowed` al botón independientemente de su atributo `disabled`.
- **Corrección:** la apariencia ahora responde al estado real de `#admin-config-save:disabled`; cuando JavaScript habilita el botón se muestra opaco y clicable.
- **Archivo modificado:** `css/admin.css`. No se modificó SQL ni JavaScript.
- **Prueba pendiente:** revisar visualmente en Live Server, hacer guardado sin modificar valores y confirmar el mensaje de éxito.


## 14/10/2026 — Restauración de tarjetas y diálogo de confirmación del Admin
- Se detectó una regresión: la actualización de `css/admin.css` para habilitar Guardar había sobrescrito las reglas aprobadas para las tres tarjetas superiores; recuperadas exactamente del paquete de diseño aprobado, conservando el arreglo del botón Guardar.
- Se sustituyó el cuadro nativo `confirm()` por un modal HTML `<dialog>` accesible, con cancelar, confirmar, cierre con Escape y fondo atenuado.
- Archivos: `admin/index.html`, `css/admin.css`, `js/admin.js`. Se conserva la función RPC transaccional de guardado y la carga de configuración existente.
- Pendiente: prueba visual en Live Server (escritorio y móvil) y prueba sin cambios contra Supabase antes de publicar.

## 14/10/2026 — Confirmaciones de bloqueos con modal institucional
- **Comprobado por el usuario:** un bloqueo parcial 23/10/2026 de 18:00 a 20:00 se creó y se mostró en «Bloqueos próximos»; el turnero público dejó de ofrecer los horarios afectados.
- **Ajuste solicitado:** reemplazar las confirmaciones nativas del navegador al **crear** y **desactivar** bloqueos por modales visuales, consistentes con «Guardar configuración».
- **Implementación:** se agregó `#bp-block-dialog` en `admin/index.html` y un confirmador reutilizable mediante `<dialog>` en `js/admin.js` (botones Volver/Confirmar, Escape, cierre accesible). **No se alteraron las RPC de Supabase, validación de conflictos, ni estilos existentes.**
- **Estado:** sintaxis verificada. Queda pendiente probar ambos modales en navegador y volver a confirmar creación/desactivación sin datos reales.


## 14/10/2026 — Mejora visual de reservas afectadas por bloqueos excepcionales
- **Prueba confirmada por el usuario:** bloquear un día completo funciona; cuando existen tres reservas en la fecha seleccionada, el sistema impide crear el bloqueo y enumera las reservas afectadas.
- **Ajuste:** el estado de conflicto presenta un encabezado claro y tarjetas individuales con horario, jugador, teléfono y código; se elimina el doble aviso rojo redundante.
- **Acceso directo:** «Ver reservas del día» abre la sección Reservas en la fecha del intento de bloqueo y en vista de reservas activas, sin efectuar cambios en la base de datos.
- **Prevención visual:** «Crear bloqueo» queda deshabilitado mientras no exista una comprobación satisfactoria para los parámetros actuales; toda modificación de fecha/franja obliga a comprobar de nuevo.
- **Sin cambios:** SQL, RPC de bloqueos, validaciones existentes, guardado de configuración y otros módulos.
- **Pendiente de validación:** revisar visualmente escritorio y celular y probar el salto a Reservas, la deshabilitación con conflictos y la creación cuando no hay conflictos.


## 14/10/2026 — Primera etapa Turnos fijos: solicitud pública y aviso de correo
- **Objetivo:** mantener «Una sola vez» predeterminado e incorporar «Solicitar turno fijo semanal» sin tocar el código existente de creación de reservas comunes.
- **Frontend:** `reservar.html`, `css/turnero.css` y `js/reservas.js` incluyen selector de modalidad, fecha final/indefinido, observaciones y envío diferenciado; las solicitudes pendientes NO bloquean horarios.
- **Backend:** nueva Edge Function `supabase/functions/request-fixed-turn/index.ts` verifica Cloudflare Turnstile, valida datos, registra cliente y solicitud `pending` en `fixed_turn_requests`; intenta notificar al administrador por Resend si están configuradas las variables secretas de email. Un fallo del correo no cancela la solicitud.
- **Pendiente necesario antes de activar en producción:** desplegar función, configurar y probar secrets de Turnstile/Resend y remitente autorizado; validar recepción real del correo. Agregar gestión de aprobación/rechazo del Admin y materialización segura de turnos semanales para aprobados; no ofrecer el módulo como terminado hasta ello.
- **Pruebas:** sintaxis de JS y estructura del ZIP comprobadas; no se ejecutaron solicitudes reales a Supabase desde aquí.
