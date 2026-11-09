# Bitácora de Desarrollo — Boulevard Pádel

> **Estado vigente al 25/10/2026 (cierre de pruebas locales; publicación GitHub de esta jornada por realizar):** Torneos y Campeonatos dispone de grupos, fixture y revisiones controladas; el Admin incorpora editor de cruces, jornadas y orden por grupo con validación y guardado atómico (SQL N° 53). Diseño del Admin en secciones verticales, columnas adaptables de parejas/grupos, avisos y confirmaciones propios. En `PRUEBA Inscripciones 2027`: 8 parejas en 2 grupos publicados internamente, 3 jornadas y 12 partidos; fixture privado tras iniciar corrección, torneo oculto al público, sin resultados ni programación. **Pendientes:** verificar bitácora de revisión y publicación final del fixture; fixture público, asignación de horarios/canchas, resultados, tablas, eliminatorias y liga. Las entradas anteriores conservan su estado histórico.

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

## 14/10/2026 — Admin de Turnos fijos y WhatsApp Web (etapa controlada)

- Se preparó una sección **Turnos fijos** con bandeja de solicitudes en `admin/index.html`, lógica aislada en `js/admin.js` y estilos independientes `css/admin-fixed.css`.
- Se añadieron funciones SQL administrativas en `sql/24_admin_turnos_fijos.sql`: listar solicitudes, rechazar pendientes y aprobar solicitudes **de período definido** con generación atómica de reservas semanales y validaciones contra horarios, cierres excepcionales, reservas existentes, fechas pasadas y ventana actual. Requieren perfil administrador activo y no exponen escrituras al público.
- Contacto **manual** mediante botón WhatsApp Web: abre el chat del teléfono solicitado con texto listo para enviar; nunca se envía automáticamente. Al aprobar aparece «Avisar por WhatsApp».
- Confirmaciones de aprobar y rechazar utilizan el modal existente, no `window.confirm`.
- **Límite explícito de seguridad:** solicitudes _por tiempo indeterminado_ visibles, pero su aprobación permanece deshabilitada hasta implementar la renovación automática segura; no se deben aprobar sin ocupar el horizonte futuro correspondiente.
- No se modificaron archivos del turnero público, funciones de reservas normales ni de bloqueos; no se generan registros de prueba desde el SQL.
- **Pruebas pendientes:** ejecutar SQL en Supabase; verificar carga y rechazo de solicitudes de prueba; crear una solicitud definida futura sin conflictos y comprobar aprobación, ocupación en turnero, aviso por WhatsApp Web y protección ante conflictos; revisar versión móvil. No publicar ni considerar cerrado hasta verificaciones.

## 14/10/2026 — Corrección puntual WhatsApp y criterios de liberación anticipada

- **Probado por el usuario:** el Admin aprobó una solicitud de turno fijo definido y las reservas semanales se ocultaron del turnero público.
- **Problema detectado:** el enlace a WhatsApp Web requería agregar 549 a celulares argentinos ingresados sin código internacional. Se normalizan los formatos nacionales habituales (sin prefijo, 0, 15, +54, +549) en `js/admin.js`. Si el número no puede convertirse con seguridad, se abre WhatsApp Web con el texto, sin destinatario precargado, en vez de apuntar a un contacto incorrecto. No se automatiza el envío.
- **Pendiente funcional prioritario:** permitir al administrador (a) liberar una única ocurrencia semanal sin cancelar el turno fijo completo, y (b) finalizar anticipadamente un turno fijo aprobado, cancelando exclusivamente las reservas futuras vinculadas a `fixed_turn_request_id`; conservar las pasadas y toda la trazabilidad. Preparar RPC transaccionales con `is_admin()`, confirmación mediante modal y mensajes claros. Nunca cancelar manualmente las reservas de otro cliente ni eliminar la solicitud.
- **Pendiente:** probar el enlace de WhatsApp Web con un número local real y ambas variantes de liberación tras implementar su SQL, sin modificar reservas normales ni bloqueos.

## 14/10/2026 — Liberación de turnos fijos y navegación superior (etapa de prueba)

- **Validado por el usuario:** aprobación de turno fijo por período determinado, ocupación semanal en el turnero y acceso a WhatsApp Web con normalización argentina.
- **Interfaz:** cuatro tarjetas de navegación del Admin en una fila en escritorio; dos columnas para tablet/celular. Se conservan diseños y funcionalidades previas.
- **SQL definitivo 25:** función de consulta de fechas futuras confirmadas de un turno fijo, función transaccional para liberar una fecha y función transaccional para finalizar anticipadamente el turno fijo y cancelar solo sus reservas futuras. Verifican administrador activo; las cancelaciones preservan historial.
- **Admin:** nuevas opciones «Liberar una fecha» (selector modal) y «Finalizar turno fijo» (confirmación modal) para turnos aprobados. No se toca el sistema de reservas comunes ni sus funciones.
- **Pendiente de probar:** SQL 25 en Supabase; liberación de una fecha de prueba con confirmación de que el resto sigue ocupado; finalización anticipada, verificación de disponibilidad y responsive. No publicar antes de aprobar estas pruebas.
- **Nota:** la aprobación de turnos indeterminados continúa deshabilitada hasta implementar renovación de reservas automática. Liberar una fecha no finaliza el turno fijo.

## 14/10/2026 — Modal previo y reinicio del turnero al solicitar un turno fijo

- **Solicitud pública:** antes de enviar un turno fijo se muestra un modal con día semanal, horario, fecha inicial y fecha final o duración indeterminada. Opciones Volver y Confirmar; cancelar no envía.
- **Tras éxito del servidor:** se reutiliza el reinicio existente de «Nueva reserva», borrando la selección y los datos del formulario, restaurando «Una sola vez» como predeterminado y mostrando un aviso de éxito al inicio. Un error no reinicia nada.
- **Archivos:** `reservar.html`, `css/turnero.css`, `js/reservas.js`. Sin cambios SQL, Edge Functions ni en el flujo de reserva única.
- **Incidencia de despliegue observada:** en producción solo se ven tres tarjetas de Admin, mientras que local muestra cuatro. Pendiente verificar commit efectivo, estado del despliegue Cloudflare y caché antes de tocar CSS.
- **Verificación técnica:** sintaxis JS y ZIP correctos. Pendiente prueba del modal y reinicio desde producción, incluyendo tablet/celular.

## 14/10/2026 — Política simple de turnos fijos: máximo dos meses

- **Decisión del usuario:** no ofrecer solicitudes de tiempo indeterminado. Todo turno fijo tendrá inicio y fin, con duración máxima de dos meses calendario; al vencer, el jugador podrá hacer una solicitud nueva. Permite renegociar precios y evita renovaciones automáticas.
- **Turnero público:** se retira la opción indeterminada, se aclara el máximo de dos meses, se limita el selector de fecha final al menor valor entre dos meses desde el primer turno y el fin de la ventana actual de reservas, y se valida antes de abrir el modal y antes de enviar. Se conserva el modal de confirmación y el reinicio del formulario al confirmar Supabase, con aviso de éxito arriba.
- **Supabase:** script definitivo `26_limite_dos_meses_turnos_fijos.sql` con trigger de validación para nuevas solicitudes; no modifica reservas ni solicitudes históricas.
- **Admin:** no se modifica el módulo estable; las solicitudes antiguas por tiempo indeterminado que estén pendientes deberán rechazarse y solicitarse nuevamente como período determinado.
- **Pendiente de prueba:** instalar SQL 26, aplicar archivos web, comprobar fecha máxima, modal, envío, reinicio y aviso por correo. No publicar sin validar.

## 14/10/2026 — Corregir posición del modal de confirmación de turno fijo

- **Incidencia:** el modal del turnero público aparecía en la esquina superior izquierda en lugar de centrado.
- **Corrección:** se agregó una regla CSS acotada a `dialog.fixed-request-dialog:modal` con `position: fixed`, `inset: 0` y `margin: auto`, manteniendo sus dimensiones, estilos, contenido y comportamiento.
- **Alcance:** exclusivamente `css/turnero.css`. No modifica HTML, JS, Supabase, solicitudes ni reservas.
- **Pendiente de prueba:** abrir el modal en escritorio y celular, verificar centrado, desplazamiento y botones Volver/Confirmar antes de publicar.

## 14/10/2026 — Turnos fijos: limpieza visual y regla de cancelación administrativa

- **Decisión funcional:** los jugadores no podrán cancelar ni suspender turnos fijos desde la web pública. Para liberar una fecha o finalizar anticipadamente el período deberán contactar al administrador, quien realizará la acción desde el panel. Se conservan las funciones de liberación ya probadas.
- **Ajuste visual:** junto a «Actualizar» se incorporó «Limpiar vista» para ocultar solicitudes rechazadas, canceladas y finalizadas. El mismo botón permite «Mostrar historial»; no elimina ni modifica datos en Supabase.
- **Corrección incluida:** centrado del modal de confirmación del turnero desde el CSS, sin cambios en la lógica de solicitud.
- **Decisión sobre eliminación:** no implementar borrado físico de solicitudes por ahora: preservamos trazabilidad y vínculos con reservas semanales; el ahorro de espacio sería marginal.
- **Archivos:** `admin/index.html`, `js/admin.js`, `css/admin-fixed.css`, `css/turnero.css` y la bitácora maestra.
- **Prueba pendiente:** verificar centrado del modal en móvil y PC; limpiar/mostrar historial en el Admin.

## 15/10/2026 — Ajuste visual del Admin en celulares y revisión de pendientes

- **Objetivo:** presentar los cuatro accesos del Admin en dos filas de dos tarjetas en celulares.
- **Cambio:** regla CSS limitada a anchos de hasta 620 px; dos columnas iguales, separación uniforme y ajuste de textos/iconos. No se modifica HTML, JS, Supabase ni lógica de navegación.
- **Prueba pendiente:** verificar visualmente en móvil real, sin desbordes; controles Reservas, Horarios, Torneos y Turnos fijos siguen funcionando.
- **Pendiente de lógica:** el plazo máximo para solicitar turnos fijos debe derivar de la configuración `Período de reservas` del Admin (1, 2 o 3 meses; valor predeterminado 2), en lugar de estar fijo en 2 meses. Debe validarse tanto en el navegador como en Supabase. No renovar automáticamente.
- **Regla funcional conservada:** turnos fijos no se cancelan desde la web pública; jugador contacta al administrador para liberar una fecha o finalizar el período.
- **Antes de lanzamiento:** verificar que los cambios locales recientes estén confirmados y desplegados, respaldar configuración de Supabase y hacer prueba integral de reservas.
- **Siguiente etapa:** definir con el responsable las reglas concretas de Torneos y Campeonatos _antes_ de implementar la lógica; la sección actual es visual solamente.

## 15/10/2026 — Corrección definitiva de navegación Admin móvil

- **Problema:** Torneos ocupaba toda la segunda fila y Turnos fijos caía a una tercera fila, a pesar de la grilla de dos columnas.
- **Causa:** `css/admin-torneos.css` establecía `#admin-tab-torneos { grid-column: 1/-1 }` bajo 650 px; tenía precedencia práctica sobre la grilla configurada en `admin.css`.
- **Solución:** se eliminó la expansión y se dejaron los cuatro botones en celdas de dos columnas, dos filas.
- **Alcance:** solo CSS de navegación; ninguna modificación de lógica, HTML, Supabase o módulos administrativos.
- **Prueba pendiente:** verificar en Chrome móvil o DevTools a 375 px antes de publicar.

## 15/10/2026 — Torneos, paso 2: alta inicial en Admin (preparado, pendiente de prueba)

- Confirmado SQL 27: tablas bp_tournament_categories y bp_tournaments, RLS activo y ocho políticas presentes; condiciones comprobadas desde SQL Editor.
- Archivos: admin/index.html (conserva el diseño), js/admin-torneos.js (nuevo), BITACORA_DESARROLLO.md.
- Permite cargar categorías y crear torneos ocultos al público, listar los registrados. No programa partidos, no publica, no modifica reservas, turnos fijos o disponibilidad.
- Prueba pendiente: entrar como Admin, crear una categoría de prueba y un torneo en borrador, recargar y confirmar persistencia; revisar móvil. No subir a producción sin probar.

## 15/10/2026 — Torneos, paso 3: administración básica (parche para probar)

- Comprobación real del paso 2: categorías cargadas desde Supabase; TORNEO_PRUEBA_1 creado y listado correctamente en borrador y oculto.
- Se sustituyeron ventanas nativas `prompt` por modal visual para categorías y campo numérico para cupo personalizado; confirmaciones de publicación, ocultación y eliminación mediante modal.
- Acciones agregadas: editar datos básicos, publicar/ocultar sin cambiar estado, y eliminación confirmada (Supabase impedirá borrado si las futuras relaciones lo restringen).
- Contador rotulado «Torneos registrados»; nombres de estado y fechas en español. Se preservan reservas, disponibilidad, turnos fijos y grilla móvil 2×2.
- Pruebas pendientes: en entorno local probar edición de TORNEO_PRUEBA_1, alta de categoría, publicar/ocultar y cancelación del borrado; revisar consola y visual móvil. No borrar el torneo de prueba hasta concluir.
- Sin SQL nuevo. Toda publicación actual expone el registro por RLS, aunque la vista pública de torneos se desarrollará después.

## 15/10/2026 — Torneos, paso 4A: base privada de inscripciones (SQL 28)

- Se revisó ZIP actualizado `BoulevardPadel(20261015-133317).zip`, que incorpora la administración de torneos del paso 3. El usuario confirmó pruebas de crear, editar, publicar/ocultar y eliminar con modal «Volver».
- Nuevo script `sql/28_torneos_inscripciones_base.sql` para `bp_tournament_pairs`: jugadores completos, teléfono de contacto privado, estado pendiente/aprobada/rechazada, origen web/admin y timestamps.
- Seguridad: RLS administradora basada en `bp_tournament_is_admin()`, sin políticas ni permisos anónimos sobre el teléfono; índice de duplicados sin considerar el orden de los jugadores, para pendientes/aprobadas. No afecta reservas, turnos fijos ni disponibilidad.
- Este paso **no habilita inscripción pública**. El siguiente trabajo requiere una Edge Function con Turnstile, control de inscripción abierta, límites y validaciones en servidor; luego conectar Admin y web pública con sus modales propios.
- Prueba pendiente: ejecutar SQL 28 una vez en Supabase y comprobar tabla/políticas. No aplicar archivos web todavía.

## 15/10/2026 — Torneos, paso 4B: gestión privada de parejas (parche para probar)

- El usuario confirmó `Success. No rows returned` al ejecutar SQL 28. No se requiere nuevo SQL.
- Archivos modificados: `admin/index.html`, `css/admin-torneos.css`; agregado `js/admin-parejas.js`. Preservado `js/admin-torneos.js` y los módulos de turnos.
- En sección Parejas e inscripciones: selector de torneo, lista privada, teléfono solo en Admin, alta manual aprobada, edición, aprobación y rechazo. Modal propio con «Volver»; sin alert/prompt/confirm nativos.
- Se muestran solo los datos del torneo elegido; contador «Parejas del torneo». Se mantienen protección RLS del SQL 28 y validaciones de nombres, teléfono, duplicados.
- No se habilita inscripción pública, ni fixture, ni eliminación relacional; no se toca turnero ni bloqueos de cancha.
- Pruebas pendientes: desplegar archivos, comprobar selector y agregar pareja manual ficticia, recargar y verificar persistencia; posteriormente editar y cambios de estado con usuario. Probar vista móvil.

## 15/10/2026 — Torneos Paso 4C-1: apertura y cierre desde Admin (preparado)

- Fuente: BoulevardPadel(20261015-135826).zip.
- Se incorpora Abrir/Cerrar inscripciones por torneo con confirmación en modal existente.
- Para abrir, el torneo debe estar publicado; para ocultarlo, primero deben cerrarse inscripciones abiertas.
- No se añade SQL: se reutilizan `bp_tournaments.status` (`registration_open` / `registration_closed`).
- No se habilita aún inscripción pública: faltan Edge Function, validación de Turnstile y controles de privacidad.
- Estado: código preparado, pendiente de prueba en localhost/Admin y revisión en Supabase.
- Siguiente: prueba de apertura/cierre; luego implementar endpoint público y formulario.

## 15/10/2026 — Torneos, paso 4C-2: formulario público (para instalación y pruebas)

- Archivo base: BoulevardPadel(20261015-135826).zip. Se preserva JS de Paso 4C-1 (apertura/cierre) ya probado; no reemplazarlo con archivo anterior.
- index.html: sección pública de Torneos después de Reservas; modal propio para solicitar inscripción (dos nombres completos, un teléfono), Turnstile. CSS nuevo aislado css/torneos-public.css y JS nuevo js/torneos-public.js. No se tocan reservas ni panel Admin.
- supabase/functions/register-tournament-pair/index.ts: función servidor para comprobar origen permitido, Turnstile con secret, estado published + registration_open, cupo y duplicados; inserta como pending/web con service role que no se expone al navegador. Requiere desplegar Edge Function con verify_jwt=false y configurar TURNSTILE_SECRET_KEY en Supabase (nunca en frontend).
- Pendiente de prueba: desplegar función y configurar secretos; verificar en local lista pública, torneo oculto no visible, publicación y formulario cuando abierto; envío válido, duplicados y teléfono privado en Admin; cerrar inscripciones. PROBAR ANTES de subir producción.
- Consideración futura: evitar carreras al alcanzar cupo mediante inserción transaccional si inscripción concurrente alta; hoy se consulta cupo previo. Confirmar fecha real de inscripción si se adopta una política de apertura/cierre por fechas (hoy controla Admin).

## 15/10/2026 — Cierre verificado del módulo de inscripciones (revisión del ZIP 18:11)

- **Base revisada:** `BoulevardPadel(20261015-181135).zip`. Se inspeccionaron `admin/index.html`, `index.html`, JS de torneos/parejas, CSS público y la función `supabase/functions/register-tournament-pair/index.ts`. Este ZIP se toma como base para la siguiente fase; no se alteraron archivos de funcionamiento.
- **Pruebas confirmadas por el usuario durante la sesión:** creación, edición, publicación/ocultación y eliminación de torneos; categorías desde Supabase; inscripción manual y edición de parejas; aprobación/rechazo; apertura de inscripciones solo en competencia publicada; envío público con Turnstile; solicitud pública registrada como pendiente y visible en Admin; aprobación posterior correcta. No inferir otras pruebas no realizadas.
- **Incidencia Supabase y resolución:** la lectura pública de torneos falló con `permission denied for function bp_tournament_is_admin`; se ejecutó SQL **29** (`GRANT EXECUTE ON FUNCTION public.bp_tournament_is_admin() TO anon`). La Edge Function devolvía 500 por falta de lectura sobre `bp_tournaments` para `service_role`; se ejecutó SQL **30** (`GRANT SELECT ON TABLE public.bp_tournaments TO service_role`). El usuario confirmó posteriormente el alta pública exitosa. Estos SQL se guardaron en Supabase, pero **sus archivos no figuran en este ZIP**; no dar por probado que están versionados en el repositorio.
- **Edge Function:** `register-tournament-pair` desplegada desde editor de Supabase con comprobación JWT legacy desactivada; utiliza `TURNSTILE_SECRET_KEY` ya presente en Secrets, y el servidor almacena el contacto sin consulta pública directa. Se verificó el flujo real, no se realizó auditoría de penetración ni de concurrencia.
- **Corrección aprobación Admin:** el botón de aprobar/rechazar abría un diálogo, pero el envío se bloqueaba por `required` de campos ocultos (`An invalid form control ... is not focusable`). `js/admin-parejas.js` activa `form.noValidate` solo en confirmaciones de estado; al añadir o editar mantiene validación. Usuario comprobó que la pareja pendiente pasó a aprobada correctamente.
- **Ajustes de texto:** el formulario público ya presenta `Teléfono de contacto`; en listado Admin aparece `Contacto`, sin aclaración redundante. Queda un texto residual `Teléfono de contacto (solo Admin)` en `admin/index.html`, dentro del modal de alta/edición de parejas; es visual y no cambia permisos.
- **Estado proyecto:** reservas, bloqueos, horarios y turnos fijos no fueron modificados en este cierre. La maqueta `Grupos y fixture` sigue sin funcionalidad. La carpeta `supabase/functions/register-tournament-pair/` se encuentra en el proyecto; el ZIP incluye además `.git`, innecesaria para futuros traspasos.
- **Decisión del organizador:** torneo tipo Mundial de fútbol = fase de grupos seguida de eliminación directa (16avos, 8vos, cuartos, semifinal, final según cantidad de **clasificados**, no siempre todas). Liga = todos contra todos; eliminación directa = cuadro sin grupos. En tablas: victoria 2 puntos, derrota jugada 1, derrota W.O. 0. No añadir reglamentos configurables aún. El Admin bloquea **manualmente** las franjas de cancha para partidos.
- **Próximo paso recomendado:** definir y comprobar el modelo de grupos, encuentros y resultados en Supabase con SQL **31**, **después de revisar el esquema vivo** y decidir clasificación/desempates con el organizador. Preparar primero SQL acotado y reversible; no activar el botón «Administrar fixture» ni sortear sobre parejas reales sin prueba previa. Mantener fixture oculto hasta confirmación.
- **Validaciones importantes pendientes:** cupos concurrentes (la Edge Function comprueba cupo antes de insertar, sin operación atómica), política de cierres y retiros tras sorteo, desempates y W.O., pruebas de duplicados, revisión CSP/Turnstile en producción y móvil. La inscripción pública ya funcionó pese a advertencias CSP observadas en consola; revisar sin debilitar seguridad global.
- **Otros pendientes previos:** límite de solicitudes de turnos fijos según configuración Admin 1/2/3 meses (por defecto 2), sin permitir cancelación pública de turnos fijos.

## 15/10/2026 — Torneos Paso 5A: visualización pública (propuesta para probar)

- El organizador debe confirmar posteriormente el armado de grupos, clasificación, desempates y avance eliminatorio. Queda en standby toda implementación de fixture y resultados reales.
- En el sitio público se agregan pestañas «Vigentes» y «Finalizados», conservando el formulario seguro existente. Se agrupan torneos publicados según `status=completed` o `ends_on` anterior a la fecha local; los futuros y actuales están en Vigentes. Los ocultos no aparecen.
- Cada competencia muestra formato, categoría, fechas y estado; sólo las vigentes con `registration_open` ofrecen inscripción.
- «Ver resultados y posiciones» despliega exclusivamente una presentación de espacios vacíos para resultados, tabla de posiciones o cuadro eliminatorio según formato, sin inventar datos ni consultar tablas aún inexistentes.
- Archivos tocados: `index.html`, `css/torneos-public.css`, `js/torneos-public.js` y esta bitácora. No hay SQL ni cambios en el Admin/reservas.
- Pendiente: prueba local de filtros, tarjetas, modal de inscripción, responsive y publicación. La publicación histórica depende de que Admin mantenga `is_published=true` al finalizar. Confirmar con el dueño reglas de cierre y permanencia.

## 15/10/2026 — Ajuste visual: se elimina sección pública de Reservas

- Para conservar la alternancia de fondos sin rediseñar colores, se retira la sección pública `#reservas`, que resultaba redundante con el botón principal del encabezado y el flujo de reserva existente.
- El menú superior deja de apuntar a `#reservas`. Se conservan el botón «Reservar turno», `reservar.html` y todo el funcionamiento del turnero.
- Nuevo orden de secciones públicas: Inicio (claro) → La cancha (oscuro) → Torneos (claro) → Contacto (oscuro).
- Alcance: solo `index.html` y bitácora. Sin cambios en Supabase ni en el Admin.

## 15/10/2026 — Ajuste visual: altura mínima de la sección Torneos

- Se corrige la altura de `public-tournaments` para que ocupe la ventana visible por debajo del encabezado fijo, evitando que se vea una franja de la sección siguiente cuando el contenido es corto.
- Se usó `min-height: calc(100vh - var(--header-height))` y `100svh` como respaldo moderno, manteniendo crecimiento natural si la sección luego contiene más tablas o resultados.
- Alcance: solo `css/torneos-public.css` y bitácora. No se alteró la lógica de carga de torneos ni la inscripción pública.

## 15/10/2026 — Torneos Paso 5B: demo visual de resultados y finalizados

- Objetivo: mostrar al dueño del complejo una maqueta de cómo se verían los torneos vigentes con resultados/posiciones y los finalizados con su cierre, usando **datos ficticios** y sin tocar el modelo real de partidos.
- `js/torneos-public.js` agrega dos tarjetas de demostración claramente marcadas como **Demo visual**: una competencia vigente con resultados recientes y tabla de posiciones, y una finalizada con campeones, resultados decisivos y posiciones finales.
- `css/torneos-public.css` suma estilos para chips, resaltados, tarjetas de resultados y tablas demo, conservando la inscripción pública real de los torneos publicados.
- No hay SQL, no se modifica el Admin y no se crean partidos reales. Las tarjetas demo conviven con las competencias publicadas solo como recurso de presentación comercial; luego podrán retirarse o reemplazarse por datos reales.
- Próximo pendiente: confirmar con el dueño si la visual general le resulta clara y qué información exacta quiere ver en cada tarjeta (por ejemplo: grupo, fecha, sets, campeones, posiciones finales, cuadro eliminatorio, etc.).

## 15/10/2026 — Ajuste de altura independiente en tarjetas públicas de Torneos

- Incidencia: al expandir los resultados de la tarjeta de demostración vigente, la grilla estiraba verticalmente la tarjeta real `TORNEO_PRUEBA_PAREJAS`, generando un espacio vacío y enviando el botón «Inscribir pareja» al final.
- Solución mínima: `align-items: start` sobre `.public-tournaments__list` en `css/torneos-public.css`. Cada tarjeta ajusta su altura a su propio contenido incluso cuando otra tiene resultados extendidos.
- Alcance: solo CSS público y esta bitácora. Sin cambios JavaScript, Supabase, Admin, reservas ni inscripción pública.
- Pendiente: verificar visual local en pantalla grande y móvil, con demo expandida y contraída.

## 15/10/2026 — Tarjetas de resultados inicialmente contraídas

- Se eliminó la apertura automática (`details.open`) de las tarjetas demostrativas. Tanto demos como torneos reales comienzan con «Ver resultados y posiciones» cerrado; el visitante decide cuándo desplegarlo.
- Cambio exclusivo en `js/torneos-public.js`; se conserva corrección independiente de alturas de tarjetas aplicada en el parche anterior. No cambia Supabase ni inscripción.

## 16/10/2026 — Paso 32E: interfaz pública de turnero flexible (preparado para prueba)

- Se agrega selector visual 90/120 minutos (90 predeterminado), horario de inicio cada 30 minutos según `get_available_slots_flexible`, y resumen de inicio/fin y duración.
- `create-booking-secure` recibe `durationMinutes` y utiliza `create_booking_flexible` (Edge Function 32D ya publicada).
- Solicitudes de turno fijo siguen su flujo existente; al elegir modo fijo, duración 90 y se recargan horarios para evitar discrepancias con `request-fixed-turn`.
- Respuestas asíncronas antiguas de disponibilidad no pueden pisar la fecha/duración actual.
- Archivos: `reservar.html`, `js/reservas.js`, `css/turnero.css`, bitácora. Sin SQL, cambios de Admin ni envío de correo.
- **Pendiente de pruebas:** comprobar lista y cambio 90/120 en local, visual móvil, cruces de medianoche, reservar realmente una vez desde dominio autorizado (Turnstile), comprobar duración en Supabase y ausencia de superposiciones. No publicar la interfaz sin las comprobaciones.
- **Pendiente separado:** avisos automáticos de nuevas reservas a `boulevardpadelvila@gmail.com` y posibilidad de cambiar el correo desde Admin.

## 16/10/2026 — Paso 33A–33C: alta de reservas flexibles desde Admin (en prueba)

- SQL 33A: se creó `public.create_admin_booking_flexible` sin sustituir `create_admin_booking`; control de permisos `auth.uid()` e `is_admin()` y llamada a `create_booking_flexible`.
- SQL 33B: comprobación sin sesión Admin devuelve correctamente 42501, sin crear reservas.
- Paso 33C: formulario de nueva reserva Admin incorpora duración 90/120 (90 por defecto), consulta `get_available_slots_flexible` y llama a `create_admin_booking_flexible`; se mantiene el desplegable.
- **Pendiente de prueba**: validar primero en Live Server fecha y duraciones y luego una reserva real controlada desde Admin; comprobar ocupación y cancelación. No publicar sin validar.
- **Pendiente separado**: edición de reservas existentes sigue usando función antigua `update_admin_booking`/`get_available_slots`; revisar su compatibilidad con reservas 120 antes de cambiarla.
- **Pendiente**: solicitudes y aprobación de turnos fijos 90/120 con inicios cada 30 minutos.

### 2026-10-16 — Paso 33D/33E: Edición de reservas flexibles (en prueba)

- SQL 33D `update_admin_booking_flexible` instalado por el administrador. No reemplaza `update_admin_booking`.
- Admin: formulario Nueva reserva reorganizado (fecha, duración, horario / nombre, teléfono / observaciones).
- Admin: Editar reserva ahora muestra duración real (90/120), consulta `get_available_slots_flexible` y guarda con `update_admin_booking_flexible`.
- Se conserva el horario propio en el selector aun si no aparece entre los libres; la validación definitiva es del servidor. Los horarios alternativos que se solapen únicamente con la reserva propia todavía podrían no aparecer; revisar en siguiente iteración con disponibilidad específica de edición.
- Pendientes de prueba: cambiar duración de reserva de prueba sin desplazar inicio; mover a un horario libre; comprobar actualización de fin y bloqueo de superposiciones. Sin commit/push hasta validar.
- Próximo: perfeccionar disponibilidad de edición excluyendo reserva propia y luego turnos fijos 90/120.

### 2026-10-16 — Paso 33F: disponibilidad de edición excluyendo reserva propia (pendiente de prueba)

- Detectado: en editar la reserva de prueba de 09:00 a 11:00 (120 minutos) no aparecía 09:30 porque `get_available_slots_flexible` filtra todas las reservas, incluida la propia.
- SQL 33F (preparado, aún no instalado): `get_admin_edit_slots_flexible(p_date,p_duration_minutes,p_reservation_id)` solo para Admin; ofrece horarios cada 30 minutos ignorando exclusivamente la reserva editada, manteniendo validación de las demás reservas y bloqueos. No altera datos ni funciones anteriores.
- `js/admin.js`: al editar usa la nueva consulta. Mantiene la opción original para correcciones de datos cuando la duración no cambió, incluso si el horario original ya comenzó. Al cambiar duración, no introduce artificialmente un horario ocupado.
- `admin/index.html`: eliminado carácter `>` suelto antes de selector «Horario disponible». Se conserva disposición 3 campos / 2 campos / observaciones.
- Pendiente de prueba: ejecutar SQL 33F en Supabase, abrir edición Live Server y verificar 09:30 si sigue en el futuro y no hay conflictos; luego mover una reserva real controlada sin cambiar su código, y verificar superposiciones. Sin publicar en GitHub hasta probar.
- Pendiente general: habilitar solicitud y aprobación de turnos fijos semanales de 90/120 minutos.

### 2026-10-16 — Paso 33F validado / Paso 34A preparación de turnos fijos flexibles

- La consulta de edición `get_admin_edit_slots_flexible` y los formularios del Admin se probaron localmente: duración 90/120 y horarios alternativos cada 30 minutos; las alternativas pasadas se ocultan correctamente. El usuario confirmó «Funciona perfecto todo».
- Paso 34A: se prepara actualización exclusiva de `bp_admin_approve_fixed_request` para aceptar duraciones 90/120 e inicios cada `start_step_minutes` (30) hasta `last_start_time` (23:30). Se preservan autenticación Admin, bloqueo transaccional, validación de ventana, superposiciones con reservas y bloqueos, y aprobación atómica.
- **Estado del SQL 34A:** ejecutado exitosamente en Supabase el 16/10/2026; confirmado por el usuario.
- **Próximos pasos:** ajustar Edge Function `request-fixed-turn` para recibir/validar/guardar `durationMinutes`; después `js/reservas.js` para mantener visible el selector 90/120 en modo fijo y enviar el campo; probar solicitudes, correos, aprobación (con fechas futuras y rollback si corresponde) y reservas resultantes. No modificar el Admin de torneos ni las reservas manuales.

### 2026-10-16 — Paso 34B: Edge Function de solicitudes fijas 90/120 (preparada)

- Se prepara `supabase/functions/request-fixed-turn/index.ts` tomando como base el código real de Supabase aportado por el usuario. Acepta `durationMinutes` numérico (90 o 120), con 90 como valor por defecto para compatibilidad con la web pública todavía no actualizada.
- Guarda `duration_minutes` de cada solicitud en `fixed_turn_requests`, en lugar de utilizar la duración general `booking_settings.slot_duration_minutes`.
- Conserva validaciones previas, Turnstile, creación de cliente, estado `pending`, y aviso existente por Resend (`RESEND_API_KEY`, `FIXED_TURN_FROM_EMAIL`, `FIXED_TURN_ADMIN_EMAIL`), sin aprobar automáticamente ni crear reservas.
- **Estado actualizado el 16/10/2026:** publicado exitosamente en Supabase (confirmado por el usuario). Falta probar las solicitudes semanales reales con ambas duraciones. No hace falta SQL nuevo para este paso.

### 2026-10-16 — Paso 34C: turnero público con turnos fijos semanales de 90/120 minutos (parche preparado)

- El usuario confirmó el despliegue exitoso de la Edge Function `request-fixed-turn` del Paso 34B. SQL 34A de aprobación también instalado anteriormente.
- `js/reservas.js`: el selector de duración 90/120 continúa visible y habilitado al elegir «Solicitar turno fijo semanal»; ya no restablece 90 minutos al cambiar de tipo. Cambiar duración actualiza los horarios mediante `get_available_slots_flexible` y descarta un horario elegido previamente hasta volver a seleccionar uno válido.
- Las solicitudes semanales envían `durationMinutes: selectedDuration` a `request-fixed-turn`, además de los campos previos. Se mantiene Turnstile, el aviso por Resend, la confirmación previa, el estado `pending` y la aprobación del administrador.
- `reservar.html`: texto de ayuda aclara que también se repetirá la duración elegida. CSS, Admin, reservas comunes y SQL quedan intactos.
- **Estado:** parche preparado, no publicado ni probado con Turnstile todavía. Probar primero interfaz con Live Server y luego publicar en Pages para ejecutar solicitud real desde dominio autorizado. Probar aprobación con período corto y verificar que cada reserva creada dure 120 minutos; limpiar las reservas de prueba con las herramientas administrativas apropiadas.
- **Pendiente de seguridad/negocio:** la disponibilidad del primer día no garantiza la de todas las semanas; la aprobación SQL 34A debe validar cada fecha y rechazar la aprobación completa ante cualquier conflicto. No conceder turno fijo automáticamente desde la web.

### 2026-10-16 — Paso 35: horarios de primer/último inicio independientes por día (en curso)

- El usuario aprobó reemplazar el antiguo «Desde/Hasta» en Admin por «Primer inicio/Último inicio», configurable para cada día, manteniendo reserva flexible 90/120 min, intervalos de 30 min y turnos que cruzan medianoche.
- SQL 35A instalado y comprobado: `weekly_hours.last_start_time` agregado y sus 7 días inicializados a `23:30`; todos siguen abriendo `09:00`.
- SQL 35B instalado: `get_available_slots_flexible` ahora consulta `weekly_hours.last_start_time` por día, respetando reservas existentes y blockouts.
- SQL 35C instalado: `create_booking_flexible` confirma solo inicios entre `weekly_hours.opening_time` y `last_start_time` para el día correspondiente; lo reutilizan web y Admin.
- SQL 35D instalado: `update_admin_booking_flexible` también respeta los horarios individuales por día.
- SQL 35E instalado: `get_admin_edit_slots_flexible` muestra disponibilidad por día excluyendo la reserva propia y conservando los demás conflictos.
- **SQL 35F (instalado, éxito confirmado):** actualizar `bp_admin_approve_fixed_request` sobre la versión 34A ya implementada para que valide `v_hours.last_start_time` en vez de `v_config.last_start_time`, conservando aprobación atómica de todas las fechas, guardas de admin, 90/120 y bloqueos.
- **Pendiente:** adaptar guardado SQL de configuración por día, pantalla Admin «Horarios y disponibilidad», lecturas/admin de horarios y cualquier validación de solicitudes de turnos fijos que use el límite antiguo. Ejecutar pruebas reales controladas antes de editar horarios desde Admin.
- **Importante:** no modificar la configuración semanal mediante la pantalla antigua mientras no esté coordinada con SQL 35.

### 2026-10-16 — Paso 35G: guardado de horarios semanales independientes (SQL preparado)

- El usuario confirmó Success al ejecutar SQL 35F; la aprobación de turnos fijos ya valida el último inicio por día.
- Se preparó nueva función `save_admin_booking_config_flexible(p_window_months integer, p_days jsonb)`; NO sustituye aún `save_admin_booking_config`. Acepta siete días completos, cada uno con `weekday`, `is_open`, `opening_time` (primer inicio) y `last_start_time` (último inicio).
- Validación y guardado atómicos; solo Admin autenticado; meses 1/2/3; horas alineadas a 00/30 y límite de 23:30; no cambia los datos hasta invocar la RPC desde el frontend.
- Conserva campos legados `booking_settings.slot_duration_minutes` (90) y `weekly_hours.closing_time` sin alterarlos. La interfaz final mostrará duraciones disponibles 90 y 120 como texto, no un selector general.
- **Estado del SQL 35G: pendiente de ejecución y confirmación por el usuario.** No modificar todavía la pantalla de horarios en producción.
- Próximo paso tras Success: parche exclusivamente del Admin `admin/index.html`, `js/admin.js`, `css/admin.css` conectado a nueva RPC y lectura `last_start_time`; probar localmente, cambios por día y bloqueos; actualizar esta misma bitácora.

### 2026-10-16 — Paso 35H: Pantalla Admin de horarios por día (parche preparado)

- SQL 35G `save_admin_booking_config_flexible(p_window_months, p_days)` instalado con éxito en Supabase; confirmado por el usuario. La versión anterior `save_admin_booking_config` se conserva sin alteraciones.
- `admin/index.html`: sustituye los títulos «Desde/Hasta» por «Primer inicio/Último inicio», ahora configurables por cada día en intervalos de 30 minutos, último máximo 23:30. Se reemplaza el selector general 60/90/120 por un texto informativo «90 o 120 minutos».
- `js/admin.js`: lee `weekly_hours.last_start_time` de cada día; guarda los siete días y ventana 1/2/3 meses mediante la nueva RPC `save_admin_booking_config_flexible`. Validación de horas y guardado transaccional; se mantiene el diálogo de confirmación.
- `css/admin.css`: mejora la distribución móvil mostrando día y apertura en una fila, luego ambos campos horarios con etiquetas visibles; escritorio conserva columnas semanales.
- Se mantiene el módulo de bloqueos excepcionales sin cambios. No se cambian datos ni reservas por instalar estos archivos: solo al confirmar «Guardar configuración».
- **Pruebas pendientes**: cargar configuración local con Live Server (7 días 09:00–23:30); cambiar únicamente el último inicio de un día futuro a 20:00, guardar y verificar disponibilidad 90/120 en público/Admin y que el bloqueo excepcional siga respetándose; restaurar 23:30 al concluir; revisar móvil; después hacer commit/push.
- **Atención**: el campo legado `weekly_hours.closing_time` no se modifica, por diseño de SQL 35G; revisar dependencias antiguas si se reactivan flujos previos.

### 2026-10-16 — Paso 35I: selector horario de 24 horas en Admin (parche preparado)

- Se sustituyen solo los 14 campos de «Primer inicio / Último inicio» de la configuración semanal por selectores HTML que muestran inequívocamente HH:MM (00:00, 00:30, ... 23:30), sin AM/PM independientemente de la configuración del navegador.
- Las opciones permanecen limitadas a :00 y :30, acordes con SQL 35G (que rechaza 08:45); 08:45 NO es admitido por el backend ni generaría la secuencia de inicio estándar.
- `js/admin.js` genera las opciones en formato 24 horas, rellena los valores guardados desde `weekly_hours` y sigue enviando el mismo JSON a `save_admin_booking_config_flexible`.
- `css/admin.css` actualiza el aspecto responsive del selector horario y conserva la disposición móvil de 35H.
- No se modifican Supabase, bloqueos, turnos fijos, duración ni reservas; tampoco los campos de hora del módulo de bloqueos.
- Pendiente: probar con Live Server en escritorio y móvil, guardar un día de prueba con límite distinto, comprobar turnero público y Admin, restaurar 23:30; commit/push solo después.

## 16/10/2026 — Revisión integral previa a uso real (ZIP 18:07) — estado de lanzamiento

- **Base auditada:** `BoulevardPadel(20261016-180733).zip` extraído y revisado, con `index.html`, `reservar.html`, Admin, JS/CSS, `supabase/`, `.git` y la bitácora única. El usuario informó que los últimos cambios ya están confirmados y publicados por GitHub/Cloudflare; esta auditoría es estática, no una prueba de extremo a extremo en producción.
- **SQL 35A–35G:** usuario confirmó `Success` para 35A, 35B, 35C, 35D, 35E, 35F y 35G. Los siete `weekly_hours` se inicializaron con `opening_time=09:00`, `last_start_time=23:30`. El frontend 35H/35I ya lee `weekly_hours.last_start_time` y guarda mediante `save_admin_booking_config_flexible`; captura del 16/10 confirma selectores 24 h con 09:00/23:30. **Aún falta prueba de guardar un día distinto, comprobar efecto en público/Admin, y restaurar valores.**
- **Reservas:** comprobado previamente por el usuario el envío común público, disponibilidad 90/120, aviso Resend y cancelación/liberación; en Admin, alta de 120 minutos, edición y consulta flexible con horarios de 30 minutos. La comprobación del código actual confirma RPC `get_available_slots_flexible`, `create_admin_booking_flexible`, `get_admin_edit_slots_flexible` y `update_admin_booking_flexible`. Tras cambio de límites diarios todavía falta prueba de guardado por día y rechazo de horarios posteriores al límite.
- **Turnos fijos:** el usuario reportó que el formulario 34C envía solicitud con duración 90/120 y muestra las acciones de aprobación y rechazo en Admin. SQL 34A y 35F fueron instalados con éxito. **Verificar, antes de considerar cerrada la prueba integral, que la aprobación de una solicitud de 120 min para varias semanas crea TODAS las reservas con duración correcta, y que los bloqueos impiden aprobar períodos conflictivos.** No alterar solicitud real del cliente sin confirmar.
- **Bloqueos/cierres:** `js/admin.js` conserva la comprobación `bp_admin_blockout_conflicts`, creación `bp_admin_create_blockout`, lista `bp_admin_list_blockouts`, desactivación `bp_admin_disable_blockout`; el turnero público usa `get_available_slots_flexible`, cuya definición 35B filtra los bloqueos activos, y `create_booking_flexible` 35C también valida `blockouts`. **El funcionamiento con los cambios 35 no fue probado en vivo en esta auditoría.** Hacer prueba reversible: crear un bloqueo en una fecha libre futura, verificar horarios superpuestos desaparezcan para 90 y 120 tanto en público como Admin, desactivarlo y verificar restauración; probar rechazo por conflicto con reserva existente sin modificarla.
- **Incidencia encontrada en código fuente local/GitHub (alta prioridad para módulo Torneos):** el archivo `supabase/functions/register-tournament-pair/index.ts` del ZIP contiene código de `request-fixed-turn` que inserta en `fixed_turn_requests`; su ubicación/nombre es incorrecto. La última versión histórica reconocible de la función de inscripción de parejas se recuperó del commit Git `e3428f8` y se adjunta para revisión/restauración local. **NO desplegar ciegamente** el archivo recuperado: comparar primero con el código actualmente desplegado en Supabase. El error local no prueba que la Edge Function remota esté incorrecta; las inscripciones reales se probaron previamente.
- **Código Edge no versionado como corresponde:** el ZIP no incluye `supabase/functions/create-booking-secure/index.ts` ni `supabase/functions/request-fixed-turn/index.ts` en sus rutas correctas. El usuario optó por postergar el respaldo completo de Supabase hasta finalizar el proyecto, pero antes del desarrollo de Torneos conviene normalizar estos fuentes locales, para que futuros despliegues sean reproducibles.
- **Pendiente funcional confirmado para eventual cambio de ventana:** `js/reservas.js` (función `fixedLastAllowedDate`) y `reservar.html` siguen fijando **2 meses** para turnos fijos; la nueva configuración Admin ofrece ventana 1/2/3 meses. Coordinar el límite público y su validación servidor antes de que el dueño cambie a 1 o 3 meses. Evitar prometer que el selector de meses ya gobierna los períodos fijos.
- **No probado / no afirmar:** existencia de datos reales en tablas, limpieza de todas las pruebas, seguridad de todos los RPC con roles externos, configuraciones de horarios transnocturnos con inicio posterior a 00:00 (no soportadas), y cupo concurrente de inscripciones de torneos.
- **Plan de aceptación previo al sábado 17/10:** (1) ensayo reversible del guardado de horario por día, restitución 09:00–23:30; (2) ensayo reversible de cierre excepcional con un día/hora sin reservas, comprobación de conflictos y liberación; (3) inventario SQL de solo lectura de reservas, solicitudes fijas, bloqueos y datos de torneos; (4) eliminación selectiva de filas de prueba únicamente tras revisión explícita, preservando tablas/configuración, historial y todo dato real; (5) confirmar acceso Admin, aviso mail, reservas 90/120 y despliegue Pages. Mantener Torneos/fixture como fase separada.
- **Comprobación técnica local:** `node --check` exitoso para `js/*.js`; no equivale a test de navegador ni a prueba RLS/SQL en producción. El proyecto incluye carpeta `.git` dentro del ZIP: innecesaria en futuros intercambios si GitHub ya respalda el repositorio.

## 16/10/2026 — Pruebas finales de disponibilidad y cierre excepcional; Paso 35J

- **Pruebas confirmadas por el usuario en el sistema publicado:** bloqueo excepcional de día completo funcionando; al desactivarlo reaparecen los horarios; bloqueo por franja horaria funcionando correctamente. Se modificaron los horarios semanales de dos días distintos desde Admin y el turnero público reflejó esos límites. Se conserva el sistema de 90/120 minutos.
- **Paso 35J (parche preparado, no validado aún en el navegador):** los campos «Desde» y «Hasta» del formulario de bloques excepcionales se representan como texto HH:MM en formato de 24 horas, sin AM/PM dependiente del navegador. Permiten todos los minutos válidos (ej. 15:15), sin restringir la franja excepcional a múltiplos de 30 minutos. Validación explícita de la forma 00:00–23:59 y orden Desde < Hasta; si se modifica cualquier hora se invalida inmediatamente la comprobación de conflictos previa. Los parámetros RPC `p_from`/`p_until`, SQL, reservas, correo, torneos y horarios semanales permanecen sin cambios.
- **Validación pendiente de este parche:** probar en Live Server, escribir 15:15 y 17:45 y comprobar que la vista previa de conflictos sigue funcionando; confirmar que horarios inválidos como 25:70 se rechazan. No crear nuevos bloqueos si no es necesario: ya se comprobó creación/desactivación en producción antes de este cambio de presentación.
- **Operación para sábado 17/10:** el usuario quiere habilitar el turnero al dueño. Antes de limpiar, ejecutar el inventario de SOLO LECTURA `sql/INVENTARIO_ANTES_DE_LIMPIAR_SOLO_LECTURA.sql` y revisar reservas, solicitudes, clientes y bloqueos. Borrar exclusivamente datos de prueba identificados y confirmados; no borrar tablas, configuración, reservas genuinas ni datos de torneo. Revisar específicamente solicitudes semanales de prueba vinculadas a reservas antes de eliminarlas.
- **Estado de fuentes locales:** el ZIP de auditoría agregó carpetas `supabase/` y `sql/` a la raíz del repositorio, según informó el usuario. El archivo `supabase/functions/register-tournament-pair/index.ts` aportado es una versión histórica recuperada: **no desplegar** sin contrastarlo con la función vigente de Supabase. El repositorio local original carecía de copias de las otras dos funciones Edge desplegadas; completar fuentes versionadas en fase posterior.
- **Pendiente funcional:** el período de turnos fijos públicos continúa fijado a 2 meses aunque Admin permite 1/2/3. Mientras se utiliza 2 meses funciona conforme a lo implementado, pero ajustar sincronización antes de modificar la anticipación máxima. Modalidad de partidos que empiezan después de medianoche NO implementada; dependerá de la decisión del dueño.

## 16/10/2026 — Textos definitivos de las tarjetas «La cancha»

- **Aprobación editorial del usuario:** tres mensajes diferenciados, sin modificar estilos, estructura ni comportamiento del sitio: emoción («Hay puntos que no se olvidan»), encuentro («El mejor plan se arma entre cuatro») y facilidad de reserva («Menos vueltas. Más pádel.»). Actualizado únicamente el contenido de esos tres artículos en `index.html`.
- **Operación real confirmada:** el dueño ya registró dos reservas reales y recibió la notificación en `martinnico_358@hotmail.com` por filtro selectivo Gmail (`onboarding@resend.dev` y asunto Boulevard Pádel). **Preservar todos los datos reales.** No está confirmado en esta bitácora si se ejecutó el SQL de limpieza de 26 registros de prueba: antes de cualquier depuración futura, identificar individualmente las filas y proteger reservas y clientes reales.
- **Comprobación de bloqueos 35J:** el usuario confirmó que creación, desactivación, liberación de disponibilidad y presentación HH:MM funcionan y que ya publicó los cambios en GitHub.
- **Pendientes independientes:** sincronizar período de solicitud fija pública con 1/2/3 meses configurables, gestionar adecuadamente los turnos fijos indefinidos, y revisar antes de redeploy fuentes locales de Edge Functions, especialmente `register-tournament-pair`. Los torneos continúan como desarrollo separado.

## Ajuste de navegación — Logo del Admin (16/10/2026)

- Se hizo clicable solamente el logo circular del encabezado del panel Admin para abrir `../index.html` (inicio público de Boulevard Pádel).
- Se usó un enlace HTML con `aria-label` y `title`, sin añadir dependencias ni cambiar autenticación, formularios o funciones de Supabase.
- Pendiente: validar con Live Server y, después, publicar mediante commit/push.

## 17/10/2026 — Admin: reservas finalizadas y vista de historial de turnos fijos

- **Base del parche:** `BoulevardPadel(20261017-123553).zip`, versión completa que entregó el usuario. Cambios limitados a `js/admin.js`, `admin/index.html`, `css/admin.css` y `css/admin-fixed.css`. No hay SQL, migraciones, Edge Functions ni cambios en el turnero público.
- **Reservas:** las tarjetas del Admin muestran **«Finalizada»** desde que `ends_at <= Date.now()` en hora absoluta; se aplica también a filas que ya estuvieran persistidas como `completed`. El cambio es **visual y automático**: `reservations.status` permanece `confirmed` en PostgreSQL para no alterar reglas de acceso, exclusión de solapamientos, cancelaciones, historial ni integración actual. Las reservas canceladas siguen en «Ver canceladas».
- Se programa el cambio de etiqueta al llegar la próxima finalización; al regresar a una pestaña suspendida se recalcula. En una reserva finalizada quedan deshabilitadas las acciones «Editar» y «Cancelar» desde la tarjeta Admin. Si se necesitan cambios permanentes de estado SQL, plantear una migración específica y auditar dependencias primero; **no se implementó** esa persistencia en este parche.
- **Turnos Fijos:** por defecto se listan solo solicitudes `pending` y turnos `approved` cuyo período no haya vencido. Botón **«Ver historial»** para consultar exclusivamente solicitudes `rejected`, `cancelled`, `ended`, `suspended` y turnos `approved` de duración determinada cuyo `end_date` ya es anterior a la fecha actual en `America/Argentina/Cordoba`. El día final se incluye completo; pasan al historial a partir del día siguiente. «Ver vigentes» regresa a la vista principal. Se conserva el registro original en Supabase y el botón «Actualizar». Las acciones administrativas de turno fijo aprobado no se muestran en el historial vencido.
- Se agregó un contador pequeño para identificar la vista activa. La navegación a «Turnos Fijos» siempre abre la vista principal. Si una pestaña Admin queda abierta al cambiar el día local, la lista se recarga para clasificar los períodos vencidos.
- **Pruebas requeridas antes de publicar:** verificar estado «Finalizada» con una reserva que ya terminó y «Confirmada» con una futura; confirmar «Ver canceladas» intacto; inspeccionar Turnos Fijos con pendientes/vigentes e historial con rechazadas/finalizadas; comprobar en teléfono y PC. No crear ni cancelar reservas de clientes para estas pruebas. Después de validar localmente, commit/push del parche.
- **Fase posterior separada:** catálogo público de indumentaria, pelotas y cubregrips; no se modifica en este parche.

## 17/10/2026 — Primera versión pública de «Indumentaria y +» (pendiente de prueba y publicación)

- Se propone y prepara la sección `#indumentaria` **después de Contacto y antes del footer**, con un quinto enlace «Indumentaria y +» en el encabezado público y cierre normal del menú móvil ya existente. No se modifican páginas del turnero ni del Admin.
- Catálogo visual de 6 artículos: remera manga corta hombre, remera manga corta mujer, remera sin mangas hombre, short hombre, pelotas y cubregrips. Todos con fotografía ampliable mediante enlace al archivo original y consulta individual a `https://wa.me/543492258212` con texto identificando el artículo. **Sin precios, talles, existencias o compra automática**: se consultan con el complejo.
- Fotos esperadas en `assets/img/indum_acces/`: `REMERA_MC_HOM_1.jpeg`, `REMERA_MC_MUJER_1.jpeg`, `REMERA_SM_HOM_1.jpeg`, `SHORT_HOM_1.jpeg`, `PELOTAS_x2_BVP.jpeg`, `CUBRE_GRIP_BVP.jpeg`. Estas imágenes fueron mostradas en captura del usuario y **no figuran en el ZIP anterior de la aplicación**, por lo que el parche no las duplica; confirmar las coincidencias exactas de nombre y mayúsculas en Linux/Cloudflare antes de publicar.
- Se creó `css/indumentaria.css` aislado y se agregó solo un `<link>` al documento público; fondo claro, oliva corporativo, tarjetas adaptables a PC/tablet/móvil y carga diferida `loading="lazy"` de fotos. Sin librerías ni JS nuevo; reservas, formularios y Supabase intactos.
- **Prueba pendiente:** copiar únicamente `index.html`, `css/indumentaria.css` y esta bitácora; visualizar en Live Server, comprobar seis fotos sin errores, clic en ampliar, mensajes de WhatsApp correspondientes, menú PC/móvil, comportamiento responsive, anclas y que Contacto/footer conservan su diseño. Solo entonces commit/push. Considerar optimizar las fotos JPEG originales (1.6–2.4MB cada una) antes de publicar para mejorar carga en 4G.

## 17/10/2026 — Paso 36B: introducciones a ancho completo y visor de imágenes (para validar)

- **Origen:** paso 36A (`index.html`, `css/indumentaria.css`, `css/torneos-public.css` de la versión aportada). Correcciones solicitadas: textos introductorios de Torneos e Indumentaria y + a todo el ancho disponible y una sola línea en pantallas amplias (≥1150px); siguen adaptándose con saltos en dispositivos más estrechos, sin desbordamiento horizontal.
- Se elimina la restricción `max-width` del bloque introductorio del catálogo y del párrafo `public-tournaments__intro`; el ancho coincide con la grilla de tarjetas correspondiente. Se mantiene el resto del diseño.
- Se reemplaza la apertura de las 6 fotografías en pestaña nueva por un **diálogo nativo `<dialog>`** superpuesto a la página, con imagen ampliada sin recortar, nombre del artículo y botón X en la esquina superior derecha. También admite Escape y clic fuera del diálogo. Al cerrar devuelve el foco al enlace de la foto. A falta de soporte JS/dialog, se conserva el enlace tradicional a la imagen.
- Archivo nuevo y aislado `js/indumentaria.js`; `index.html` usa `<script src="js/indumentaria.js"></script>`; las imágenes siguen en `assets/img/indum_acces/` del proyecto, no duplicadas en el parche. Sin SQL, Edge Functions, Supabase, Admin ni cambios en `js/reservas.js`.
- **Prueba antes de publicar:** verificar ambos textos a ancho completo en PC y responsive sin desbordar; clicar 2 o más productos, comprobar modal y X/Escape/clic fuera, que el resto de la página permanece visible al cerrar, los seis botones WhatsApp y el formulario de torneos intactos; luego commit/push.

## 17/10/2026 — Paso 36C: Contacto a pantalla completa en escritorio

- Problema observado en el sitio publicado: al hacer clic en «Contacto» (ancla `#contacto`) quedaba visible una franja clara inferior perteneciente a la nueva sección «Indumentaria y +».
- Causa: `.contact` en `css/styles.css` calculaba la altura mínima como `calc(100svh - 78px - 110px)`, descontando 110 px extras del diseño anterior, cuando el footer seguía inmediatamente a Contacto.
- Ajuste puntual: `.contact { min-height: calc(100svh - var(--header-height)); }`, alineado con el `scroll-padding-top` del encabezado fijo y la regla ya usada por Torneos.
- Se mantiene `@media (max-width: 900px) { .contact { min-height: auto; } }` para permitir desplazamiento natural en tabletas/celulares, sin recortar textos ni botones.
- Archivos del parche: exclusivamente `css/styles.css` y esta única `BITACORA_DESARROLLO.md`; no se cambian `index.html`, catálogos, JS, Supabase ni turnero.
- Prueba pendiente: copiar ambos archivos, abrir Live Server, hacer clic en «Contacto» desde el menú en escritorio y confirmar que el borde inferior visible sigue siendo oscuro; comprobar que «Indumentaria y +» funciona al hacer clic y que el responsive móvil permanece correcto. Publicar con commit/push solo luego de comprobar.

## 17/10/2026 — Paso 36D: séptimo artículo y grilla 4 + 3

- **Fuente del parche:** ZIP completo `BoulevardPadel(20261017-142615).zip` recibido del usuario, con siete fotografías disponibles en `assets/img/indum_acces/`.
- **Producto incorporado:** remera sin mangas / musculosa de mujer (`REMERA_SM_MUJER_1.jpeg`). Se agrega ficha con categoría Indumentaria, variante Mujer, ampliación en el visor existente y consulta individual a WhatsApp del complejo, sin precio ni stock inventados.
- **Orden en pantalla amplia:** primera fila con 4 remeras (manga corta hombre, manga corta mujer, sin mangas hombre, sin mangas mujer); segunda fila con 3 artículos (short hombre, pelotas y cubregrips). `css/indumentaria.css` utiliza ahora una cuadrícula de 4 columnas en escritorio; se mantiene el comportamiento de 2 columnas en pantallas de hasta 980 px y de 1 columna en pantallas muy estrechas.
- **Alcance preciso:** se modifican exclusivamente `index.html`, `css/indumentaria.css` y esta bitácora maestra. No se incluyen las fotos porque están en el proyecto fuente. No se modifica JS, modal de imágenes, navegación, reservas, Admin ni Supabase.
- **Comprobaciones realizadas:** siete artículos y rutas de imágenes existentes en el ZIP; vínculos WhatsApp diferenciados y estructura HTML conservada. **Pendiente validar visualmente con Live Server** y después publicar con commit/push; comprobar la grilla 4 + 3 en escritorio, el diseño móvil, la ampliación y el botón de consulta de la musculosa de mujer.

## 18/10/2026 — Paso 36E: revisión de enlaces WhatsApp y teléfono

- Fuente: ZIP completo `BoulevardPadel(20261018-000302).zip`. Se inspeccionaron los archivos HTML y JS actuales buscando `wa.me`, `whatsapp.com`, `tel:`, teléfonos y destinos dinámicos.
- **Sitio público (`index.html`):** los ocho enlaces al WhatsApp de Boulevard Pádel (Contacto + 7 productos) conservan `wa.me` como destino inicial, con número correcto `543492258212` y mensajes individuales intactos. Nuevo JS pequeño `js/whatsapp-links.js` convierte esos destinos a `https://web.whatsapp.com/send?phone=...&text=...` únicamente para navegadores de escritorio, para llegar directamente a WhatsApp Web y evitar el diálogo de aplicación externa observado en Linux Mint. En móviles se conserva `wa.me` para favorecer la aplicación de WhatsApp. Los enlaces siguen funcionando si JS no carga.
- **Ventana «Acerca de este sitio»:** el número TecnoGestión JotaPe `+54 3492 664153` dejó de usar `tel:` y ahora enlaza a WhatsApp con el número correspondiente. También se adapta a WhatsApp Web en escritorio, igual que los demás.
- **Panel Admin:** el contacto con jugadores de turno fijo ya utiliza `web.whatsapp.com/send` con mensajes específicos; no se modifica su código. No se cambian reservas, funciones SQL, Supabase, autenticación ni estructuras.
- **Pruebas estáticas:** nueve enlaces públicos a WhatsApp (8 Boulevard + 1 TecnoGestión), sin `tel:` residual; siete textos de producto permanecen intactos. Confirmar manualmente en Linux/Chrome, celular y Admin con Live Server antes de publicar. WhatsApp o el navegador podrían seguir mostrando avisos propios que el sitio no puede controlar.
- **Archivos del parche:** `index.html`, `js/whatsapp-links.js`, esta bitácora única. **SQL: ninguno; no ejecutar ni guardar consultas.**

## 19/10/2026 — Catálogo Indumentaria y +: camperas unisex

- Fuente: ZIP de trabajo `BoulevardPadel(20261019-171208).zip`. Ambas imágenes `CAMPERA_UNISEX1.jpeg` y `CAMPERA_UNISEX2.jpeg` ya existen en `assets/img/indum_acces/`.
- Se incorporan dos fichas `Campera Unisex`, variantes `Negra` y `Blanca y rosa`, después de las remeras/short y antes de `Tubo de Pelotas`, para mostrar primero ropa y luego accesorios.
- Cada ficha reutiliza el diseño existente: ampliación de fotografía mediante el visor, carga diferida y consulta WhatsApp con mensaje y producto diferenciados.
- No se cambian estilos, JS ni imágenes existentes; se mantiene el catálogo responsive y las funcionalidades previas.
- Archivos del parche: solo `index.html` y esta bitácora maestra. Las fotos ya están en la carpeta del proyecto, por lo que NO se duplican.
- Prueba antes de publicar: comprobar las 9 fichas, el orden, las dos fotos ampliadas y los enlaces de WhatsApp en PC y celular; luego commit/push.

## 19/10/2026 — Panel Admin / Reservas: botón «Hoy»

- **Fuente:** ZIP completo `BoulevardPadel(20261019-234401).zip`; revisión de `admin/index.html`, `js/admin.js`, `css/admin.css` y la bitácora maestra. El ZIP de origen incluye una fotografía `assets/img/indum_acces/CAMPERA_UNISEX1.jpeg` con error de verificación CRC; no forma parte de este parche y no se altera.
- Se incorpora un botón secundario **«Hoy»**, inmediatamente a la izquierda de **«+ Nueva reserva»** en el encabezado de Reservas.
- Al pulsarlo, se establece la fecha del día actual en la zona horaria `America/Argentina/Cordoba`, se vuelve a la semana de hoy, se muestra/selecciona la tarjeta correspondiente (también en móviles con desplazamiento horizontal) y se consulta el listado usando la función existente `loadReservations()`.
- Se conserva el filtro actual de reservas/canceladas y el estado e historial de cada reserva. No se modifica la creación, edición, reprogramación, cancelación, disponibilidad, turnos fijos, Supabase, políticas RLS, SQL ni Edge Functions.
- En pantallas de hasta 620 px, la barra de cuatro acciones se organiza en **dos columnas y dos filas**, evitando cuatro botones apretados. En escritorio permanecen en una fila si hay ancho suficiente.
- **Archivos del parche:** `admin/index.html`, `js/admin.js`, `css/admin.css` y esta única `BITACORA_DESARROLLO.md`. Sin archivos adicionales ni copias de bitácora. **SQL: ninguno; no ejecutar ni guardar consultas.**
- **Pruebas realizadas sin tocar producción:** `node --check js/admin.js`, validación de IDs HTML únicos y pruebas automatizadas con Chromium y datos simulados a anchos de 1365, 390 y 320 px. Se avanzó varias semanas y se verificó el retorno al jueves 22/10/2026 (fecha simulada), tarjeta de hoy visible, consulta de la fecha correcta, ausencia de desbordes y conservación de «Ver canceladas»; sin excepciones JS.
- **Pendiente validar en navegador con cuenta Admin real y SIN editar reservas:** desplazarse por fechas, presionar «Hoy», comprobar el día y listado correctos; repetir en celular y revisar que los cuatro botones funcionen. Realizar commit/push únicamente después de la confirmación del usuario.

## 22/10/2026 — Panel Admin / Reservas: estado «Jugando» automático

- **Fuente:** ZIP completo `BoulevardPadel(20261022-202404).zip`. Se revisó la lógica existente de «Finalizada» en `js/admin.js` y la apariencia de etiquetas en `css/admin.css`.
- Las reservas `confirmed` muestran **«Confirmada»** antes de su inicio; desde `starts_at` inclusive y hasta antes de `ends_at` muestran **«Jugando»**; desde `ends_at` inclusive muestran **«Finalizada»**. Los estados cancelados, no presentados o completados siguen su comportamiento anterior.
- El temporizador de estados visuales se programa para el próximo **inicio o fin de turno**, no solamente para su finalización. Si la pestaña estuvo en segundo plano, se recalcula al volver a estar visible. Se utiliza el tiempo absoluto de Supabase para evitar errores por la zona horaria del navegador.
- «Jugando» tiene una etiqueta verde suave diferenciada, coherente con el diseño Admin. **Se mantienen exactamente los permisos visuales de edición/cancelación**: un turno confirmado que está en juego conserva las mismas acciones que antes; una reserva finalizada continúa deshabilitándolas.
- **Archivos modificados:** `js/admin.js`, `css/admin.css` y la bitácora maestra `BITACORA_DESARROLLO.md`. No se modifican otros archivos.
- **Supabase / SQL:** sin cambios; NO hay SQL que ejecutar ni guardar. Tampoco se modifican reservas, tablas, funciones, políticas RLS, Edge Functions, turnos fijos ni el sitio público.
- **Pruebas locales realizadas:** `node --check js/admin.js`; en Chromium, con datos simulados y sin conexión con Supabase, se comprobó que «Confirmada» pasa a «Jugando» al iniciar y a «Finalizada» al terminar; las reservas ya iniciadas, vencidas, canceladas y completadas conservan los estados esperados. Se verificó la conservación de los botones de edición/cancelación para los turnos que están jugando y su bloqueo en finalizados; 1365, 390 y 320 px sin desbordes ni errores JS. **Pendiente de validar con Live Server y una cuenta Admin real, sin editar reservas**, antes de cualquier commit/push.

## 24/10/2026 — Torneos y Campeonatos: categorías autogestionadas, nombres únicos y cierre de pruebas locales

- **Motivo:** simplificar el trabajo diario de Martín, evitando categorías precargadas y nombres de torneos confundibles, sin añadir tablas ni columnas ni modificar el sistema de reservas.
- **Fuente de verificación:** `BVPadel_Torneos_Revision_Final.zip` enviado el 24/10/2026; archivos locales inspeccionados: `admin/index.html`, `css/admin-torneos.css`, `js/admin-torneos.js`, junto con JS/CSS públicos y la bitácora. Se contrastó la rama `main` de `boulevardpadelvila/boulevard-padel` (commit `da558c8c6f138461a5991e9ac87085d8a4f2b6ad`). Los cambios de Torneos de esta etapa **siguen locales** y no se han publicado desde este trabajo.
- **SQL ejecutados y guardados en Supabase (producción):**
  - **36\_** limpieza selectiva de las 18 categorías predefinidas, después de verificar 0 torneos relacionados y una única clave foránea declarada de `bp_tournaments` hacia categorías con `ON DELETE RESTRICT`. La consulta resultó exitosa y el diagnóstico posterior mostró 0 categorías, 0 torneos y 0 parejas en ese momento.
  - **37_Nombres unicos de torneos:** índice único `bp_tournaments_name_unique_ci_idx` sobre `lower(btrim(name))`, que rechaza duplicados por mayúsculas/minúsculas y espacios iniciales/finales. No se agregaron tablas ni columnas.
  - **38_Lectura categorias historicas publicadas:** política RLS `bp_categories_read_published_history`, `PERMISSIVE SELECT` a `anon,authenticated`, para consultar categorías asociadas a torneos publicados aun si su campo `active` es `false`. Existencia y definición de la política verificadas con un diagnóstico de solo lectura; **aún no se verificó su comportamiento real en un navegador anónimo con un torneo histórico publicado**.
- **Admin local:**
  - Botones contiguos «+ Nueva categoría» y «Administrar categorías», con ícono de controles; panel desplegable con categorías disponibles y opción discreta «Ver eliminadas» para recuperar categorías que conservan torneos.
  - Crear, renombrar y eliminar categorías desde Admin. «Eliminar» borra físicamente si la categoría no tiene torneos; si está relacionada con uno, la marca inactiva sin romper la relación. La restauración vuelve a permitir su uso en nuevos torneos.
  - La edición de un torneo que utiliza una categoría inactiva conserva esa categoría en el selector, sin ofrecerla como opción normal para crear competencias.
  - Validación anticipada de nombres únicos al crear o editar torneos y manejo del error PostgreSQL `23505`; la base de datos es la protección definitiva.
  - Avisos con tipografía Inter: rojo para duplicados, verde para éxitos y azul para edición/procesos informativos.
- **Pruebas manuales confirmadas por el responsable (Admin local conectado a Supabase real):** altas, edición y bajas de categorías; restauración y eliminación de una categoría relacionada con un torneo; permanencia del torneo y su categoría histórica; rechazo de nombres duplicados al crear o editar aunque cambien modalidad y fechas; edición válida conservando el mismo nombre; avisos visuales; eliminación final de los dos torneos de prueba y de la categoría temporal. La última limpieza quedó confirmada por la interfaz, **no por un inventario SQL final independiente**.
- **Revisión estática de este ZIP:** referencias HTML existentes y sin IDs duplicados; sintaxis de `js/admin-torneos.js`, `js/admin-parejas.js` y `js/torneos-public.js` válida con `node --check`; CSS específico del módulo revisado. Esto no sustituye una prueba del sitio publicado ni demuestra por sí solo toda la seguridad RLS.
- **Decisión de producto:** no agregar complejidad al Admin ni tablas nuevas. Martín puede dejar de organizar torneos en una categoría simplemente no seleccionándola; si la elimina, se preserva el historial asociado. Un torneo finalizado puede permanecer publicado o estar oculto según `is_published`; finalizarlo **no** lo elimina ni oculta automáticamente. La eliminación definitiva de un torneo con inscripciones, partidos o resultados exigirá las protecciones correspondientes cuando exista ese flujo completo.
- **Sin cambios de esta etapa** en reservas, turnos fijos, horarios, sus políticas RLS ni sus Edge Functions. Los archivos con diferencias locales para esta etapa son `admin/index.html`, `css/admin-torneos.css` y `js/admin-torneos.js`; esta actualización añade únicamente la bitácora. El sitio público `js/torneos-public.js` y su CSS no cambiaron durante esta etapa.
- **Pendiente antes de dar por validado el historial público:** comprobar desde una sesión anónima que un torneo realmente publicado conserve el nombre de una categoría inactiva; no publicar torneos de prueba accidentalmente. Fixture, resultados y campeones reales siguen pendientes de implementación; las tarjetas de resultados anteriores son demostrativas.
- **Siguiente paso operativo:** revisar `git diff --check` / `git diff --stat` y probar el Admin una última vez; luego solicitar autorización antes de `commit` y `push`. Documentar cualquier diferencia nueva sobre la versión local más reciente.

## 24/10/2026 — Torneos y Campeonatos: control de cupos e inscripciones (parches 15 a 18)

- **Motivo:** impedir el sobrecupo en torneos y mejorar la experiencia de Martín en el Admin, evitando formularios innecesarios y mensajes técnicos. Se mantuvo el trabajo concentrado en Torneos, sin cambios en reservas ni turnos fijos.
- **Decisiones confirmadas:** las parejas `pending` y `approved` ocupan cupo; las `rejected` no. Cuando se alcanza `max_pairs`, las inscripciones se cierran automáticamente, pero el torneo puede seguir publicado. Si se libera una plaza, la inscripción pública **no se reabre sola**: Martín decide reabrirla. Admin puede agregar parejas con plazas disponibles aunque las inscripciones públicas estén cerradas. No se admite reducir el cupo por debajo de las plazas ocupadas.
- **Supabase en producción:** se ejecutó satisfactoriamente la consulta SQL N° 39, denominada `39_Control_estricto_de_cupo_y_cierre_automatico` (nombre indicado para guardarla en SQL Editor; confirmar por separado que quedó guardada). Crea `bp_pairs_enforce_capacity` y `bp_tournaments_guard_capacity`, con triggers `bp_pairs_capacity_guard_trg` y `bp_tournaments_capacity_guard_trg`. El usuario confirmó ambos triggers activos. El control de altas/activaciones de parejas serializa el acceso por torneo mediante `FOR NO KEY UPDATE`; se valida el cupo y se cambia a `registration_closed` al ocupar la última plaza. El segundo trigger impide reaperturas con cupo completo y reducciones inválidas. No se modificaron las políticas RLS ni las Edge Functions de reservas/fijos.
- **Edge Function pública:** previamente se desplegó con éxito la versión actualizada de `register-tournament-pair` desde el editor Supabase; se comprobó que lee `ends_on` y `registration_closes_at` y conserva `verify_jwt = false`. Este despliegue antecede a la consulta N° 39 y **no** incluye aún adaptación específica del mensaje del servidor ante el error PostgreSQL de cupo `23514`.
- **Parche 15:** en `css/admin-torneos.css`, tarjetas de parejas en dos columnas cuando el ancho lo permite y una columna en pantallas pequeñas. El usuario verificó el resultado visual.
- **Parche 16:** en `js/admin-parejas.js`, conservar el ícono 👥 encima de «Seleccioná un torneo» al reconstruir el estado vacío tras cargar los datos. El usuario confirmó que funciona.
- **Parche 17:** en `js/admin-parejas.js` y `css/admin-torneos.css`, mostrar «cupos ocupados» sobre `max_pairs`, barra de avance y disponibilidad; deshabilitar «+ Agregar pareja» con cupo completo y actualizar el estado al aprobar/rechazar parejas. Agregar aviso específico para rechazos de Supabase por cupo. Instalación y vista local confirmadas por el usuario.
- **Parche 18:** en `js/admin-torneos.js`, aviso directo de «cupo completo» antes de mostrar la ventana para abrir inscripciones; limpieza del final de `css/admin-torneos.css`. El usuario confirmó que el aviso se ve correctamente.
- **Pruebas reales del 24/10/2026:** torneo de prueba `PRUEBA Inscripciones 2027` con cupo 8; diagnóstico SQL mostró 8 aprobadas y 0 pendientes/rechazadas inicialmente. Se intentó agregar una novena pareja desde Admin y Supabase la rechazó; al rechazar una pareja quedó 7/8, se liberó el botón, y al ampliar de 8 a 12 quedaron plazas disponibles. Abrir inscripciones con cupo completo fue bloqueado. Con una plaza libre se abrió manualmente; al aprobar la octava pareja se cerraron las inscripciones automáticamente sin ocultar la competencia. No se realizaron pruebas de concurrencia real ni la prueba final del cupo completo desde el sitio público después de instalar el SQL.
- **Archivos locales modificados en esta entrega:** `css/admin-torneos.css`, `js/admin-parejas.js`, `js/admin-torneos.js` y esta bitácora. Los tres cambios de código quedaron sin errores en `git diff --check` antes de agregar esta entrada.
- **Pendientes:** comprobar el caso de cupo completo desde el sitio público y mejorar, si corresponde, el mensaje de la Edge Function para `23514`; verificar visualización y cambios de cupo con distintos tamaños de pantalla; continuar luego con grupos, fixture y eliminatorias. Mantener separado el cambio de visibilidad pública de los estados de inscripción.
- **Estado de publicación:** cambios de código de los parches 15–18 probados localmente, pendientes de commit/push a `main` al momento de redactar esta entrada. La consulta N° 39 ya fue aplicada en Supabase.

## 24/10/2026 — Cierre de jornada: grupos, fixture y correcciones controladas (parches 20–33)

- **Fecha de actualización:** 24/10/2026. **Motivo:** registrar el desarrollo y las pruebas del módulo de Torneos y Campeonatos antes del commit/push, conservar las decisiones deportivas y establecer el punto exacto para retomar.
- **Estado de la información:** **CONFIRMADO por pruebas del responsable en el Admin local y resultados SQL compartidos**, salvo las verificaciones identificadas expresamente como **PENDIENTES**. Las funciones SQL se instalaron en Supabase real y devolvieron `Success. No rows returned`; no se ha comprobado independientemente que todos los textos SQL hayan quedado guardados en el historial del SQL Editor. El código frontend de los parches 20–33 permanece en la computadora local hasta el push de cierre.

### Decisiones deportivas confirmadas

- Competencias con grupos y eliminatorias: sorteo usando **parejas realmente aprobadas**, no cupo máximo; cantidad de grupos elegida por Admin. Mínimo **3 parejas por grupo** y diferencia de tamaño **máxima de 1**. Se permite mover una pareja si conserva el equilibrio o intercambiar dos parejas para mantener las cantidades. Los grupos se publican por separado del torneo.
- Cada grupo juega todos contra todos **una vez**; con 4 parejas hay 6 partidos en 3 jornadas, dos partidos por jornada. En el torneo de prueba: **2 grupos / 8 parejas / 12 partidos / 3 jornadas**. La generación de fixture no asigna fechas, horarios ni canchas ni crea reservas.
- **Regla estructural definitiva:** Martín puede iniciar correcciones de grupos o fixture publicados solo si **no hay ningún encuentro jugado ni W.O. registrado**. Desde el primer partido resuelto se bloquean cambios de integrantes de grupo, composición de grupos, cruces y jornadas. Esto **no** impide programar/reprogramar horarios y canchas ni registrar/corregir resultados mediante controles administrativos futuros.
- **Corregir fixture:** motivo obligatorio, copia del estado anterior en bitácora privada, retira solo publicación del fixture y **conserva partidos y grupos**. **Corregir grupos:** motivo obligatorio, guarda la distribución y fixture previos, retira publicaciones de grupos/fixture, elimina los partidos pendientes para regenerarlos; conserva grupos y asignaciones para su reorganización.
- La versión visual **elegida y confirmada** para los enfrentamientos es el **Parche 31**: nombres de la pareja izquierda alineados a la derecha, los de la pareja derecha a la izquierda, ambos próximos al «VS» centrado. Los nombres de jugadores dentro de los grupos se muestran en dos líneas sin `/`.

### Supabase: SQL N° 40–52 aplicados

- **40:** tablas privadas de grupos/asignaciones, relaciones, RLS y `groups_published_at`.
- **41–42:** sorteo inicial privado y nuevo sorteo privado con controles de aprobación/equilibrio.
- **43:** movimiento/intercambio validado de parejas.
- **44:** publicación validada de grupos independiente de `is_published`.
- **45:** vista `bp_public_tournament_groups`, que expone exclusivamente `tournament_id`, `group_number`, `player1_name`, `player2_name`, solo cuando el torneo es visible y los grupos están publicados.
- **46:** cuatro triggers para proteger los grupos, las asignaciones, las parejas y la publicación.
- **47:** tabla privada `bp_tournament_group_matches`, identificadores de rivales y jornadas, controles de unicidad y RLS para Admin.
- **48:** generador de fixture todos contra todos, con jornadas y sin encuentros duplicados; instalación no genera partidos.
- **49:** publicación independiente y protegida del fixture (`fixture_published_at`).
- **50:** bloqueo deportivo desde partido jugado/W.O., cuatro triggers adicionales activos y tabla privada de historial/revisiones.
- **51:** inicio seguro de corrección de fixture con motivo, instantánea e interrupción temporal de publicación sin borrar partidos.
- **52:** inicio seguro de corrección de grupos con motivo, instantánea y retiro controlado de partidos pendientes.
- **Estado de guardado en SQL Editor:** se indicó guardar cada consulta de instalación con su nombre numerado; **PENDIENTE** constatar el inventario final de consultas guardadas, de ser necesario. **No hay SQL nuevo que ejecutar por este cierre.**

### Frontend local: parches 20–33

- **20–24:** sorteo privado de grupos en Admin, confirmaciones, resorteo, controles e integración visual de «Volver a sortear» y «Publicar grupos».
- **25–27:** mover/intercambiar parejas, nombres en dos líneas y publicación confirmada de grupos.
- **28:** «Ver grupos» en el sitio público, visualización segura mediante la vista limitada, sin teléfonos.
- **29:** sección «Fixture de grupos», generación confirmada de partidos y presentación por jornadas.
- **30–31:** dos alternativas de alineación de nombres; quedó **aprobada la N° 31**.
- **32:** botón «Publicar fixture» con confirmación.
- **33:** botones «Corregir grupos» y «Corregir fixture», diálogo con motivo obligatorio y bloqueo visual al haber partidos disputados; Supabase también verifica las restricciones.
- Archivos del frontend local pendientes de subir según último `git status`: `admin/index.html`, `css/admin-torneos.css`, `css/torneos-public.css`, `js/torneos-public.js` y archivo nuevo `js/admin-grupos.js`. Esta actualización suma `BITACORA_DESARROLLO.md`. **Ningún otro archivo debe agregarse por accidente al commit.**

### Pruebas efectivamente confirmadas

- Supabase: 4 triggers de publicación de grupos y 4 triggers de bloqueo deportivo **ACTIVOS**; consulta de privacidad devolvió 4 campos de la vista, 0 filas para torneo oculto y `anon` sin SELECT directo a las tablas de grupos/asignaciones.
- Prueba inicial: 8 parejas en 2 grupos de 4; sorteo/resorteo, intercambio y publicación de grupos. Al mostrar temporalmente el torneo, el sitio local exhibió ambos grupos con nombres y sin datos de contacto; luego se **ocultó nuevamente**. Vista previa móvil de grupos validada visualmente; **PENDIENTE** prueba con datos reales en dispositivo móvil.
- Fixture inicial: 12 partidos, 3 jornadas, 6 partidos por grupo; consulta SQL confirmó **0 partidos cruzados entre grupos** y conteos correctos.
- Publicación/corrección: ventanas de confirmación y cancelación probadas; primera publicación y posterior «Corregir fixture» conservaron 12 partidos con publicación privada. «Corregir grupos» conservó 8 asignaciones y dejó 0 partidos, de acuerdo con SQL. Se probó intercambio de parejas después de iniciar revisión, se republicaron grupos, se regeneró el fixture y el responsable confirmó **«Fixture publicado»** nuevamente.
- **Estado actual informado al cierre:** `PRUEBA Inscripciones 2027` está **oculto** públicamente, con **grupos y fixture republicados** tras la corrección, dos grupos de cuatro y doce cruces; **PENDIENTE** consulta SQL final que confirme ese último estado luego de republicar. No hay resultados cargados ni reservas de canchas asociadas a este fixture.
- Durante la jornada **no se modificaron** reservas, turnos fijos ni Edge Functions ajenas a Torneos. El resultado y los datos del sitio público deben seguir considerándose protegidos por las políticas y vistas aplicadas, pendientes de auditoría de seguridad más amplia.

### Pendientes prioritarios para retomar

1. **Edición individual de cruces y jornadas del fixture** cuando esté en revisión y no haya partidos disputados. Definir operación transaccional que conserve los doce cruces completos, sin duplicados ni parejas jugando dos veces por jornada; incluir registro de motivo/cambios. Actualmente «Corregir fixture» permite dejarlo privado, pero todavía **no hay editor individual**.
2. **Lectura pública segura del fixture y visualización responsive** cuando fixture y torneo estén publicados, respetando alineación elegida del Parche 31. El sitio público muestra grupos, pero **no el fixture** todavía.
3. Asignación manual de fechas, horarios y canchas (sin reservar automáticamente); carga/corrección de resultados; tabla de grupos en tiempo real con triunfo=2, derrota disputada=1, W.O.=0; clasificación y eliminatorias configurables. Modalidad Liga con tabla continua pendiente.
4. Verificar en Supabase el estado definitivo del torneo tras la segunda publicación, y posteriormente ensayar controles negativos (evitar cambios estructurales tras partido `played`/`walkover`) **sin alterar partidos reales ni datos que no sean de prueba**. Verificar lectura en sesión anónima real y responsive con datos.
5. Verificar que todos los cambios de esta jornada quedaron incluidos en un único commit/push de `main`; confirmar árbol Git limpio y Cloudflare Pages cuando corresponda. No publicar el torneo ficticio en producción para esta verificación.

- **Publicación en GitHub:** **PENDIENTE al redactar esta entrada**; efectuar el commit/push desde la computadora local, pues los cambios recientes no están todavía en el repositorio remoto. Documentar el commit final al retomar, si hace falta.
- **Fecha, motivo y estado:** este registro corresponde al cierre de la jornada 24/10/2026; confirmaciones y tareas pendientes quedan diferenciadas explícitamente arriba.

## 25/10/2026 — Torneos y Campeonatos: editor del fixture, responsive y cierre de jornada (parches 35–39)

- **Fecha:** 25/10/2026. **Motivo:** dejar asentados los ajustes de presentación y la edición segura del fixture antes de publicar el código en GitHub y realizar una pausa.
- **Estado de confirmación:** **CONFIRMADO** por las salidas de instalación, las capturas y las pruebas funcionales realizadas por el responsable, cuando se indica expresamente; **PENDIENTE** toda comprobación adicional especificada más abajo. El resultado `Success. No rows returned` de SQL N° 53 confirma ejecución exitosa, pero no sustituye una auditoría posterior de la función ni certifica por sí solo que la consulta haya quedado guardada en el SQL Editor.

### Base de datos: SQL N° 53

- **Consulta ejecutada:** `53_Edicion_atomica_fixture_por_grupo` — función `public.bp_tournament_save_group_fixture_revision(p_tournament_id, p_group_id, p_proposal, p_reason, p_reset_schedule)`; **SQL ejecutado en Supabase y confirmado exitosamente por el responsable**. El guardado de esta consulta en SQL Editor **queda por verificar**, aunque se solicitó guardarla con dicho nombre. No hay otro SQL nuevo en esta jornada.
- Permite guardar **en una sola operación transaccional** la propuesta completa de un grupo: rivales, jornadas y orden de partidos, conservando los IDs de los encuentros. Verifica competencia/grupo, autorización administrativa, grupos publicados, fixture privado, ausencia de partidos jugados/W.O. y consistencia deportiva de la propuesta. Requiere motivo y registra la corrección en la bitácora privada.
- La instalación de SQL N° 53 no rehizo ni modificó partidos existentes; las correcciones posteriores sí fueron iniciadas y probadas explícitamente desde Admin.

### Diseño responsive: parches 35 y 36

- **Parche 35:** se reorganizaron las secciones del Admin `01 — Nuevo torneo`, `02 — Parejas e inscripciones` y `03 — Grupos y fixture` **una debajo de la otra**, con ancho disponible para cada una. Ajuste solo de CSS en `css/admin-torneos.css`; el responsable confirmó que se ve correctamente.
- **Parche 36:** tarjetas de parejas distribuidas en hasta **cuatro columnas según cantidad y espacio disponible** (objetivo: 12 parejas → 3 columnas de 4; 16 → 4 de 4, cuando el ancho lo permite). Grupos en una grilla adaptable según grupos existentes, sin imponer cuatro parejas por grupo; la distribución deportiva permanece a cargo de Admin. Se adaptaron también los grupos públicos en `css/torneos-public.css`.
- En celulares, `+ Nueva categoría` y `Administrar categorías` quedan **uno junto al otro**, permitiendo salto de línea en el texto sin desbordar. El responsable confirmó que la presentación es satisfactoria.

### Editor del fixture: parches 37 y 38

- **Parche 37:** en `js/admin-grupos.js` y `css/admin-torneos.css` se incorporó `Editar cruces y jornadas` para un fixture privado en revisión. Admin puede elegir el grupo, seleccionar las dos parejas de cada partido, la jornada y el orden; debe indicar el motivo. Se envía la propuesta completa de un grupo al RPC N° 53; los cambios se guardan juntos o se rechazan íntegros.
- **Prueba real confirmada:** sobre el torneo `PRUEBA Inscripciones 2027` se inició `Corregir fixture`, manteniendo publicados los grupos y privados los 12 partidos en 3 jornadas. Se intercambió el orden de los dos partidos de la Jornada 1 del Grupo A. El Admin informó **«Corrección guardada y registrada»** y mostró ambos partidos en el orden inverso; los restantes partidos conservaron su ubicación.
- **Pruebas negativas confirmadas:** si un partido enfrenta dos veces a la misma pareja, si se repiten rivales o si se duplica una posición de jornada/partido, el editor muestra el problema y deshabilita `Guardar cambios del grupo`. El responsable confirmó que las tres situaciones se bloquearon en la interfaz. **Pendiente:** comprobar de forma independiente el registro real de auditoría de esta corrección mediante SQL de solo lectura.
- **Parche 38:** mensajes del editor distinguen estados informativo, error y válido mediante avisos visibles con ícono y fondo suave. No se modificaron las reglas deportivas ni la autorización para guardar.

### Simplificación de la administración: parche 39

- Los tres botones de grupos (`Volver a sortear`, `Grupos publicados` y `Corregir grupos`) se muestran en **una fila en escritorio**. Los dos botones del fixture (`Publicar fixture` y `Editar cruces y jornadas`) también comparten fila en escritorio. En móvil conservan adaptación responsive.
- Los dos textos repetitivos sobre grupos publicados se simplificaron a **un único mensaje corto**, por ejemplo: «Grupos publicados. El torneo sigue oculto.» si esa es la visibilidad vigente.
- Se reemplazó el `confirm()` nativo usado al cancelar o cambiar de grupo con cambios sin guardar por un cuadro propio: **«Descartar cambios»**, con las acciones `Seguir editando` y `Descartar cambios`.
- **Validación comunicada por el responsable:** resultado visual general aprobado. **Pendiente:** documentar una prueba específica del modal en móvil y en navegador real, así como la respuesta frente a cambios concurrentes.

### Estado de cierre y siguiente trabajo

- **Último estado observado en capturas locales:** `PRUEBA Inscripciones 2027`, **8 parejas** distribuidas en **2 grupos publicados internamente**; **fixture privado** tras corrección, **3 jornadas y 12 partidos**; torneo oculto en sitio público. No se asignaron fechas, canchas ni resultados, y no se alteraron las reservas ni los turnos fijos. No afirmar que el fixture ya fue republicado después de esta prueba.
- **Archivos locales modificados previstos para el commit de esta jornada:** `js/admin-grupos.js`, `css/admin-torneos.css`, `css/torneos-public.css` y `BITACORA_DESARROLLO.md`. Verificar el listado efectivo con `git status` y `git diff --cached --name-only`; no sumar respaldos, ZIP, scripts temporales ni archivos ajenos.
- **GitHub / Cloudflare:** al redactar esta entrada **PENDIENTE de commit/push**; comprobar hash de commit, árbol de trabajo limpio y despliegue de Cloudflare después de la publicación. La ejecución de la consulta N° 53 en Supabase es independiente del despliegue del frontend.
- **Pendientes funcionales prioritarios:** (1) comprobación SQL de solo lectura del estado de los partidos y auditoría N° 53; (2) decidir/revisar la republicación del fixture de prueba; (3) vista pública segura del fixture; (4) fechas, horarios y canchas sin reserva automática; (5) carga de resultados, tablas por grupos, clasificación/eliminatorias y modalidad Liga. Conservar reglas de puntaje: victoria=2, derrota disputada=1, W.O.=0; el primer encuentro disputado bloquea correcciones estructurales, no la gestión posterior de resultados y programación.

## 25/10/2026 — Calendario flexible y finalización deportiva (Parche 42)

- **Fecha:** 25/10/2026. **Motivo:** el responsable aprobó separar jornada deportiva del día/horario real, permitir reprogramar cada partido de grupos y eliminatorias incluso entre distintos días o fines de semana, y contemplar partido por el tercer puesto opcional. Boulevard Pádel dispone de una sola cancha; será necesario controlar superposiciones con reservas existentes y descansos, sin crear reservas automáticamente.
- **Decisiones de negocio (CONFIRMADAS):** `starts_on` indica fecha prevista de inicio; `ends_on` es la **fecha estimada de finalización** e incluye las fases posteriores. Que llegue esa fecha no implica que se hayan disputado los partidos. Martín podrá postergar encuentros individualmente y reprogramarlos a demanda; deberá poder actualizar la fecha estimada. Una fecha postergada no equivale a derrota ni W.O.
- **Finalización (regla aprobada; implementación completa PENDIENTE):** el estado `completed` debe determinar la visualización como «Finalizado». En la futura fase de resultados, la transición automática a `completed` se realizará únicamente tras resultados confirmados en todos los partidos obligatorios (final y tercer puesto si corresponde), con opción de cierre manual excepcional y controlado. **Todavía NO existe finalización automática por resultados en esta entrega.**
- **Parche 42 (frontend, PENDIENTE DE VERIFICAR en navegador):** Admin y web pública dejan de inferir «Finalizado» por `ends_on < hoy`; muestran el final como estimado. Las pestañas Vigentes/Finalizados pasan a depender de `status = completed`. El botón administrativo de finalización manual preexistente se conserva sin alterar sus reglas.
- **Compatibilidad:** el parche aplica reemplazos puntuales sobre archivos locales, preservando los cambios del Parche 41 si ya se instaló. No cambia partidos, grupos, calendario real, reservas, turnos fijos, RLS, funciones SQL ni estados persistidos; no hace commit/push.
- **Pendiente de verificación:** probar localmente las tarjetas de Admin y público con un torneo de fin estimado vencido pero no completado, y otro `completed`. Revisar antes de implementar la programación si en Supabase existen automatismos de finalización por fecha; no se verifican ni modifican aquí.
- **Pendientes funcionales:** programación y postergación por partido (`scheduled_at`, `court_label`), validación de cancha y descansos; fecha estimada actualizable; posiciones y criterios de desempate; clasificación, semifinales, tercer puesto opcional, final y finalización automática por resultados; fixture público del Parche 41 pendiente de verificar en un torneo publicado de prueba.

## 25/10/2026 — Parche 43 — Programación flexible en Admin

- **Motivo del cambio:** permitir que Martín programe, reprograma o postergue encuentros de grupos en cualquier día, independientemente de la jornada deportiva y de la fecha estimada de fin del torneo.
- **Estado: PENDIENTE DE VERIFICAR** (parche local; requiere aplicación y pruebas con sesión Admin real).
- `js/admin-grupos.js`: cada encuentro pendiente incorpora estado de programación y acciones `Programar`, `Reprogramar` o `Postergar`, según corresponda. Modal propio y campos de fecha, hora de inicio en pasos de 30 minutos, duración 90/120 minutos y motivo registrado. Consulta a `bp_admin_set_group_match_schedule` instalada en SQL N° 56. Muestra estado de programación de cada encuentro y resumen de jornadas.
- `css/admin-torneos.css`: botones y modal adaptables a pantalla pequeña, sin alterar el editor de cruces ni los otros módulos.
- **Protecciones:** no editar partidos con resultado ni torneos finalizados; el servidor verifica autorización, fechas, disponibilidad, bloqueos y registros; no escribe en Supabase hasta usar los botones en el Admin autenticado.
- **Prueba pendiente:** con partido ficticio del torneo `PRUEBA Inscripciones 2027`, confirmar programación, conflicto de horario, reprogramación, postergación y restauración de cancha libre. Verificar conteos de registros e historial y ausencia de efectos sobre reservas reales.
- No realiza cambios en SQL, reservas, bloqueos, turnos fijos, Edge Functions ni sitio público por sí mismo. No se hace commit/push automáticamente.

## 25/10/2026 — Parche 44 — Horarios en formato 24 horas

- **Motivo del cambio:** evitar el formato AM/PM del navegador al programar partidos; mostrar horarios como en el turnero.
- **Estado: PENDIENTE DE VERIFICAR** (instalación local y prueba visual todavía necesarias).
- `js/admin-grupos.js`: reemplazar el campo `type="time"` por un selector con 30 opciones: `09:00`, `09:30`, ..., `23:30` (24 horas, sin AM/PM). La validación del formulario acepta únicamente ese intervalo; al reprogramar conserva la hora previa y al programar conserva el valor predeterminado `20:00`.
- Se mantiene la consulta RPC `bp_admin_set_group_match_schedule`, la verificación de disponibilidad al guardar, el modal existente y las acciones de postergación.
- **Alcance:** no modifica CSS, tablas, funciones SQL, reservas reales, resultados, torneos ni el sitio público. No realiza commit/push automáticamente.

## 25/10/2026 — Parche 45 — Acciones de parejas y motivo según operación

- **Fecha:** 25/10/2026.
- **Motivo del cambio:** simplificar el Admin para Martín: disponer «Aprobada», «Editar» y «Rechazar» en una fila; no pedir una justificación para la primera programación de un encuentro.
- **Estado: PENDIENTE DE VERIFICAR** (aplicación y control visual/funcional local necesarios).
- `js/admin-parejas.js`: el estado de inscripción se ubica dentro de la fila de acciones, antes de «Editar». Se mantienen los botones y sus confirmaciones existentes; para parejas aprobadas se evita el salto de línea.
- `js/admin-grupos.js`: en el modal de programación inicial se oculta «Motivo de la operación» y se envía `p_reason: null`. En reprogramación y postergación se muestra y exige motivo de 5 a 500 caracteres en el formulario.
- `css/admin-torneos.css`: alinea la fila y oculta correctamente la etiqueta de motivo cuando corresponde; ajuste adaptable para móviles.
- **Alcance:** solo archivos locales. La función RPC ya admite `p_reason: null` y continúa validando acceso y disponibilidad. Sin cambios SQL, RLS, reservas, partidos, fixtures, GitHub ni despliegues.
- **Prueba pendiente:** inspección visual de parejas aprobadas; abrir modal inicial (sin motivo), reprogramar/postergar en torneo ficticio (motivo requerido) y comprobar que el Admin real respete permisos y reservas.

## 25/10/2026 — Parche 46 — Volver al fixture tras programar

- **Fecha:** 25/10/2026.
- **Motivo del cambio:** al guardar una programación, reprogramación o postergación, la actualización del Admin hacía que la pantalla quedara en el sector de grupos, obligando a desplazarse manualmente para volver a los partidos.
- **Estado: PENDIENTE DE VERIFICAR** en navegador local, antes de publicar.
- `js/admin-grupos.js`: luego de guardar con éxito y refrescar las tarjetas, restituye automáticamente la posición visual al encabezado de «Fixture de grupos», conservando el mensaje de confirmación y los botones actualizados. Solo actúa si sigue seleccionado el mismo torneo y existe el panel visible.
- `css/admin-torneos.css`: añade un margen de desplazamiento para que el título del fixture sea visible en PC y celular.
- **Alcance:** exclusivamente visual tras guardar; no altera hora, duración, motivos, parejas, jornadas, resultados, RPC, reservas, bloqueos ni SQL. No realiza commit/push automáticamente.
- **Prueba pendiente:** con un partido ficticio, reprogramar/postergar y confirmar que se regresa al fixture correcto; verificar que ante un error el modal continúa abierto sin cambiar el desplazamiento.

### 26/10/2026 — Parche 47: eliminación segura de inscripciones / torneos

- **Fecha:** 26/10/2026.
- **Motivo:** Martín intentó eliminar un torneo de prueba después de rechazar su única inscripción. Se detectó `ON DELETE RESTRICT`: la inscripción rechazada seguía relacionada al torneo.
- **CONFIRMADA (Supabase):** con autorización expresa se borraron únicamente la inscripción rechazada y `TORNEO SUMA 12 MASCULINO`; la verificación posterior devolvió cero registros restantes y conservó el torneo independiente de prueba. No se alteraron reservas.
- **PENDIENTE DE VERIFICAR (Parche 47):** el Admin incorpora «Eliminar inscripción» para cada pareja con modal propio y comprobación de fila afectada. Se informa claramente la existencia de inscripciones, grupos o revisiones antes de intentar eliminar un torneo. No se agregan borrados masivos ni `ON DELETE CASCADE`.
- **Seguridad:** siguen vigentes RLS y los triggers que protegen planteles publicados y partidos iniciados. El servidor impide borrados con dependencias adicionales.
- **Sin cambios SQL** por el Parche 47. No se incluye commit ni push automáticos.

### 26/10/2026 — Parche 48: eliminación completa de torneos sin resultados

- **Fecha:** 26/10/2026.
- **Motivo:** permitir a Martín eliminar desde Admin un torneo con inscripciones, grupos, fixture pendiente e historial, sin quitar registros manualmente uno por uno ni modificar reservas reales.
- **CONFIRMADA (Supabase):** función `bp_admin_delete_tournament_safely(uuid,text)` de SQL N° 58 instalada y comprobada en lectura; ejecutable solo por usuarios autenticados, con validación de administrador en servidor.
- **PENDIENTE DE VERIFICAR (Parche 48):** `js/admin-torneos.js` consulta cantidades y estado actuales, informa impedimentos y confirma expresamente la eliminación total mediante modal propio; luego invoca la RPC transaccional. Los conteos iniciales son orientativos; el servidor decide con validación y bloqueo transaccional.
- **Seguridad:** rechaza torneos publicados, con resultados, con partidos programados o con bloqueos de cancha activos; los grupos publicados internamente requieren el estado compatible para revisión autorizada. Solo se eliminan dependencias del torneo objetivo, incluidas anotaciones y bloqueos inactivos vinculados; nunca se borran reservas ni bloqueos independientes.
- **Prueba pendiente:** instalar localmente, verificar modal sin confirmar primero, y luego (con autorización) eliminar un torneo exclusivamente de prueba sin resultados ni horarios activos. Verificar conteos y turnero tras la operación.
- No instala SQL, no elimina torneos durante la instalación y no hace commit/push.

## 26/10/2026 — SQL N° 59 y Parche 49: zonas de 3 o 4 parejas

- **Fecha:** 26/10/2026.
- **Motivo del cambio:** nuevas reglas de Martín para la fase de zonas y necesidad de evitar grupos de cinco o más parejas.
- **Estado: PENDIENTE DE VERIFICAR** (SQL N° 59 y Parche 49 pendientes de instalación y prueba real).
- **Distribución acordada:** formar la mayor cantidad posible de grupos de 3; usar grupos de 4 únicamente cuando haga falta. Se calcula `g=floor(aprobadas/3)` y la cantidad de grupos de 4 es `aprobadas - 3*g`. Ejemplos: 8 → 4+4; 9 → 3+3+3; 14 → 4+4+3+3. Cinco parejas no permiten armar una distribución válida; advertir al administrador.
- **SQL N° 59:** RPC de sorteo automático con comprobación de administrador y recuento en servidor; trigger adicional que impide publicar grupos con tamaños diferentes de 3 o 4. Conserva intacto el generador histórico, cambios de grupo, torneos, turnos y reservas.
- **Parche 49:** oculta la elección manual de cantidad de grupos; presenta distribución automática; invoca RPC nuevo en sorteo inicial; valida 3/4 al habilitar publicación. Deshabilita temporalmente «Generar fixture» cuando existan grupos de cuatro para evitar el todos-contra-todos heredado de seis partidos.
- **Regla confirmada (grupos de 3):** todos contra todos, tres partidos; clasifican 1° y 2° y queda eliminado 3°.
- **Regla confirmada (grupos de 4):** primera ronda: A vs B y C vs D. Segunda ronda: ganador 1 vs ganador 2 (1°/2°); perdedor 1 vs perdedor 2 (3°/4°). Total cuatro partidos; clasifican 1°, 2° y 3°; **4° queda eliminado**. El desarrollo del fixture condicionado a resultados queda pendiente para SQL N° 60/Parche siguiente.
- **Llaves eliminatorias — diseño recogido, PENDIENTE DE DEFINICIÓN/IMPLEMENTACIÓN:** finalizada la zona, clasificación general priorizando posiciones de grupo y estadísticas dentro de cada bloque; seeding para formar una llave, con BYE/pase libre cuando no haya potencia de dos. Ejemplo con tres zonas de 3 y seis clasificados: puestos generales 1–3 mejores primeros, 4–6 mejores segundos; en cuartos 3 vs 6 y 4 vs 5, primeros 1 y 2 libres; semifinal 1 vs ganador (4/5), semifinal 2 vs ganador (3/6); final ganadores de semifinal. Evitar cruces entre parejas de la misma zona en el primer partido eliminatorio; propuesta de ajustar semillas, p.ej. intercambiar 5 y 6 cuando 3 vs 6 repite zona. **No implementar cruces hasta definir los detalles restantes.**
- **Pendientes expresos:** criterios de puntuación del perdedor en 2-0 y 2-1; diferencia de sets mostrada versus diferencia aplicada exclusivamente a desempates; orden estadístico exacto de tabla general y casos más allá del ejemplo; fixture de cuatro parejas dependiente de resultados; llaves posteriores. No inventar desempates.
- **Alcance y protección:** sin SQL para el turnero, sin cambios en reservas reales ni bloqueos; este parche no crea ni altera torneos, grupos o partidos por sí mismo; se aplicará solo al usar la acción de sorteo/publicación como administrador.

### 26/10/2026 — Parche 50: cerrar un torneo borrador con parejas cargadas manualmente

- **Fecha:** 26/10/2026.
- **Motivo del cambio:** al cargar 8 de 8 parejas aprobadas desde el Admin, un torneo en Borrador no podía abrir inscripciones porque el cupo estaba completo, y no podía avanzar al sorteo de grupos porque las inscripciones no estaban cerradas.
- **Estado: PENDIENTE DE VERIFICAR** (instalación local, confirmación del modal y transición de estado).
- `js/admin-torneos.js`: en un torneo Borrador, incorpora la acción **Cerrar inscripciones** sin abrir el registro público ni cambiar `is_published`; exige sesión administrativa, al menos 3 parejas aprobadas y ninguna pendiente. Se valida el estado `draft` al actualizar para evitar pisar cambios concurrentes.
- **Prueba propuesta:** en `PRUEBA Grupos 3 y 4`, con ocho inscripciones aprobadas y cupo 8/8, cerrar directamente las inscripciones desde Borrador; comprobar que el torneo sigue oculto y habilita la distribución automática de 2 grupos de 4.
- **Alcance:** sin nuevos SQL, tablas, triggers, reservas, blockouts, resultados ni commits automáticos. El Parche 49 permanece instalado y pendiente de verificación.

## 02/11/2026 — Motor deportivo de torneos (fase 1, pruebas unitarias)

- **Fecha:** 02/11/2026.
- **Motivo:** implementar la lógica deportiva confirmada con Martín para grupos de 3 y 4, con puntuación 3/0 y desempates puntos → diferencia de sets → sets a favor.
- **Reglas confirmadas:** sorteo según parejas realmente aprobadas, no según el cupo; grupos de 3 con tres encuentros todos contra todos y dos clasificadas; grupos de 4 con A1 y A2 iniciales, A3 entre ganadores, A4 entre perdedores, cuatro encuentros y tres clasificadas.
- **Implementación:** se agrega `js/torneos-motor.js`, módulo puro sin dependencias ni conexión a Supabase. Calcula distribuciones, rivales condicionados a resultados, puntuación, estadísticas y clasificación. No inventa un cuarto desempate: marca igualdad absoluta. No procesa W.O. hasta que se determine cómo computar sus sets.
- **Pruebas:** `node --test tests/torneos-motor.test.js`: 8/8 correctas en el paquete de desarrollo. Casos: zonas 3 y 4, cruces A3/A4, orden 6/3/3/0 por sets, empate total, grupos incompletos, resultados inválidos y cálculo por cantidad aprobada.
- **Estado:** CONFIRMADA la prueba unitaria. **PENDIENTE:** diseñar e instalar SQL de resultados, adaptar las tablas existentes de partidos para participantes todavía desconocidos, implementar carga y corrección de resultados segura en Admin, publicaciones y eliminatorias. **No hay función nueva operativa en Admin en esta fase.**
- **Protección:** no altera ni ejecuta SQL, reservas, bloqueos, turnos fijos, torneos, funciones Supabase ni el sitio en producción. No realiza commit/push. Los archivos añadidos son una base de desarrollo sin referencias en `admin/index.html`.

### 02/11/2026 — Parche 51 / SQL 61: resultados por sets (fase 2A)

- **Fecha:** 02/11/2026.
- **Motivo:** incorporar la carga de resultados al mejor de tres sets y el calculo de posiciones con 3 puntos por victoria, 0 por derrota; desempate por diferencia de sets y luego sets a favor.
- **Estado: PENDIENTE DE VERIFICAR EN PRODUCCION.** Instalacion local del Admin no implica que SQL 61 este aplicado.
- `js/admin-resultados.js`: panel separado, carga/correccion por sets e historial, tabla automatica de grupos de 3 usando `js/torneos-motor.js`.
- `css/admin-resultados.css`: estilos responsivos exclusivos del nuevo panel.
- `admin/index.html`: carga las hojas/archivos nuevos sin alterar el Admin de reservas.
- `sql/SQL_61_resultados_sets.sql` (entregado fuera del repositorio): crea almacenamiento de resultados e historial con RLS exclusivo de admins; RPC `bp_admin_save_group_match_result` verifica administrador, estado de torneo y fixture publicado, valida 2/3 sets y registra correcciones con motivo.
- **PENDIENTE:** generador del fixture condicionado de grupos de 4 (A1, A2, A3 y A4), tablas de grupos de 4, exposicion publica de resultados y eliminatorias. No habilitar un fixture de 6 partidos para cuatro parejas.
- **Proteccion:** el parche NO ejecuta SQL ni modifica Supabase, torneos, reservas, blockouts o turnos fijos; no hace commit/push.

### 02/11/2026 — SQL 60 / Parche 52: fixture de 3/4 y cruces diferidos

- **Fecha:** 02/11/2026.
- **Motivo:** habilitar el fixture de 4 partidos en grupos de cuatro, conservando el todos contra todos en grupos de tres.
- **Estado: PENDIENTE DE VERIFICAR EN SUPABASE Y NAVEGADOR.** El SQL 60 se entrega en archivo separado y NO se ejecuta mediante este parche.
- Los partidos A3 y A4 pueden mostrar Ganador A1 vs Ganador A2 y Perdedor A1 vs Perdedor A2 antes de los resultados; pueden programarse sin alterar el turnero.
- El editor histórico de todos contra todos se deshabilita para los fixtures con dependencias hasta su actualización específica.
- El SQL 60 modifica esquema y validaciones del fixture, no datos de torneos/partidos actuales ni reservas. Conservar SQL 61 sin ejecutar hasta revisión de compatibilidad con los cruces diferidos.
- No se hicieron commits ni pushes.

### 02/11/2026 — Parche 53: cruce condicionado visible al programar

- **Fecha:** 02/11/2026.
- **Motivo:** en los partidos A3 y A4 del fixture de cuatro parejas, la ventana «Programar partido» mostraba «Pareja no disponible» aunque la tarjeta del fixture identificaba correctamente al ganador o perdedor de A1/A2.
- **Estado: PENDIENTE DE VERIFICAR EN NAVEGADOR.** El modal usará «Ganador A1 vs. Ganador A2» o «Perdedor A1 vs. Perdedor A2», y conservará los nombres reales en partidos directos.
- **Alcance:** exclusivamente texto de la ventana de programación. Sin SQL; sin cambios de fecha, hora, duración, RPC, cancha, reservas, bloqueos, resultados ni publicación. Instalación local con respaldo y sin commit/push automático.

### 02/11/2026 — Parche 54: resultados de grupos de 4 y SQL 61 corregida

- **Fecha:** 02/11/2026.
- **Motivo:** completar la carga y visualización de resultados de A1/A2/A3/A4 con cruces dependientes ya previstos por SQL 60, y clasificación de 3 parejas por puntos, diferencia de sets y sets a favor.
- **Estado: PENDIENTE DE VERIFICAR EN SUPABASE Y NAVEGADOR.** La SQL 61 corregida todavía debe ejecutarse y verificarse por separado.
- `js/admin-resultados.js`: muestra referencias de cruces y nombres reales cuando se conocen, habilita A3/A4 solo después de cargar A1/A2 y muestra tablas provisorias/definitivas en grupos de 4.
- `sql/SQL_61_resultados_sets_CORREGIDA.sql` (entregada fuera del repositorio): registra rivales resueltos sin alterar el fixture; prohíbe corregir un resultado de origen si ya hay un cruce dependiente disputado. Conserva historial y RLS administrativo.
- **Reglas:** 3 puntos por partido ganado, 0 por perdido; diferencia de sets y sets a favor en caso de empate; no inventar desempate final; W.O. pendiente.
- **Protección:** sin cambios de turnero, programación, reservas, bloqueos ni SQL 60; este instalador no ejecuta SQL y no hace commit/push.

### 02/11/2026 — Parche 55: reglas de super tie-break por fase

- **Fecha:** 02/11/2026.
- **Motivo:** Martín confirmó: grupos y cruces preliminares hasta cuartos, desempate 1-1 por super tie-break a 10 puntos y dos de ventaja; desde cuartos (incluidos), semifinal y final, tercer set normal.
- **Estado: CÓDIGO LOCAL PREPARADO. SQL 62 PENDIENTE DE EJECUCIÓN Y VALIDACIÓN.**
- **Cambios:** validación de sets ordinarios (6-0..6-4,7-5,7-6); tercer parcial de grupos como super tie-break; se deshabilita y vacía el tercero si los primeros sets ya deciden 2-0; el motor tiene mapa explícito de formato por etapa.
- **Histórico:** la SQL 62 marca registros anteriores como legacy para preservarlos; no los cambia ni elimina. En la corrección de resultados preexistentes exige motivo y conserva historial.
- **Seguridad:** sin mutaciones automáticas en Supabase, turnero, reservas o programación. Sin commit/push.
- **Pendiente:** ejecutar/verificar SQL 62, revisar y corregir resultados ficticios antiguos, y desarrollar etapa de eliminatorias de modo coherente con las nuevas reglas.

### 02/11/2026 — Parche 56: contraste del Admin de Torneos

- **Fecha:** 02/11/2026.
- **Motivo:** mejorar legibilidad de los grupos, fixture, tablas de posiciones y carga de resultados; textos y botones pálidos se confundían con el fondo.
- **Estado: CÓDIGO LOCAL PREPARADO. PENDIENTE REVISIÓN VISUAL EN LOCALHOST.**
- `css/admin-contraste.css`: hoja adicional exclusiva del Admin, con tipografías, líneas y botones más contrastados y tablas con filas alternadas.
- `admin/index.html`: incorpora esa hoja al final, sin alterar scripts ni lógica.
- **Protección:** no modifica Supabase, datos ni reservas. SQL 62 continúa pendiente de ejecución y verificación; los resultados anteriores se conservan. No hace commit/push.

### 02/11/2026 — Parche 57: UI compacta verde-dorado sin motivos

- **Fecha:** 02/11/2026.
- **Motivo:** simplificar Admin para Martín: primer y segundo set en columnas, Pts al final de posiciones, verde oscuro/dorado, quitar el ingreso manual de motivo en operaciones.
- **Estado: CAMBIOS LOCALES; PENDIENTE VERIFICACIÓN VISUAL Y FUNCIONAL.**
- **Cambios:** `js/admin-resultados.js`, `js/admin-grupos.js`, `admin/index.html`, `js/admin.js`, nueva hoja `css/admin-ux57.css` y prueba estática.
- **Auditoría:** las operaciones que requieren motivo ante Supabase envían una descripción AUTOMÁTICA de acción, manteniendo actor, antes/después y registro. La aplicación NO elimina ni desactiva funciones de control.
- **Protección:** sin SQL, sin operaciones de Supabase, sin reservas ni cambios de horarios; sin commit ni push.

### 02/11/2026 — Parche 58: grilla adaptable de grupos de resultados

- **Fecha:** 02/11/2026.
- **Motivo:** mejorar el aprovechamiento del ancho en «Resultados y posiciones» sin perder claridad.
- **Estado: INSTALACIÓN LOCAL; PENDIENTE COMPROBACIÓN VISUAL Y COMMIT/PUSH.**
- **Cambio:** grupos en tarjetas de 2 columnas cuando el ancho lo permite; hasta 3 columnas con tres o más grupos y suficiente ancho; 1 columna en pantallas angostas. Botones de resultados más compactos y tablas contenidas dentro de cada tarjeta.
- **Archivos:** nueva `css/admin-grilla58.css`, referencia en `admin/index.html`, prueba automática y esta entrada en la bitácora única.
- **Seguridad:** sin cambios en JavaScript, validaciones deportivas, resultados, Supabase, reservas ni horarios. Sin SQL.

### 02/11/2026 — Parche 59: alta de parejas solo con inscripciones abiertas

- **Fecha:** 02/11/2026. **Motivo:** impedir altas manuales en torneos sin período de inscripción abierto.
- **Estado:** instalado localmente / SQL N°63 PENDIENTE de ejecutar y verificar; sin commit/push.
- **Admin:** deshabilitar «+ Agregar pareja» salvo inscripciones abiertas y plazo vigente; volver a verificar justo antes de insertar.
- **Supabase:** SQL N°63 crea guardia de BEFORE INSERT; se ejecuta por separado, no modifica inscripciones anteriores ni modifica reservas.
- **Nota:** pueden editarse inscripciones existentes según las protecciones históricas. La prueba de 7 parejas existente permanece sin cambios.

### 02/11/2026 — Parche 60: fixture agrupado por fecha real

- **Fecha:** 02/11/2026. **Motivo:** eliminar bloques «Jornada 1/2/3» en visualización de partidos.
- **Estado:** instalado localmente / SQL N°64 PENDIENTE de ejecutar y verificar; sin commit/push.
- **Admin:** mismo fixture y programación, mostrado por «Sin programar» y fechas efectivas; tres columnas máximo en PC, dos en ancho mediano y una en celular. Las jornadas internas se conservan para dependencias y reglas, sin mostrarlas.
- **Público:** mismo criterio visual en fixture autorizado. SQL N°64 agrega horarios a la vista pública solo con torneo, grupos y fixture publicados. No altera visibilidad ni reservas.
- **Seguridad:** no altera resultados, programación, torneos ni reservas existentes; se preservan los listeners al reubicar tarjetas sin recrearlas.

## 02/11/2026 — Unificación de acciones de partidos

- Motivo: simplificar el Admin y reducir elementos duplicados.
- Estado: PENDIENTE DE IMPLEMENTAR.
- Decisión: incorporar Cargar resultado y Corregir resultado en las tarjetas del fixture, junto a Programar, Reprogramar y Postergar.
- La sección Resultados y posiciones mostrará solamente las tablas de clasificación.
- Respetar los estados de cada partido y los cruces dependientes.
- Conservar las protecciones, resultados, reservas e historial existentes.
- Parches 59 y 60: instalación local confirmada por el usuario.
- SQL 63 y 64: ejecución exitosa informada por el usuario. Verificada directamente la presencia del trigger de SQL 63; verificación funcional final pendiente.

## 03/11/2026 — Parche 61: centro de torneos compacto (rama de desarrollo)

- **Fecha:** 03/11/2026.
- **Motivo:** simplificar para Martín la vista de Torneos, reducir desplazamiento, mejorar la lectura y aprovechar hasta tres columnas.
- **Estado: CONFIRMADA** la implementación visual en la rama `desarrollo/torneos-20261102`; **PENDIENTE DE VERIFICAR** la apariencia y el uso del Admin local en navegador y dispositivos móviles.
- Se separa la lista de torneos en tarjetas compactas, se minimiza el formulario de creación hasta necesitarlo y se expande automáticamente al editar un torneo.
- Listado de torneos, parejas y grupos: hasta tres columnas en pantallas amplias, dos en medianas y una en móviles. Los selectores de torneo son más pequeños y conservan su funcionamiento.
- Encabezado y resúmenes simplificados; se eliminan textos antiguos que anunciaban funcionalidades ya implementadas. Paleta verde oscuro y dorado; acciones de torneos más legibles.
- **Alcance:** HTML, CSS y un módulo de presentación JS; sin SQL nueva, sin cambios en RLS, resultados, programación, reservas, pagos ni bloqueos. La funcionalidad de carga de resultado dentro de cada tarjeta de partido sigue como mejora pendiente y separada.
- Se conservaron los identificadores utilizados por los scripts existentes y se agregaron pruebas estáticas de interfaz; antes de incorporar a `main`, probar edición de torneos, selector, responsive y fixture por fechas.

## 03/11/2026 — Parche 62: resultados integrados en cada partido

- **Fecha:** 03/11/2026.
- **Motivo:** simplificar para Martín la carga de resultados, evitar duplicar partidos entre fixture y tablas, y aprovechar el ancho del Admin.
- **Estado:** CONFIRMADA implementación de código en rama de desarrollo; PENDIENTE verificación visual y funcional final desde Admin y celular antes de pasar a producción.
- **Fixture:** cada partido conserva Programar, Reprogramar y Postergar cuando corresponde; se agrega Cargar resultado o Corregir resultado en la misma tarjeta. Los botones pendientes de partidos condicionados permanecen deshabilitados hasta resolver los ganadores/perdedores anteriores.
- **Resultados:** marcador por sets visible en su tarjeta. Después de guardar o corregir se actualizan las posiciones; los encuentros disputados ya no presentan botones de programación activos.
- **Tablas:** sección inferior «Tablas de posiciones» sin listado ni controles duplicados de partidos; conserva estadísticas, desempates, puntos 3/0, validaciones de sets, súper tie-break y avisos de marcadores anteriores.
- **Visual:** botones verde oscuro y dorado; grilla responsive. Corrección de la referencia al fixture para refrescar acciones después de programaciones.
- **Protecciones:** ninguna nueva SQL; no se modifican tablas, RLS, reservas, cupos, turnero, bloqueos ni las RPC existentes. Correcciones siguen auditadas por el servidor.
- **Pruebas:** simulaciones locales en Node de grupos de tres/cuatro, tabla y acciones sin duplicados superadas; tests estáticos incorporados. Falta revisión funcional visual conectada al Supabase real.
- **Publicación:** subir inicialmente a rama desarrollo/torneos-20261102. No adelantar main sin la comprobación final.

## 03/11/2026 — Parche 63: botones de categorías a ancho completo

- **Fecha:** 03/11/2026.
- **Motivo:** en la vista compacta, «+ Nueva categoría» y «Administrar categorías» quedaban limitados a la mitad izquierda del formulario y se veían desproporcionados.
- **Estado: CÓDIGO APLICADO A RAMA DE DESARROLLO; PENDIENTE DE COMPROBACIÓN VISUAL** en PC y celular.
- Ambos botones se trasladan a una fila propia que ocupa el ancho completo del formulario «Nuevo torneo», repartido en dos mitades iguales.
- La administración desplegable de categorías ocupa también el ancho completo. Los campos Categoría y Modalidad mantienen su distribución.
- Los IDs y sus controladores originales se conservan. Sin cambios de JavaScript, reglas deportivas, Supabase, reservas ni turnero.
- Se mantiene el Parche 62 en desarrollo hasta completar las pruebas de los resultados dentro del fixture.

## 03/11/2026 — Parche 64 visual: tres tarjetas de torneos sin espacio desperdiciado

- **Fecha:** 03/11/2026.
- **Motivo:** el listado de torneos colocaba un título duplicado como si fuera una celda de la grilla; con tres torneos, el tercero bajaba a otra fila y quedaba espacio vacío.
- **Estado:** IMPLEMENTADO en rama de desarrollo; PENDIENTE validación visual en navegador.
- Se elimina exclusivamente el subtítulo creado por JavaScript, porque ya existe el encabezado «Torneos registrados» en HTML.
- Las tarjetas quedan distribuidas en hasta 3 columnas en escritorio, 2 en pantallas medianas y 1 en celular; acciones alineadas al pie y botones adaptables sin desbordes.
- **No se modificaron:** llamadas a Supabase, estados de los torneos, acciones de edición/publicación, reservas, resultados ni otros módulos.
- El ajuste visual de botones de categorías del Parche 63 permanece incluido en esta rama.

## 03/11/2026 — Reinicio integral de datos de prueba de torneos y privacidad independiente

- **Fecha:** 03/11/2026.
- **Motivo:** eliminar torneos ficticios acumulados y empezar una nueva ronda de pruebas sin afectar el turnero real.
- **Estado: CONFIRMADA** limpieza SQL transaccional ejecutada en Supabase; prueba previa con ROLLBACK satisfactoria. **CONFIRMADA** verificación posterior de integridad.
- Eliminados «Copa El Norte Seguros», «Copa Boulevard Padel 2027» y «PRUEBA Grupos 3 y 4», con 15 parejas, 4 grupos, 15 partidos, 15 resultados, 8 correcciones de marcadores, 8 registros de programación, 2 revisiones de grupos, 15 asignaciones y 7 bloqueos activos vinculados a partidos de prueba.
- **Intocable producción:** se conservaron sin alteraciones 100 reservas (57 vigentes), 4 bloqueos independientes; los hashes íntegros de ambas tablas protegidas coinciden antes/después. También se conservaron las 2 categorías reutilizables.
- Durante la transacción se suspendieron exclusivamente 10 disparadores protectores de datos de torneo para permitir la limpieza administrativa; fueron rehabilitados y verificados activos antes del COMMIT. No se alteró ninguna definición SQL permanente, RPC, reserva ni configuración de turnero.
- **Decisión CONFIRMADA:** todo el módulo de torneos continúa en pruebas y sus registros pueden descartarse hasta su puesta en producción formal. **PENDIENTE:** desarrollar una operación segura de eliminación completa por Admin con doble confirmación, sin debilitar protecciones del turnero ni habilitarla al pasar a producción.
- **Código en rama desarrollo (PENDIENTE DE PRUEBA VISUAL):** abrir/cerrar inscripciones ya no cambia automáticamente `is_published`; «Publicar/Ocultar» se podrá administrar de forma independiente. SQL 63 conserva su requisito de inscripciones abiertas para agregar parejas.
- **Regla para nuevas pruebas:** crear borrador oculto → abrir inscripciones manteniéndolo oculto → cargar parejas manualmente → cerrar inscripciones → generar grupos y fixture → cargar resultados → limpiar datos de prueba cuando corresponda.
- **Consulta ejecutada:** limpieza puntual y única; NO guardar como consulta definitiva en SQL Editor. Conservar esta bitácora como trazabilidad de la acción.

## 03/11/2026 — Parche 66: cuadro preliminar de 7 clasificados y pase directo configurable

- **Fecha:** 03/11/2026.
- **Motivo:** después de completar los 10 partidos de «Copa Norte Seguros», permitir armar una fase final con 7 clasificadas, 3 cuartos, 2 semifinales y final, con pase directo recomendado y configurable por Martín.
- **CONFIRMADA:** fase de grupos del torneo de prueba con 10 parejas en grupos 3+3+4, 10 resultados guardados. Primeros de A y C empatados en puntos, diferencia de sets y sets a favor: no aplicar un desempate arbitrario; la elección del pase directo requiere a Martín.
- **CONFIRMADA:** SQL 65 creada en Supabase exclusivamente para el módulo de torneos: tabla `bp_tournament_knockout_brackets` con RLS y 4 políticas de administrador, control transaccional de 7 clasificados únicos, 3 cruces y versión de marcadores. Probada con ROLLBACK una confirmación con los datos reales; no se persistió ningún cuadro durante esa prueba.
- **CONFIRMADA:** los registros de turnero permanecen intactos (100 reservas, 57 vigentes y 4 bloqueos independientes en la comprobación realizada). La SQL 65 no actualizó horarios ni reservas.
- **IMPLEMENTADO EN RAMA DESARROLLO; PENDIENTE DE VALIDACIÓN VISUAL/INTEGRAL:** motor propone pase directo al mejor primero cuando no hay empate; ante empate requiere elección manual. Martín puede seleccionar cualquiera de los siete clasificados, intercambiar las seis parejas en los tres cuartos y confirmar el cuadro, persistido en Supabase con auditoría básica por usuario y fecha.
- **Regla de cruces:** se prioriza evitar enfrentamientos entre parejas del mismo grupo; orden inicial estable y editable, sin crear desempates no definidos. Semifinal 1: pase directo vs ganador de Cuartos 1; Semifinal 2: ganador de Cuartos 2 vs ganador de Cuartos 3; final: ganadores.
- **IMPORTANTE:** la confirmación es planificación deportiva; todavía NO programa partidos eliminatorios, NO registra resultados de cuartos/semis/final, NO reserva horarios y NO publica eliminatorias. Programación/resultados reales de esa fase quedan pendientes.
- **PENDIENTE:** verificar ejecución completa de tests Node en laptop, revisión visual móvil y funcional con Martín antes de incorporar la rama a `main`. Pendiente también la eliminación definitiva segura de torneos de prueba con resultados mediante Admin.
- **Versionado:** commit/push en `desarrollo/torneos-20261102`. Mantener `main` sin cambios hasta validar.
- **Consultas Supabase:** SQL 65 definitiva, SÍ guardar en SQL Editor si se usa; ya ejecutada y guardada como archivo del repositorio, NO volver a ejecutar sin razón. Las simulaciones con ROLLBACK son diagnósticos y NO se guardan como consultas definitivas.

## 03/11/2026 — Parche 67: modal de confirmación de eliminatorias

- **Fecha:** 03/11/2026.
- **Motivo:** la confirmación del cuadro empleaba un aviso nativo de Chrome, contrario a la estética acordada del Admin.
- **Estado:** IMPLEMENTADO en rama de desarrollo; PENDIENTE verificación visual final en navegador y móvil.
- Se reemplaza `window.confirm` por un `<dialog>` propio, integrado con `admin-save-dialog` y los colores verde y dorado, fondo oscurecido, foco inicial en «Volver», cierre con Escape y botones «Volver»/«Sí, confirmar».
- Resumen de pase directo y tres cruces con nombres reales. Volver/Escape no guarda. Se valida que torneo, resultados y cruces sigan siendo los mismos antes de ejecutar el guardado.
- No se modificaron motor deportivo, SQL, resultados persistidos, reservas, bloqueos ni turnero. El cuadro que el usuario ya confirmó sigue guardado.
- **Pruebas:** verificación sintáctica JS y pruebas de regresión incorporadas; PENDIENTE correr `node --test tests/*.test.js` desde laptop.
- **Sincronización:** commit/push a `desarrollo/torneos-20261102`; laptop requiere `git pull --ff-only`.

## 03/11/2026 — Parche 68: programación y resultados de eliminatorias

- **Fecha:** 03/11/2026. **Motivo:** completar el circuito del torneo de 7 clasificadas desde cuartos hasta campeón, con horarios totalmente flexibles y avance automático de ganadores.
- **Estado CONFIRMADA — Supabase:** migración `bp_ko_stage_scheduling_results_68` ejecutada después de probar íntegramente la SQL 68 en una transacción con ROLLBACK. Se crearon tablas exclusivas de partidos eliminatorios, resultados, revisiones auditadas y cambios de programación. RLS activo, SELECT solo para administradores, escrituras solamente por RPC de administrador.
- **Estado CONFIRMADA — protección del turnero:** se añadió una columna FK nullable `blockouts.tournament_knockout_match_id` para relacionar únicamente los bloqueos de partidos de eliminatorias. Se adaptaron las restricciones y el guardián de integridad `bp_tournament_blockout_integrity_guard` manteniendo las condiciones originales para reservas, bloqueos independientes y partidos de grupos; se reutiliza el bloqueo de concurrencia de cancha, la comprobación de reservas y la detección de superposiciones.
- **Estado CONFIRMADA — datos conservados:** 100 reservas (57 vigentes) y 4 bloqueos independientes. Los hashes de contenido original de ambos conjuntos coinciden antes y después de la migración. Los 10 bloqueos de partidos de grupos también se conservaron. El cuadro de 7 parejas ya confirmado por el usuario se conserva y genera 6 partidos nuevos sin fecha ni marcador.
- **Estado CONFIRMADA — pruebas SQL reversibles:** simulación de programar la final antes de conocer ganadores; programar/reprogramar/postergar cuartos; carga de tres cuartos, dos semifinales y final; resolución de campeón; auditoría de corrección, validación de que no se cargue una final sin semifinales y rechazo de superposición con un partido de grupos. Todo se probó con ROLLBACK sin guardar partidos ficticios adicionales.
- **Estado IMPLEMENTADO — Admin desarrollo:** nueva sección «Programación y resultados» con tres cuartos, dos semifinales y final, tarjetas responsive verde/dorado, rivales dependientes «Ganador de…» que se resuelven con los resultados. Botones Programar/Reprogramar/Postergar y Cargar/Corregir resultado según corresponda. Fecha, horario argentino y 90/120 minutos; el backend verifica disponibilidad. Los resultados exigen dos sets ganados; si hay tercer set es normal (no súper tie-break). Tras finalizar la final aparece campeón y subcampeón.
- **Interfaz y confirmaciones:** sólo modales propios `<dialog>`, sin `window.confirm` / `alert`. Se reutilizan controles y estilos del Admin y se conserva íntegra la edición del cuadro anterior.
- **Estado CONFIRMADA — tests nuevos:** 6 verificaciones ejecutadas con evaluador JavaScript aislado, sin fallas; prueba sintáctica JS y SQL de flujo completo satisfactorias. **PENDIENTE:** correr `node --test tests/*.test.js` en laptop y revisión visual/funcional final desde navegador y celular.
- **Estado PENDIENTE — alcance:** tercer puesto opcional, cuadro público de eliminatorias, finalización automática por resultado final y eliminación completa de torneos de prueba desde Admin. No incorporar a `main` sin validación final.
- **Archivos:** `sql/SQL_68_ELIMINATORIAS_PARTIDOS.sql`, `js/admin-eliminatorias-partidos68.js`, `css/admin-eliminatorias68.css`, `tests/torneos-eliminatorias68.test.js`, `admin/index.html`.
- **Regla SQL Editor:** SQL 68 es DEFINITIVA y sí corresponde guardar su contenido en el editor si se necesita mantener allí; YA está ejecutada en Supabase y archivada en GitHub, por lo que NO volver a ejecutarla. Las consultas de diagnóstico y las pruebas con ROLLBACK no se guardan.
- **Laptop:** después del push, actualizar con `git pull --ff-only` en la rama `desarrollo/torneos-20261102`. No se puede actualizar físicamente desde el conector GitHub.

## 03/11/2026 — Parche 69: botones simétricos en eliminatorias (móvil)

- **Fecha:** 03/11/2026.
- **Motivo:** captura del Admin en celular: «Cargar resultado» dorado parecía más alto que «Programar» verde, por un margen superior heredado de `.torneos-outline`.
- **Estado:** IMPLEMENTADO en rama `desarrollo/torneos-20261102`; PENDIENTE comprobación visual del usuario en el teléfono.
- **Cambio acotado:** CSS de `.bp-ko68-actions > button`; ambos botones tienen 44 px de alto, 100 % del ancho de su columna, margen cero y texto centrado. Se mantienen los dos colores, estados deshabilitados y la distribución responsive.
- **Sin modificación:** JavaScript, lógica deportiva, programación, resultados, Supabase, turnero, reservas, fechas ni bloqueos.
- **Prueba:** regresión CSS `tests/torneos-botones69.test.js`; corresponde ejecutar suite completa desde laptop tras `git pull --ff-only`.
- **Publicación:** solo rama de desarrollo, sin promoción a `main`.

## 03/11/2026 — Publicación en producción para revisión de Martín (parches 62–69)

- **Fecha:** 03/11/2026.
- **Motivo:** el usuario finalizó satisfactoriamente una prueba completa del torneo «Copa Norte Seguros», desde inscripción y grupos hasta los resultados de cuartos, semifinales y final. Solicita que Martín vea toda la gestión desde el Admin oficial y pausar después de publicar.
- **Estado CONFIRMADA — usuario:** seis encuentros de eliminatorias con resultados guardados y final disputada; el Admin muestra pareja campeona y subcampeona. Quedan pendientes observaciones de Martín y una nueva ronda de ajustes.
- **Estado CONFIRMADA — revisión previa:** rama `desarrollo/torneos-20261102` adelanta a `main` por 8 commits sin divergencia. Último despliegue de desarrollo exitoso. Verificados los módulos y hojas CSS del Admin, sintaxis JS del nuevo módulo y que no emplea `window.confirm`.
- **Estado CONFIRMADA — base real (solo lectura):** 100 reservas (57 vigentes), 4 bloqueos independientes y 10 bloqueos de partidos de grupos activos; sin bloqueos de eliminatorias activos. Los hashes de reservas y bloqueos independientes coinciden con las verificaciones anteriores. Hay un cuadro de eliminatorias con los 6 resultados. NO ejecutar nuevas SQL ni modificar datos durante esta publicación.
- **Decisión:** publicar por avance rápido (fast-forward) la rama de desarrollo en `main` y verificar Cloudflare Pages. Mantener la rama de desarrollo por ahora para revisar con Martín; se puede eliminar posteriormente al cerrar la etapa de pruebas.
- **Estado de pruebas:** verificación sintáctica, pruebas de regresión parciales y flujo SQL transaccional realizados en etapas anteriores. Batería completa `node --test tests/*.test.js` pendiente en laptop; pruebas manuales integrales de usuario completadas.
- **Pendientes funcionales no incluidos en esta publicación:** resultados y posiciones públicos, eliminar torneos de prueba completos desde Admin, tercer puesto opcional y cierre automático por resultado final. No confundir la puesta en producción del Admin con la finalización definitiva del módulo de torneos.
- **Laptop:** después del despliegue, ejecutar `git status`, `git pull --ff-only`, `node --test tests/*.test.js`. El equipo local no se sincroniza automáticamente por actualizar GitHub.
- **Supabase SQL Editor:** ninguna SQL nueva por esta publicación. No es necesario ejecutar ni guardar consultas de diagnóstico.

## 07/11/2026 — Parche 70: eliminación integral y definitiva de torneos (PREPARADO, NO PUBLICADO)

- **Fecha:** 07/11/2026. **Motivo:** habilitar a Martín, desde Admin, a eliminar completamente cualquier torneo, incluso si tiene partidos disputados, resultados, cuadro final confirmado y bloqueos de cancha propios. Debe eliminarse todo el contenido asociado y no conservar registros residuales del torneo.
- **Estado VERIFICADO en producción antes de desarrollar:** la RPC previa `bp_admin_delete_tournament_safely` rechazaba los torneos con resultados; los triggers impedían borrar encuentros disputados y bloqueos activos. Se revisaron FKs, disparadores y tablas reales sin modificar datos.
- **Estado PREPARADO en GitHub, rama `desarrollo/torneos-20261102`:** `sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql`, modificación de `js/admin-torneos.js`, campo de confirmación en `admin/index.html` y `tests/torneos-eliminacion70.test.js`.
- **Confirmaciones en Admin:** primero se presenta el alcance real (parejas, grupos, partidos, resultados, bloqueos de partido y registros asociados) y un aviso irrevocable; después se exige escribir exactamente el nombre del torneo, con botón rojo «Sí, eliminar definitivamente». Botón Volver y Escape no borran nada.
- **Backend SQL 70 (AÚN NO INSTALADO):** incorpora RPC administrativa de vista previa; reemplaza con la misma firma la RPC de eliminación; comprueba sesión admin activa, ID y nombre esperado; ejecuta dentro de una sola transacción. Aplica un comprobante privado por `txid_current()`, ID de torneo y acción `delete` para permitir exclusivamente las eliminaciones autorizadas en nueve guardianes, sin deshabilitar triggers globalmente. El comprobante se elimina al terminar; un error revierte todos los cambios.
- **Alcance del borrado:** inscripción y parejas del torneo, grupos, vínculos, fixture, encuentros, resultados y sus revisiones, cuadros y partidos eliminatorios, programaciones e historiales, registro de revisiones y bloqueos vinculados directamente a esos partidos. Cascadas controladas para las cuatro tablas de eliminatorias dependientes. No queda registro de torneo en las tablas funcionales.
- **Intocables:** `reservations`, `customers`, `fixed_turn_requests`, bloqueos independientes de `blockouts`, `courts`, categorías reutilizables y otros torneos. El borrado de datos de operación no equivale al borrado inmediato de WAL/backups/logs del proveedor.
- **Pruebas HECHAS:** comprobaciones estáticas de la migración, presencia de 9 guardianes específicos, selectividad de tablas y sintaxis de JavaScript. Se incorporaron tests Node para ejecutar desde la laptop.
- **Pruebas PENDIENTES:** no se ejecutó todavía el SQL 70 ni una prueba transaccional de borrado con ROLLBACK; tampoco la suite completa `node --test tests/*.test.js` ni el flujo visual del Admin en PC/celular. No se borró `Copa Norte Seguros` ni ningún registro real.
- **SQL Editor:** SQL 70 es DEFINITIVA: **SÍ guardar** si se ejecuta; **NO EJECUTAR todavía** sin autorización expresa del usuario, revisar primero la migración y realizar verificación reversible.
- **GitHub:** el 07/11/2026 se detectó un commit concurrente de Prettier en `main` (`a90c801`) posterior a la creación de la rama de trabajo. Las ramas divergieron; **no hacer fast-forward ni forzar `main`** hasta integrar esa actualización sin perder modificaciones.
- **Siguiente paso:** obtener autorización expresa para instalar SQL 70; ejecutar y comprobar sin borrar datos reales; correr tests, validar diálogo doble y recién entonces preparar publicación controlada en `main` para Martín.

## 07/11/2026 — SQL 70 instalada en Supabase; eliminación sin ejecutar

- **Fecha:** 07/11/2026. **Motivo:** autorización expresa del usuario para instalar exclusivamente la funcionalidad de eliminación de un torneo previamente seleccionado por él o por el administrador. No se autorizó eliminar ningún torneo durante la instalación.
- **Estado CONFIRMADO:** migración `bp_admin_full_tournament_deletion_70` aplicada con éxito en Supabase, utilizando el contenido de `sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql` (rama desarrollo). Registro confirmado en `supabase_migrations.schema_migrations`.
- **Estado CONFIRMADO — integridad:** recuentos antes/después idénticos: 1 torneo, 10 parejas, 3 grupos, 10 partidos de grupos, 10 resultados de grupos, 6 partidos de eliminatorias, 6 resultados de eliminatorias, 107 reservas, 9 solicitudes de turnos fijos, 14 bloqueos (10 activos), 3 categorías. No se llamó a la RPC de eliminación con ningún torneo real.
- **Estado CONFIRMADO — seguridad:** `anon` sin EXECUTE sobre la RPC de vista previa ni sobre la de eliminación; `authenticated` con permiso de llamada, sujeto a validación interna de rol administrador activo, ID y nombre exactos. El comprobante privado de eliminación está vacío fuera de una operación; ningún trigger fue deshabilitado (11 instancias de guardianes verificadas activas). Las RPC originales de crear reservas conservan `anon_execute=false` y `service_execute=true`.
- **Condición obligatoria:** eliminar solamente el torneo individual seleccionado por el Admin; con sus dependencias exactas, jamás por limpieza global. El frontend exige doble confirmación y nombre exacto; todo borrado es transaccional.
- **Numeración aclarada:** `SQL 70` es identificador del archivo y de la migración técnica. La lista de consultas guardadas manualmente en Supabase SQL Editor puede terminar en `64`; el Editor no se actualiza automáticamente al aplicar una migración. Algunas SQL anteriores se aplicaron como migraciones y/o se archivaron en GitHub.
- **SQL Editor:** `SQL 70` es DEFINITIVA: **SÍ guardar** si se desea tener su copia en SQL Editor, pero **NO VOLVER A EJECUTAR**; ya está aplicada como migración. La copia original queda en GitHub.
- **Pendiente:** la interfaz nueva de borrado permanece sólo en `desarrollo/torneos-20261102` y no fue publicada a `main` ni a Cloudflare Pages. Verificar suite Node, integración visual y resolver divergencia con un commit concurrente de Prettier en `main`; pedir autorización antes de publicar. No se realizó prueba real de eliminación: sólo validaciones no destructivas.

## 07/11/2026 — Verificación final de integración SQL 70

- **Fecha:** 07/11/2026. **Motivo:** habilitar en Admin la eliminación completa y exclusiva del torneo elegido, tras instalar la migración SQL 70, manteniendo todos los otros módulos intactos.
- **Estado CONFIRMADO:** nueva rama de integración `desarrollo/eliminacion70-integracion-20261107` creada desde el último `main` (`a90c801`, Prettier), para conservar el formato vigente en vez de sobrescribirlo con archivos anteriores. Contiene únicamente el código del Admin actualizado, el HTML de confirmación, el archivo SQL 70, la regresión 70, correcciones de tests de formato y esta bitácora.
- **Verificación de backend:** la instalación SQL 70 ya fue confirmada. Recuento antes/después de instalarla sin variaciones: 1 torneo, 10 parejas, 16 partidos con resultados, 107 reservas, 9 solicitudes fijas y 14 bloqueos. No se hizo ninguna llamada de eliminación real ni de prueba contra un torneo del cliente.
- **Pruebas CONFIRMADAS en GitHub Actions, PR #1:** suite completa `node --test tests/*.test.js`: **60 pruebas aprobadas, 0 fallidas, 0 omitidas**. Primer ensayo mostró 13 verificaciones antiguas dependientes del formato literal anterior a Prettier; fueron ajustadas sólo en archivos `tests/` para tolerar espacios y comillas, sin tocar lógica deportiva, reservas ni programación. Todas pasaron en el segundo ensayo. Se retiró la workflow temporal después de las pruebas.
- **Restricciones de seguridad revisadas:** dos pasos de confirmación visual y nombre exacto; la RPC requiere usuario admin activo, ID del torneo y nombre coincidente; los permisos de eliminación duran sólo la transacción y sólo aplican a dependencias de ese torneo. Jamás se hace limpieza global ni se eliminan reservas, bloqueos independientes o categorías compartidas.
- **Pendiente en este registro:** integración vía PR #1 en `main` y verificación de despliegue público; todavía no se ha ejecutado un borrado real para evitar afectar el torneo de prueba de Martín.

## 07/11/2026 — Publicación final Admin: eliminación completa de torneos

- **Fecha:** 07/11/2026. **Motivo:** publicar para Martín el Admin con borrado completo y seguro del torneo elegido.
- **Estado CONFIRMADO — GitHub:** PR #1 fusionado en `main`, commit `733a156be63878b5c4a82e8dcc9a20d4e1bc2e56`. Se conservaron los ajustes de formato Prettier de la versión anterior. La nueva interfaz de `js/admin-torneos.js`, el campo de confirmación y `sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql` están presentes en `main`.
- **Estado CONFIRMADO — SQL:** migración `bp_admin_full_tournament_deletion_70` ya instalada en Supabase y NO requiere repetirla ni guardarla nuevamente. El SQL se ejecuta al solicitarlo explícitamente un administrador desde la interfaz para el ID y nombre exacto seleccionados; no hay borrado automático de competiciones.
- **Estado CONFIRMADO — pruebas:** GitHub Actions PR #1, ejecución `42422926268`: `node --test tests/*.test.js`, **60 pruebas aprobadas / 0 fallidas / 0 omitidas**. Las 13 pruebas antiguas incompatibles con el formato Prettier se adaptaron sólo en archivos de tests; no hubo cambios de lógica deportiva ni del turnero por ese motivo. El workflow temporal fue eliminado antes de fusionar.
- **Estado CONFIRMADO — integridad posterior:** base de datos conserva 1 torneo, 10 parejas aprobadas, 10 partidos y 10 resultados de grupos, 6 partidos y 6 resultados de eliminatorias, 107 reservas, 9 solicitudes fijas y 14 bloqueos (10 activos). No se ejecutó la eliminación del torneo de prueba ni ningún otro.
- **Verificación pendiente:** no fue posible consultar directamente el archivo JS servido desde Cloudflare Pages mediante la herramienta externa; GitHub `main` está actualizado, pero el despliegue en el dominio debe comprobarse desde un navegador, y Martín debe realizar una prueba real sólo cuando decida borrar el torneo. **NO confundir código publicado en GitHub con despliegue externo verificado**.
- **SQL Editor:** SQL 70 **SÍ es definitiva**; se conserva en GitHub como migración aplicada, sin necesidad de crear una consulta manual adicional. No volver a ejecutarla.

## 07/11/2026 — Seguimiento público del torneo: SQL 71 preparada

- **Fecha:** 07/11/2026. **Motivo:** completar lo que ven jugadores y público antes de probar la eliminación definitiva del torneo. El usuario definió orden estricto: 1) completar seguimiento público; 2) probarlo en el sitio; 3) recién después probar eliminación desde Admin.
- **Diagnóstico CONFIRMADO en `main`:** la sección pública ya lista competencias vigentes/finalizadas, grupos y programación de fixture desde vistas autorizadas, pero la sección «Resultados y posiciones» seguía mostrando textos provisionales. La base tiene 10 resultados de grupos y 6 eliminatorios para `Copa Norte Seguros`, estado `completed`, `is_published=false`, fechas 05–09/03/2027 (datos de prueba).
- **SQL nueva PREPARADA, NO INSTALADA:** `sql/SQL_71_SEGUIMIENTO_PUBLICO_TORNEOS.sql` introduce RPC `bp_public_tournament_followup(uuid)`, exclusivamente de lectura, para devolver nombres de parejas aprobadas, grupos, partidos, sets, resultados y fase eliminatoria de un torneo explícitamente visible, con grupos y fixture previamente publicados. No entrega `contact_phone`, email, auditoría, `created_by` ni `updated_by`. `anon` solo recibe derecho de ejecutar esta respuesta filtrada, nunca SELECT directo sobre tablas deportivas privadas.
- **Frontend PREPARADO en rama `desarrollo/publico-torneos71-20261107`:** `js/torneos-public.js` sustituye textos ficticios por resultados reales, posiciones por grupo (PJ/PG/PP/SF/SC/Dif/Pts), aviso de empate sin inventar desempate, cuadro de cuartos/semifinales/final, campeón y subcampeón. El fixture actual agrega marcador y ganador cuando existen, manteniendo las publicaciones de grupos, horarios e inscripciones. `css/torneos-public.css` suma estilos coherentes y responsive.
- **Pruebas CONFIRMADAS:** PR borrador #2 en GitHub, ejecución Actions `42423844165`, suite `node --test tests/*.test.js`: **64 aprobadas, 0 fallidas, 0 omitidas**. Los tests nuevos verifican filtrado de publicación en SQL, ausencia de escritura o datos de contacto, representación con torneo simulado finalizado. Se retiró el workflow temporal después de la ejecución.
- **Estado de publicación:** no fusionar PR #2 a `main` ni desplegar hasta instalar SQL 71 y confirmar su funcionamiento de solo lectura. No se publicó la Copa Norte Seguros, no se modificó su estado ni se borró ningún dato.
- **SQL Editor:** SQL 71 es DEFINITIVA: **SÍ guardar** cuando se aplique allí, o conservar como migración aplicada si se instala por herramienta; **NO EJECUTAR todavía** hasta autorización expresa del usuario. Después de aplicada, no repetir.
- **Próximo paso:** solicitar autorización para instalar SQL 71 (solo definición de función, sin modificar torneos), verificar RPC anonimizada tanto para un ID oculto (debe devolver null) como en SQL de lectura, luego fusionar frontend, ver despliegue y pedir a Martín que publique el torneo de prueba para revisarlo visualmente. Recién después, y con su confirmación final, probar la eliminación definitiva desde Admin.

## 07/11/2026 — SQL 71 instalada sin publicar ni alterar el torneo

- **Fecha:** 07/11/2026. **Motivo:** autorización expresa para instalar la SQL 71 de seguimiento público. La instalación no implica publicar un torneo ni borrar datos.
- **CONFIRMADO en producción:** migración `bp_public_tournament_followup_71` aplicada correctamente en Supabase. Se confirmó el registro en `supabase_migrations.schema_migrations`. La nueva RPC `public.bp_public_tournament_followup(uuid)` es `STABLE`, `SECURITY DEFINER`, lectura únicamente; EXECUTE concedido a `anon` y `authenticated` para obtener datos deportivos sanitizados con controles explícitos de publicación.
- **Pruebas de privacidad:** la RPC devuelve `NULL` para `Copa Norte Seguros` mientras `is_published=false`, y también para UUID inexistente o NULL. El mismo resultado se verificó con `SET LOCAL ROLE anon` en transacción de solo lectura. No se publicaron resultados privados ni teléfonos.
- **Integridad:** antes/después: 1 torneo, 10 parejas, 10 partidos y resultados de grupos, 6 partidos y resultados de eliminatorias, 107 reservas, 9 solicitudes fijas y 14 bloqueos. Todos idénticos.
- **SQL Editor:** SQL 71 **DEFINITIVA, SÍ conservar** en GitHub como migración aplicada; no hace falta guardarla manualmente en SQL Editor. **NO volver a ejecutar**. El archivo SQL en esta rama se marca como ya instalada.
- **Pendientes:** integrar PR #2 después de comprobar rama y pruebas, verificar despliegue en sitio real; `Copa Norte Seguros` sigue oculta y finalizada, su publicación debe realizarse voluntariamente desde Admin. **NO borrar el torneo de prueba** hasta revisar la vista pública con usuario.

## 07/11/2026 — Seguimiento público publicado en main

- **Fecha:** 07/11/2026. **Motivo:** completar seguimiento público de torneos antes de la prueba de eliminación definitiva.
- **CONFIRMADO — SQL:** `bp_public_tournament_followup_71` instalada por migración, solo lectura. Comprobado en Supabase: torneo oculto, inexistente o ID NULL retornan `NULL`; como `anon` el torneo oculto sigue sin entregar datos. Se verificaron permisos de ejecución públicos para respuestas filtradas.
- **CONFIRMADO — GitHub:** PR #2 fusionado en `main`, SHA de merge `869b24130e12a22b8bd725005a46292d9d3a8efb`. Incluye `js/torneos-public.js`, `css/torneos-public.css`, SQL 71 y pruebas; la integración no publica por sí misma los torneos.
- **CONFIRMADO — tests:** 64 aprobados, 0 fallidos, 0 omitidos en GitHub Actions `42423844165`, antes de fusionar. Workflow temporal retirado.
- **CONFIRMADO — datos:** 1 torneo (Copa Norte Seguros, `completed`, `is_published=false`), 10 parejas, 10 resultados de grupos, 6 de eliminatorias, 107 reservas, 14 bloqueos. Todo intacto.
- **PENDIENTE de verificar:** Cloudflare Pages no pudo consultarse directamente desde esta sesión (acceso externo bloqueado); comprobar la versión del frontend en navegador. Desde Admin, el botón «Publicar» sí aparece para torneos finalizados; la publicación corresponde a Martín/usuario cuando acepten visibilidad pública. En el sitio se localizará bajo «Finalizados». No borrar hasta revisar completamente el sitio.
- **SQL Editor:** SQL 71 DEFINITIVA: **SÍ conservar** en GitHub como migración ejecutada; no es necesario duplicarla en el editor SQL. **NO repetir ejecución.**

## 07/11/2026 — Parche 72: resultados públicos compactos y podio al final
- **Fecha:** 07/11/2026. **Motivo:** revisión visual del torneo publicado con captura del cliente: partidos de grupos ocupaban todo el ancho y se duplicaba el podio de campeones/subcampeones (antes de grupos y antes de cuartos).
- **Cambio CONFIRMADO:** `js/torneos-public.js` elimina el podio adelantado de la tarjeta general y reemplaza `knockout.prepend(podium)` por `knockout.append(podium)` para situar el único podio después de cuartos, semifinales y final. En resultados de fase de grupos se añade clase exclusiva `public-tournament-group-results`.
- **CSS CONFIRMADO:** solo `.public-tournament-group-results` admite dos columnas mediante `@container (min-width: 700px)`, manteniendo una columna cuando su propio contenedor es estrecho (celular o tarjetas pequeñas). No se modifica el diseño de eliminatorias.
- **Pruebas CONFIRMADAS:** PR #3; GitHub Actions `42425341233`, `node --test tests/*.test.js`: **65 tests aprobados, 0 fallidos, 0 omitidos**. El nuevo test verifica orden del podio, ausencia de duplicados, CSS compacto y que los estilos KO continúen idénticos. Workflow temporal retirado antes de publicar.
- **Supabase:** ninguna operación SQL ni modificación de torneos, resultados, inscripciones, bloques o reservas. SQL71 permanece intacta y aplicada.
- **Pendiente:** revisión visual en desktop y celular, desde `https://boulevard-padel.pages.dev/#torneos`, pestaña **Finalizados**. No borrar Copa Norte Seguros hasta la aprobación visual.

- **Publicación Parche 72 — CONFIRMADA**: PR #3 fusionado en `main`, commit `cfb8d57caf7dfb86f9054ee59e6c6d3628a5be2c`. Tras fusionar se comprobó que `main` contiene el podio solo al final, una grilla exclusiva de resultados de grupos y la regla anterior de tarjetas KO intacta. El despliegue externo de Cloudflare Pages y el aspecto en navegador de escritorio/celular quedan pendientes de revisión con el usuario.

## 07/11/2026 — Parche 73: desplegables públicos separados y trofeos

- **Fecha:** 07/11/2026. **Motivo:** el usuario aprobó la vista actual de cuartos, semifinales y final y solicitó separar «Eliminatorias» del seguimiento de grupos, además de destacar campeones y subcampeones en tarjetas grandes y contiguas con trofeos oro/plata.
- **Cambios CONFIRMADOS:** `js/torneos-public.js` conserva el acordeón «Seguimiento · Resultados, posiciones» con los resultados y tablas de grupos, y agrega otro acordeón independiente «Eliminatorias» con los cruces de cuartos, semifinales, final y podio. Se mantienen los mismos marcadores, etapas, datos y diseño de los partidos; ninguna modificación deportiva ni de backend.
- **Diseño CONFIRMADO:** `css/torneos-public.css` agrega exclusivamente reglas del nuevo selector y el podio responsive; dos tarjetas iguales lado a lado tanto en PC como en móvil, con trofeo SVG vectorial dorado para campeones y plateado para subcampeones, fondo y borde diferenciados, tamaño mayor y nombres legibles. Podio único después de la final.
- **Pruebas CONFIRMADAS:** PR #4, GitHub Actions `42426063405`, suite completa `node --test tests/*.test.js`: **66 aprobadas, 0 fallidas, 0 omitidas**. Pruebas de DOM verifican que ambos desplegables tienen solo sus propios contenidos y que ambos trofeos SVG corresponden al puesto indicado. Workflow temporal retirado antes de integrar.
- **Sin efectos en Supabase:** no se ejecutó SQL ni se tocaron torneo, resultados, parejas, reservas, bloqueos, categorías o permisos. La SQL 71 continúa instalada y disponible. El torneo Copa Norte Seguros permanece como referencia hasta que el usuario apruebe visualmente el sitio.
- **Pendiente:** fusionar PR #4 a `main` y revisar con el usuario los dos desplegables y trofeos en PC/celular antes de cualquier prueba de eliminación.

- **Publicación Parche 73 — CONFIRMADA:** PR #4 fusionado en `main`, commit `a0882c07bffb3e42742af113a014275c87347fa6`. Verificación posterior del código en `main`: los acordeones «Seguimiento · Resultados, posiciones» y «Eliminatorias» son independientes; el podio de dos tarjetas dorada/plateada con SVG está al final. **Despliegue externo y aspecto visual en navegador pendientes de revisión del usuario**. No se ejecutó SQL ni se modificaron registros de Supabase.

## 07/11/2026 — Parche 74: tablas públicas alineadas y grilla adaptable

- **Fecha:** 07/11/2026. **Motivo:** el usuario mostró una captura real de la pantalla pública y señaló que las columnas de «Tablas de posiciones por grupo» no estaban alineadas. Solicitó apariencia equivalente al Admin y disposición automática en una o dos columnas sin pérdida de legibilidad.
- **Diagnóstico CONFIRMADO:** en el sitio público la tabla HTML usaba diseño automático (`table-layout: auto` implícito): las columnas numéricas se desplazaban según la longitud de los nombres de parejas. En Admin los números están centrados, las parejas alineadas a izquierda y la posición resaltada.
- **Cambio CONFIRMADO:** `js/torneos-public.js` añade contenedor `public-tournament-standings-grid` exclusivamente a las tablas de posiciones. `css/torneos-public.css` fija `table-layout: fixed`, ancho constante para Pos. y Pareja, celdas numéricas centradas, posición resaltada y Pts verde, encabezados verdes con detalles dorados; permite que los nombres largos se partan sin desplazar números. La tabla conserva las 9 columnas, la misma clasificación, empates y puntajes. La zona de grupo se convierte en tarjetas individuales con fondo/contorno propios.
- **Responsive CONFIRMADO:** grilla `repeat(auto-fit, minmax(min(100%, 550px), 1fr))`: dos columnas sólo si cada tarjeta tiene ancho legible; de lo contrario una columna, y tablas estrechas conservan desplazamiento horizontal con `min-width:525px` en lugar de reducir texto. Con tres grupos, el último se centra al final en pantallas amplias.
- **Pruebas CONFIRMADAS:** PR #5, GitHub Actions `42426649955`, `node --test tests/*.test.js` **67 aprobadas, 0 fallidas, 0 omitidas**; tests nuevos revisan la grilla, DOM, alineación visual mediante CSS y que las eliminatorias no cambien. Workflow temporal retirado antes de fusionar.
- **Sin modificaciones en Supabase:** no se alteraron tablas, torneos, parejas, marcadores, reservas, permisos, SQL 71, eliminatorias ni podio.
- **Pendiente:** integrar PR #5 en `main` y solicitar revisión visual en PC y celular; eliminación de Copa Norte Seguros pendiente de aprobación.

- **Publicación Parche 74 — CONFIRMADA:** PR #5 fusionado a `main` en commit `7ea382db9d107862421062c057ab5ef2caef4d30`. Verificado en GitHub que la grilla de posiciones responsive, la alineación fija de 9 columnas, el desplazamiento móvil y los estilos Admin están en la versión principal. Las eliminatorias continúan intactas. **Pendiente validar el despliegue real en Cloudflare Pages y la presentación en PC y celular.** No se ejecutó SQL ni se alteraron datos.

## 07/11/2026 — Parche 75: resultados de grupos distribuidos por fecha

- **Fecha:** 07/11/2026. **Motivo:** usuario aprobó la visual de resultados compactos y pidió probar tres columnas, una por fecha (05, 06, 07/03/2027), con los partidos de ese día ordenados por hora y mostrando los marcadores.
- **Cambio CONFIRMADO:** `js/torneos-public.js` agrupa exclusivamente los resultados confirmados de fase de grupos por día LOCAL del complejo en `America/Argentina/Cordoba` usando `Intl.DateTimeFormat(...).formatToParts`. La fecha se presenta en el encabezado (DD/MM/AAAA), la hora junto al partido; dentro de cada día, ordena cronológicamente por `scheduled_at`, sin confundir las fechas UTC al cruzar medianoche. Cuando un resultado no tiene programación, lo muestra en la columna «Fecha por confirmar»; no inventa hora.
- **CSS CONFIRMADO:** `css/torneos-public.css` reemplaza solo la vieja disposición de dos tarjetas por fila en grupos con columnas por fecha: máximo tres en escritorio, dos para ancho de contenedor hasta 810 px y una hasta 530 px. Admite cualquier cantidad de fechas; si hay una o dos, la grilla no agrega una columna vacía. Tarjetas dentro de cada día se apilan verticalmente.
- **Protección de módulos:** tablas de posiciones (Parche 74), cuadro eliminatorio, podio oro/plata, inscripciones, reservas y SQL 71 no se modificaron. No se ejecutó SQL ni se alteraron registros en Supabase.
- **Pruebas CONFIRMADAS:** PR #6, GitHub Actions `42427226845`, suite completa `node --test tests/*.test.js`: **68 aprobadas, 0 fallidas, 0 omitidas**. Incluye validación DOM de las tres fechas y del huso argentino ante cruce de medianoche UTC. Workflow temporal retirado.
- **Pendiente de comprobar:** integración a `main` y revisión visual de la nueva organización en PC y celular; no borrar Copa Norte Seguros antes de completar las pruebas.

- **Publicación Parche 75 — CONFIRMADA:** PR #6 fusionado a `main`, commit `73c3375f5aa23ddf800afb03e44b35b4024271d9`. Se comprobó la versión actual de `js/torneos-public.js` y `css/torneos-public.css`: columnas agrupadas por fecha/hora de Argentina, hasta 3 en escritorio, 2 en tablet y 1 en celular; tablas de posiciones, eliminatorias y podio intactos. Las 68 pruebas de GitHub Actions pasaron. **Pendiente:** verificar despliegue externo y revisión visual desde Chrome en PC/celular. No se alteraron datos de Supabase.

## 07/11/2026 — Parche 76: programación pública por fecha sin resultados

- **Fecha:** 07/11/2026. **Motivo:** separar la consulta de horarios de la visualización de resultados, manteniendo ambas funciones en el público sin repetir marcadores. Usuario aprobó «Programación de partidos» con encuentros y horarios pero sin resultados, en tres columnas, una por fecha.
- **Código CONFIRMADO:** `js/torneos-public.js`: «Ver partidos · N partidos» pasa a «Programación de partidos · N partidos». Presenta todos los encuentros publicados, disputados o pendientes, mostrando exclusivamente grupos, parejas, hora y fecha; no consulta ni imprime en ese bloque `sets`, `winner_pair_id`, `Ganó` ni marcadores. Cada columna contiene los partidos del mismo día, ordenados cronológicamente con `tournamentMatchDay` del huso `America/Argentina/Cordoba`; «Sin programar» agrupa los pendientes y postergados sin inventar horarios. «Seguimiento · Resultados, posiciones» conserva resultados, tablas y clasificación; «Eliminatorias» y podio mantienen su código.
- **CSS CONFIRMADO:** `css/torneos-fechas60.css` (carga después de `torneos-public.css`) actualizada para 3 columnas **por fecha** en escritorio, 2 en tablet cuando el contenedor es de hasta 810 px, 1 en móvil hasta 530 px; evita que el calendario original genere tres partidos por fila dentro de una misma fecha. También tiene fallback para navegadores sin container queries. Fechas con encabezado verde/dorado en estilo consistente con la sección de resultados.
- **Pruebas CONFIRMADAS:** PR #7, GitHub Actions `42427986404`, `node --test tests/*.test.js`: **69 aprobadas, 0 fallidas, 0 omitidas**. La prueba de DOM comprueba fechas 05/06/07 de marzo (incluyendo partido nocturno cruzado en UTC), orden 18:00 antes de 22:00, partido sin programación y ausencia de resultados/ganadores en el bloque de programación. El workflow temporal fue retirado.
- **Sin operaciones Supabase:** no se modificaron torneos, resultados, parejas, reservas, bloqueos, tablas, políticas ni SQL. La publicación del sitio no inicia ninguna eliminación de Copa Norte Seguros.
- **Pendiente:** fusionar PR #7 con `main` y revisar el diseño final en PC/celular con el usuario; no borrar torneo de prueba antes de su aprobación.

- **Publicación Parche 76 — CONFIRMADA:** PR #7 fusionado a `main` en commit `33d44052828f4f4a5a1386c5382b046bc33d03f9`. Tras la fusión se confirmó que `main` usa tres columnas por fecha local argentina para Programación, sin marcadores ni ganadores, con fechas sin programar visibles, y mantiene Seguimiento y Eliminatorias. 69 tests OK. **Pendiente comprobar visualmente el despliegue de Cloudflare Pages en PC y celular**. No se ejecutó ninguna operación SQL ni se modificaron registros de Supabase.

## 08/11/2026 — Parche 77: tablas públicas con apariencia del Admin

- **Fecha:** 08/11/2026. **Motivo:** el usuario presentó captura del Admin con tablas de tres grupos en paralelo, cabecera verde, Pts dorada y avisos de clasificación. Solicitó adoptar esa visual en las tablas de posiciones públicas de Torneos.
- **Código CONFIRMADO:** `js/torneos-public.js` incorpora título `Grupo X · N parejas`, nombres de parejas con `y` (presentación, sin alterar los datos), y un aviso al pie: para grupos completos y sin empate pendiente, clasifican las primeras dos parejas en grupo de 3 o las primeras tres en grupo de 4; en grupos incompletos muestra tabla provisoria; en empate absoluto indica definición pendiente. Mantiene cálculo de puntos 3 por victoria, 0 por derrota, sets y orden, sin tocar SQL.
- **CSS CONFIRMADO:** `css/torneos-public.css` reproduce el diseño de `css/admin-ux57.css`/Admin: encabezado `#00432e` con letras blancas, Pts dorada `#a48335`, celdas Pts crema `#f8f0db`, filas alternadas, nombres alineados a la izquierda, números centrados y tarjetas con borde dorado. Se amplía únicamente la sección Torneos a 1580 px y las tarjetas de torneo se presentan una por fila para mostrar tablas anchas; grilla adaptable con `auto-fit` y ancho mínimo de 450 px por grupo, hasta tres cuando el contenedor lo permita. En pantallas estrechas una columna y scroll horizontal dentro de la tabla (mínimo de 425 px), sin modificar el resto del portal.
- **Protección funcional:** sin cambios a programación por fechas, resultados por fechas, eliminatorias, podio, inscripciones, reglas deportivas, reservas, Supabase ni migraciones. No se eliminó Copa Norte Seguros.
- **Pruebas CONFIRMADAS:** PR #8, GitHub Actions `42428604890`, suite `node --test tests/*.test.js`: **70 aprobadas, 0 fallidas, 0 omitidas**. Test actualizado verifica estructura de DOM, título, mensaje de clasificación y presentación de nombres; nuevo test verifica CSS de la cabecera verde, Pts dorados, grilla de grupos y conservación del cálculo. Workflow temporal retirado.
- **Pendiente:** fusionar PR #8 en `main`, verificar código publicado y luego comprobar visualmente la vista pública en computadora/celular. Eliminación de torneo pendiente de aprobación final del usuario.

- **Publicación Parche 77 — CONFIRMADA:** PR #8 fusionado en `main`, commit `21124cc3aad7693b10016044dced8f226cfd6d56`. Verificación post-merge sobre archivos de `main`: tarjetas públicas con títulos y cantidad de parejas; avisos de clasificación para grupos de 3/4 finalizados; protección de empates; CSS del Admin en verde/dorado; grilla adaptable y ancho de Torneos ampliado. Suite previa: 70 pruebas Node aprobadas. **Pendiente verificar despliegue de Cloudflare Pages y la lectura en PC/celular con el usuario.** Sin operaciones SQL ni cambios de registros en Supabase.

## 07/11/2026 — Parche 78: identidad verde y dorada en todo Torneos público

- **Fecha:** 07/11/2026 (hora Argentina). **Motivo:** el usuario aprobó en captura la paleta del Admin replicada en Tablas de posiciones (Parche 77) y pidió llevarla también al resto de las secciones públicas de Torneos.
- **Diseño PREPARADO y CONFIRMADO en rama:** nueva hoja aislada `css/torneos-tema78.css`, cargada desde `index.html` después de `css/torneos-public.css` y `css/torneos-fechas60.css`. Aplica verde `#00432e`, dorado `#a48335`, crema y bordes suaves a encabezados/tarjetas de torneos, pestañas Vigentes/Finalizados, acordeones de Grupos/Programación/Seguimiento/Eliminatorias, listado de parejas, tarjetas y fechas de la programación, resultados de grupos, rótulos de cuartos/semifinales/final y el diálogo público de inscripción. Resalta estados abiertos, mantiene marcadores nativos y estilo de foco accesible, y reduce las transiciones cuando el usuario lo solicita.
- **Protección funcional:** ninguna modificación a JavaScript, datos de torneos, horarios, marcadores, resultados, clasificaciones, inscripciones, reservas, SQL ni Supabase. Se preservan exactamente el diseño de la tabla de posiciones del Parche 77 y las dos tarjetas de trofeos oro/plata. Solo se cambian estilos visuales existentes.
- **Pruebas CONFIRMADAS:** PR #9, ejecución GitHub Actions `42429095186`, `node --test tests/*.test.js`: **75 aprobadas, 0 fallidas, 0 omitidas**. Cinco regresiones nuevas confirman carga de CSS después de estilos previos, paleta e identidad, conservación de tablas/podio, programación sin resultados, responsive y ausencia de cambios de navegación/formularios. CI temporal retirado.
- **Pendiente:** fusionar PR #9 en `main`, revisar los archivos publicados, comprobar el despliegue externo en Cloudflare Pages y pedir revisión visual al usuario en PC/celular; la prueba de eliminación definitiva de Copa Norte Seguros permanece en espera.

- **Publicación Parche 78 — CONFIRMADA:** PR #9 fusionado en `main`, commit `58fd4713e002a435b541a5f3b2dc6a82ad567f22`. Verificación posfusión en GitHub: `index.html` carga `css/torneos-tema78.css` después de los CSS anteriores, con paleta verde/dorado para pestañas, grupos, programación, resultados y eliminatorias. Se preservaron las tablas del Admin y las tarjetas del podio. Suite completa previa de 75 pruebas sin errores. **Pendiente:** verificar despliegue de Cloudflare Pages y aspecto en navegador, PC y celular, con el usuario. No se ejecutó SQL ni se alteraron datos de Supabase.

## 07/11/2026 — Parche 79: dos niveles de pestañas y botones equilibrados

- **Fecha:** 07/11/2026 (hora Argentina). **Motivo:** el usuario pidió mantener pestañas principales «Vigentes» y «Finalizados», agregar un segundo nivel con los nombres de cada torneo y mostrar únicamente los datos del torneo seleccionado. Requisito estético explícito: **todos los botones y solapas deben tener siempre iguales dimensiones**, sin importar la longitud de los nombres.
- **Cambio CONFIRMADO en desarrollo:** `js/torneos-public.js` genera automáticamente una solapa por torneo de la categoría visible, asociada al ID único de Supabase. El panel conserva una sola tarjeta de torneo con sus propias parejas, grupos, programación, seguimiento, tablas, eliminatorias y podio. Los conteos Vigentes/Finalizados siguen correctos. Se recuerda la selección por categoría en `selectedTournamentByTab`; si deja de estar disponible, se selecciona el primero. No hay solapas vacías ni mezcla de datos.
- **HTML y accesibilidad:** `index.html` suma `#public-tournament-selector` como tablist secundario y configura el panel seleccionado mediante `aria-controls`, `aria-selected`, `aria-labelledby`, `tabIndex` y nombre completo accesible del torneo. Teclado: flechas izquierda/derecha, Inicio/Fin. Los botones llevan el nombre real y `title` para títulos largos; sin modificar categorías ni datos.
- **Diseño CONFIRMADO:** nuevo `css/torneos-solapas79.css` cargado después del tema visual Parche 78. Las dos pestañas superiores ocupan mitades iguales y tienen el mismo alto. Todas las solapas secundarias de torneos tienen **234 × 72 px en escritorio** y **188 × 72 px en móvil**; texto centrado en hasta tres líneas, sin deformación, fila desplazable horizontalmente en celular, resaltado verde/dorado y foco visible. Los tamaños se mantienen iguales entre todos los botones de un mismo nivel.
- **Pruebas CONFIRMADAS:** PR #10, GitHub Actions `42430065340`, suite `node --test tests/*.test.js`: **77 pruebas aprobadas, 0 fallidas, 0 omitidas**. Nuevos tests DOM simulan 3 vigentes y 2 finalizados: verificación de que una selección no mezcla nombres, categorías, programación ni datos de otros torneos; memoria de selección al cambiar de categoría; navegación con teclas y atributos ARIA; tamaños fijos y diseño responsive. CI temporal retirado tras aprobar.
- **Sin operaciones SQL/Supabase:** ni cambios de datos, ni de reservas, ni de reglas deportivas, ni de permisos. Continúa publicada la Copa Norte Seguros como referencia, sin eliminación.
- **Pendiente:** fusionar PR #10 en `main`, comprobar que solo incluya JS/HTML/CSS/tests/bitácora y revisar visualmente las nuevas solapas en PC y celular. La eliminación definitiva de Copa Norte Seguros requiere aprobación posterior.

- **Publicación Parche 79 — CONFIRMADA:** PR #10 fusionado en `main`, commit `8200d5096d53abb5ce4f29a0d5107d8efea3a061`. Se verificaron en `main` la nueva barra de torneos por ID, selección exclusiva por categoría, memoria separada de Vigentes/Finalizados, botones iguales en desktop/móvil, desplazamiento horizontal, navegación ARIA/teclado y la carga del CSS nuevo después del tema 78. Suite GitHub Actions previa: **77/77 pruebas aprobadas**. Pendiente revisión visual del despliegue Cloudflare Pages en PC/celular, especialmente con varios torneos publicados. Sin operaciones Supabase ni eliminación del torneo de prueba.

## 07/11/2026 — SQL 80 preparada: semifinales directas para cuatro clasificadas

- **Fecha:** 07/11/2026 (Argentina). **Motivo:** torneo de prueba con siete parejas agrupadas en dos zonas (4+3) no habilitaba eliminatorias: lógica Admin/Supabase limitaba el cuadro a tres zonas de 3+3+4 y siete clasificadas. El usuario confirmó nueva regla: zona de 4 juega A1 (1 vs 2), A2 (3 vs 4), A3 (ganador A1 vs ganador A2) y A4 (perdedor A1 vs perdedor A2). En torneos de DOS grupos clasifican **solamente ganador A3 (1°) y perdedor A3 (2°)**, más dos primeras parejas de zona de 3. Cuatro clasificadas juegan **Semifinal 1: 1° A vs 2° B; Semifinal 2: 1° B vs 2° A; Final: ganadores de ambas semifinales**. Martín puede intercambiar rivales antes de confirmar. **Sin cuartos ni byes.**
- **Estado confirmado de Supabase (solo lectura):** el usuario ya probó la eliminación definitiva de su torneo de 7 parejas y funcionó. Se confirmó que en producción solo permanece `Copa Norte Seguros`, `completed` y publicada, con un cuadro histórico de siete clasificadas y **seis** partidos eliminatorios. Ninguna operación de escritura o modificación de Supabase fue realizada por el asistente en este ajuste.
- **Motor preparado:** `js/torneos-motor.js` incorpora `decisiveFourPlacings` para calcular el orden A3/A4 independientemente de empates por estadísticas, y `planFourKnockout` con semifinales cruzadas sin pase libre. El motor anterior `recommendSevenBye` y `planSevenKnockout` continúa intacto para el formato histórico.
- **Admin preparado:** `js/admin-eliminatorias.js` incorpora modo 4 clasificadas para torneos de dos grupos de 3 o 4 parejas, con cruces intercambiables, confirmación modal y bloqueo de cuadros obsoletos por versión. En `js/admin-eliminatorias-partidos68.js` se soportan semifinales con participantes definidos desde la primera ronda, manteniendo programación/reprogramación y resultados por RPC. `js/admin-resultados.js` ordena el grupo de 4 por A3/A4 y muestra **solo dos clasificados** en torneos de dos grupos, sin alterar cuadros históricos. `css/admin-eliminatorias66.css` deja dos tarjetas equilibradas de semifinales.
- **Público preparado:** `js/torneos-public.js` presenta las nuevas semifinales directas sin cuartos, conserva el podio y reconoce dos clasificados por grupos de 4 en torneos de dos zonas. Para antiguos cuadros de 7 continúan cuartos y bye.
- **SQL 80 PREPARADA, NO INSTALADA:** `sql/SQL_80_ELIMINATORIAS_CUATRO_CLASIFICADAS.sql` amplía la tabla `bp_tournament_knockout_brackets` con columna `semifinals`, permite `direct_semifinal_pair_id = NULL` solo si existen dos semifinales válidas y no hay cuartos, y conserva el formato anterior (pase directo + tres cuartos). Adapta cinco funciones existentes: validador admin, generación de partidos, protección ante cambios a cuadros en uso, RPC para registrar resultado de semifinales directas y respuesta pública filtrada. **No elimina ni resembrará automáticamente** torneos históricos o reservas. No se crea una nueva función pública con privilegios adicionales.
- **Pruebas confirmadas:** PR borrador #11 (rama `desarrollo/eliminatorias-4-clasificadas-20261107`), GitHub Actions `42433560948`: `node --test tests/*.test.js` **87 aprobadas, 0 fallidas, 0 omitidas**. Incluye simulación real de A1/A2/A3/A4 más grupo de 3 (siete partidos) que retorna clasificadas por orden de enfrentamiento y semifinales cruzadas, y regresiones de los cuadros antiguos. Workflow temporal retirado tras aprobar.
- **Importante:** la SQL 80 **SÍ es DEFINITIVA** y debe conservarse como migración aplicada o en SQL Editor, pero **NO EJECUTAR AHORA**: se requiere autorización explícita adicional del usuario, como se acordó. No fusionar ni publicar la rama antes de aplicar exitosamente la SQL 80 y confirmar permisos/datos con consultas de solo lectura. Tras instalación autorizada, volver a verificar la vista pública y Admin de un torneo nuevo de 4+3.

### 08/11/2026 — Migración SQL 80 instalada y verificada

- **Fecha/hora:** 08/11/2026 (Argentina). **Motivo:** autorización expresa del usuario para instalar SQL 80 y luego publicar el Admin/vista pública con el formato de cuatro semifinalistas para torneos de dos grupos.
- **Instalación CONFIRMADA:** `bp_knockout_four_semifinals_80` aplicada mediante migración Supabase, resultado `success:true`; aparece en historial con versión `20261108012904`. SQL archivada en `sql/SQL_80_ELIMINATORIAS_CUATRO_CLASIFICADAS.sql`. **SQL DEFINITIVA: SÍ conservar en GitHub. No es necesario guardarla en SQL Editor; si se guarda, solo para consulta, NUNCA volver a ejecutarla.** Después de aplicarla se actualizó el encabezado descriptivo del archivo (sin cambios funcionales).
- **Seguridad adicional:** se amplió el trigger EXISTENTE de congelación `bp_ko_freeze_started_bracket_trg` para cubrir modificaciones a `semifinals` además de `quarterfinals` y `direct_semifinal_pair_id`. Validación admin, RPC de resultados, programación existente, generación de cuadro y respuesta pública conservadas. PostgREST recibió `NOTIFY pgrst, 'reload schema'`.
- **Validación de datos CONFIRMADA:** antes y después, `1 torneo`, `10 parejas`, `1 cuadro`, `6 partidos eliminatorios`, `6 resultados eliminatorios`, `3 grupos`, `10 partidos de grupos`, `10 resultados de grupos`, **107 reservas** y **14 bloqueos**. El único torneo `Copa Norte Seguros`, finalizado y publicado, conserva `semifinals IS NULL`, **3 cuartos, 1 pase libre, 6 partidos KO y 6 resultados**. Ningún resultado fue creado/editado y no se generaron encuentros.
- **RPC pública CONFIRMADA:** `bp_public_tournament_followup` devuelve para Copa Norte Seguros 3 grupos, 10 partidos de grupos, 3 cuartos y 6 partidos eliminatorios sin cambiar el modo histórico. `bp_admin_save_knockout_result` sigue con `anon_execute=false` y `authenticated_execute=true`; el propio código también valida Admin activo. No se crearon nuevas tablas públicas ni se alteró RLS.
- **Pruebas CONFIRMADAS:** CI GitHub Actions `42434390364`, **87/87**, 0 fallidas, después de incorporar la protección de `semifinals`. Se conservan los tests del grupo de 4 ordenado por A3/A4, cruce 1°A-2°B, 1°B-2°A y pruebas de regresión del formato anterior.
- **Pendiente:** retirar workflow temporal, aprobar e integrar el PR #11 de JS/CSS/HTML/SQL documental a `main` y verificar el código y la presentación pública. Luego ensayar con un torneo nuevo de 7 parejas desde Admin; no recrear automáticamente el eliminado por el usuario.

- **Publicación Parche 80 — CONFIRMADA:** PR #11 fusionado en `main` en commit `723b39cb977e852226587200dc0134d0cf4d2bec`, después de instalar la migración SQL 80 y validar la integridad del cuadro histórico y las reservas. El código del motor (`decisiveFourPlacings`, `planFourKnockout`), Admin (selector de dos semifinales), programación/resultado de partidos eliminatorios y vista pública ya figura en `main`. Se mantuvieron **87 pruebas completas OK (0 fallidas)**. La versión publicada en GitHub fue verificada por lectura directa. **Pendiente:** comprobar el despliegue real de Cloudflare Pages desde un navegador y hacer una prueba funcional con un nuevo torneo de dos grupos (4+3); no se recreó el torneo que el usuario eliminó. **No ejecutar SQL 80 otra vez**.

## 07/11/2026 — Parche 81: modal de programación/reprogramación de eliminatorias uniforme

- **Fecha:** 07/11/2026 (Argentina). **Motivo:** captura del usuario durante prueba de semifinales: modal «Reprogramar partido» visualmente distinto a los demás diálogos del Admin. Solicita que adopte el diseño existente y preserve su preferencia por botones idénticos en dimensión.
- **Código CONFIRMADO:** cambio exclusivamente de estilos en `css/admin-eliminatorias68.css`, acotado al selector `#bp-ko68-schedule-dialog`. Ajusta ancho (hasta 540 px), borde dorado y radio, encabezado, nombre de los rivales, icono, tipografía Inter, fecha/hora, duración y motivo con dimensiones equilibradas y caja sutil, nota contextual, mensaje de error oculto si está vacío. Los botones **Volver** y **Guardar horario** comparten reglas comunes idénticas (ancho 100 % de columnas iguales, alto exacto 48 px) en escritorio y móvil; las columnas de campos colapsan a una en móvil. `#bp-ko68-result-dialog` no recibe cambios.
- **Sin cambios funcionales:** JS, fechas, horarios, duración, motivo obligatorio para reprogramación, programación/postergación, seguridad, disponibilidad, RPC, resultados, reservas, bloqueos y SQL/Supabase permanecen intactos. Ningún dato de producción modificado.
- **Pruebas CONFIRMADAS:** PR #12, GitHub Actions ejecución `42436156677`, suite `node --test tests/*.test.js`: **91 pruebas aprobadas, 0 fallidas, 0 omitidas**. Nuevos tests verifican clases CSS del modal, tamaño común exacto de ambos botones, responsive, no modificación del diálogo de resultados y conservación del flujo JS de programación. Workflow temporal retirado.
- **Pendiente:** fusionar PR #12 en `main` y comprobar visualmente el deploy de Cloudflare Pages (PC/celular), sin interferir en las pruebas funcionales que el usuario está realizando.

- **Publicación Parche 81 — CONFIRMADA:** PR #12 fusionado en `main`, commit `9b10d2664467e7374bf01359267b370ee10d13ed`. Se verificó directamente en `main` la presencia de estilos aislados de `#bp-ko68-schedule-dialog`, botones simétricos de 48 px, comportamiento móvil y carga de `css/admin-eliminatorias68.css` en el Admin. Suite previa: **91 pruebas aprobadas, cero errores**. **Pendiente:** comprobar el despliegue de Cloudflare Pages y revisar visualmente el modal en navegador con el usuario. Sin cambios en Supabase, programación, reservas ni torneos.

## 07/11/2026 — Parche 82: modalidad Liga en desarrollo, SQL no instalada

- **Fecha:** 07/11/2026 (Argentina, UTC−03). GitHub Actions registra ejecuciones del 08/11 en UTC. **Motivo:** autorización expresa para incorporar modalidad Liga en la misma sección «Torneos» de Boulevard Pádel, conservando inscripción pública y administración de parejas, fecha estimada de inicio sin fecha final y campeón por tabla; el usuario confirmó explícitamente **dos sets normales + súper tie-break como tercero**, siempre sin tercer set si ya hubo 2-0.
- **Reglamento PROVISIONAL pendiente de revisión con Martín:** todos contra todos a una rueda por defecto, con ida/vuelta opcional; 2 puntos por ganar 2-0 o 2-1, 1 por perder 2-1, 0 por perder 2-0. STB desde 10 con dos puntos de diferencia; cuenta como set y NO como games. Orden de tabla: Pts → diferencia de sets → sets a favor → diferencia de games → games a favor. Ante empate absoluto por campeonato, **no se inventa desempate ni campeona**: intervención de Martín.
- **Motor CONFIRMADO en rama:** `js/torneos-liga-motor.js` (puro y aislado) arma round robin para cantidad par o impar de parejas, una o dos ruedas y fecha libre cuando es impar; calcula PJ, PG, PP, sets, games y puntos. No modifica el motor de zonas ni los cuadros de Copa Norte Seguros.
- **Admin CONFIRMADO en rama:** `admin/index.html`, `js/admin-liga82.js`, `css/admin-liga82.css` y ajustes `js/admin-torneos.js`: Liga se gestiona **dentro de Torneos**, sin navegación nueva. Reutiliza inscripción pública/privada y categoría, admite inicio estimado sin fin, genera fechas a partir de parejas aprobadas y sin pendientes, permite una o dos ruedas, calendario por fecha con programación individual/reprogramación/postergación, carga/corrección de resultados STB y tabla general. Confirmaciones modales, panel verde/dorado, botones uniformes en PC/celular. Se exige completar todos los resultados y resolver empate de campeón antes de finalizar. Lecturas de fixture paginadas.
- **Público CONFIRMADO en rama:** `js/torneos-liga-public82.js`, `js/torneos-public.js`, `css/torneos-liga82.css`, `index.html`: solapas Vigentes/Finalizados existentes, inscripción, nueva vista de Liga con «Calendario de Liga» y «Tabla general» desplegables, partidos ordenados por Fecha, marcadores, tabla y campeones cuando procede. Los torneos Grupos + Eliminatorias no cambian. Lectura sanitizada (sin teléfonos) a través de RPC exclusiva para ligas publicadas.
- **SQL 82 PREPARADA, NO APLICADA:** `sql/SQL_82_LIGA_TEMPORADA.sql` permite `ends_on=NULL` solo para Liga; tablas nuevas `bp_league_settings` y `bp_league_matches` con RLS activado y GRANT/REVOKE explícitos. Funciones administrativas restringidas: generar fixture, programar/postergar cancha con verificación de conflictos contra reservas y blockouts, guardar resultado validando sets/STB y responder público sanitizado. Agrega vínculo `blockouts.tournament_league_match_id`; amplía exclusivamente sus restricciones y guardián existente; actualiza eliminación definitiva de un torneo para liberar únicamente partidos/bloqueos de la Liga. Incluye guardia del plantel al generar fixture y evita cerrar una Liga con encuentros sin resultado. **No ejecutar ni guardar manualmente en SQL Editor ahora**; requiere autorización separada de la migración definitiva, una revisión SQL final y validación postinstalación.
- **Edge Function preparada, NO desplegada:** `supabase/functions/register-tournament-pair/index.ts` considera `format='league'` para permitir inscripciones sin fecha final, conservando comprobación Turnstile, estado de inscripciones y cupo. Su despliegue en Supabase queda pendiente de autorización cuando se instale SQL.
- **Pruebas CONFIRMADAS:** PR borrador #13, ejecución GitHub Actions `42439543037` con `node --test tests/*.test.js`: **108 aprobadas, 0 fallidas, 0 omitidas**. Incluye fixtures par/impar, ida/vuelta, ganador/perdedor 2-1, STB válido/inválido, campeonato empatado, permisos/RLS, programación de cancha, reserva, aplicación pública y botones idénticos. Los 91 tests anteriores continúan pasando.
- **Producción NO MODIFICADA:** ninguna migración SQL82 aplicada, ninguna Edge Function desplegada, ningún PR de Liga fusionado a `main`. `Copa Norte Seguros`, `Apertura 2027`, reservas, grupos y eliminatorias existentes intactos. El desarrollo está aislado en `desarrollo/modalidad-liga-20261107`.
- **Próximos pasos PENDIENTES:** revisión de SQL en detalle y autorización explícita; aplicar migración en Supabase; verificar seguridad/RLS y conteos; desplegar Edge Function revisada; integrar PR #13 en `main` tras CI y comprobar Cloudflare; crear una Liga de prueba con al menos 5 y 8 parejas para verificar cantidad impar/par, fase pública, inscripción, tiempos, STB, tabla y finalización. No trabajar sobre el producto comercial TGJP Torneos antes de validar Liga con Martín.

- **Cierre de preparación Parche 82 — CONFIRMADO (07/11/2026, Argentina):** PR borrador #13 actualizado, **108/108 pruebas aprobadas** en ejecución final `42439709314`, workflow CI temporal eliminado. La rama incluye SQL82, Edge Function ajustada, motor, interfaces y tests, pero permanece deliberadamente **sin fusionar**. Verificación de Supabase solo lectura: **2 torneos, 17 parejas, 107 reservas y 24 bloqueos**, sin tablas `bp_league_matches` ni `bp_league_settings`, por lo que SQL82 sigue no instalada. La diferencia de bloqueos respecto de auditorías anteriores corresponde al estado actual de producción; no se realizaron escrituras desde esta sesión. **Requiere aprobación separada de SQL82 + despliegue de Edge Function antes de publicar en `main`.**

### Pendiente posterior a Liga — explicación de clasificación en grupos de cuatro

- **Fecha:** 08/11/2026 (Argentina). **Motivo:** captura del Admin de un grupo de cuatro parejas; posiciones 2° y 3° muestran exactamente PJ=2, PG=1, PP=1, SF=2, SC=2, Dif.=0, Pts=3. Usuario pregunta por qué 2° clasifica y 3° queda afuera.
- **Regla CONFIRMADA, no modificar:** en zona de cuatro con cruces A1 (1 vs 2), A2 (3 vs 4), A3 (ganadores) y A4 (perdedores), **ganador A3 = 1°, perdedor A3 = 2°, ganador A4 = 3°, perdedor A4 = 4°**; pasan solo 1° y 2° cuando hay dos zonas. Los empates estadísticos entre 2° y 3° son esperables y no requieren desempate ni decisión del Admin si A3/A4 están correctos.
- **Pendiente de UX para DESPUÉS de Liga:** comprobar en código y con los resultados reales que la tabla ordene según A3/A4 y agregar una explicación visible y sencilla —por ejemplo, aclarar qué pareja perdió A3 y cuál ganó A4— sin cambiar puntuación ni reclasificar según puntos. Primero concluir Modalidad Liga.
- **Estado:** pendiente, no implementado; no modificar el torneo ni Supabase en este ajuste.

## 08/11/2026 — Ajustes de Liga: sorteo libre, Fechas manuales, máximo dos por pareja

- **Fecha y motivo:** 08/11/2026 (Argentina). El usuario pidió eliminar del selector «Eliminación directa» y renombrar «Todos contra todos» a **«Liga»**. Liga tendrá **una sola rueda**, sin ida/vuelta por ahora; Martín decide cuántos partidos distribuir en Fecha 1, Fecha 2, etc., con días y horas libres (inclusive días hábiles) y máximo **dos partidos por pareja en la misma Fecha**.
- **Sorteo definido:** permitido con inscripciones cerradas o cuando el cupo de parejas aprobadas esté completo, sin solicitudes pendientes; sorteo aleatorio de todas las parejas aprobadas (2–64) para generar todos los cruces una sola vez. No asigna ninguna Fecha ni horario al crear el fixture. Si se sortea por cupo completo, cierra inscripciones en la misma transacción.
- **Regla de jornadas:** «Fecha N» identifica una jornada competitiva, **no un día específico de calendario**; puede extenderse durante fin de semana o días hábiles. Martín asigna el número de Fecha, y por separado día, hora y duración individual. No hay cantidad total predefinida de partidos por Fecha.
- **Seguridad y validaciones:** nueva RPC administrativa bp_league_assign_round(uuid, integer) con rango 1–999 y máximo 2 partidos por pareja por Fecha, usando bloqueo de la fila del torneo para serializar asignaciones simultáneas. El campo round_number ahora admite NULL para encuentros recién sorteados. No se puede programar ni registrar un resultado antes de asignar Fecha. El motor frontend incluye validateRoundAssignment como aviso anticipado; el servidor aplica la regla definitiva.
- **Interfaz Admin:** modalidades visibles «Fase de grupos + eliminatorias» y «Liga»; botón «Sortear partidos» y sin opción de ida/vuelta; partidas en «Partidos sin Fecha» hasta que Martín las asigne; nuevo botón y modal «Asignar/Cambiar Fecha». Botones de las tarjetas con dimensiones iguales en PC/móvil.
- **Público:** nuevo apartado para «Partidos sin Fecha» separado de jornadas programadas; mostrar día real (sábado, domingo o hábil) una vez programado. Sigue tabla 2/1/0, dos sets más STB si 1-1; el STB cuenta como set, NO como games.
- **Pruebas confirmadas:** GitHub Actions 42500490946: **113 aprobadas, 0 fallidas** en node --test tests/*.test.js. Incluye verificaciones de cupo, una rueda, asignación de jornadas, máximo dos parejas/Fecha, SQL/RLS, visualización y regresiones previas.
- **Estado:** exclusivamente rama desarrollo/modalidad-liga-20261107 y PR borrador #13. **SQL 82 NO INSTALADA, Edge Function NO DESPLEGADA y main intacta.** SQL definitiva, SÍ conservar en GitHub como migración tras aprobación; NO ejecutar ni guardar ahora en SQL Editor. El usuario eliminará su propio torneo de prueba si lo desea; el asistente no alteró datos de producción.

### Pendiente posterior a Liga — explicación en grupo de 4 + 3 (siete parejas)

- **Regla confirmada para torneo de siete parejas:** dos grupos, uno de 4 y otro de 3: **clasifican dos parejas por grupo**, total cuatro a semifinales. Grupo 4: 1° ganador A3 (cruce de ganadores), 2° perdedor A3; 3° ganador A4 (perdedores). Aunque las posiciones 2 y 3 estén empatadas en puntos y sets, su lugar responde al resultado del cruce, no a un desempate estadístico.
- **No extrapolar la regla:** en el torneo histórico de 10 parejas con tres grupos (3+3+4) se mantiene la clasificación especial anterior del grupo de cuatro, que aporta tres clasificadas. No se modifica durante Liga.
- **UX pendiente:** explicar en la tabla del Admin la diferencia entre el perdedor A3 (2° clasificado) y el ganador A4 (3° eliminado), sin cambiar la lógica deportiva. Revisar recién después de cerrar Liga.

- **Cierre técnico de estos ajustes, 08/11/2026:** el Admin abre automáticamente el panel Liga aun cuando el selector de torneos se complete de manera asíncrona; se ocultan los paneles exclusivos de tablas grupales, cuadro eliminatorio y programación KO mientras Liga esté seleccionada (solo presentación). Nueva prueba de integración. Suite completa final: **113 aprobadas, 0 fallidas**, GitHub Actions 42500490946. Workflow temporal retirado; PR #13 sigue en borrador, SQL 82 no instalada y Edge Function sin desplegar. No se ha modificado producción.

## 09/11/2026 — Integración real de Liga en Supabase · Parche 82

- **Fecha y motivo:** 09/11/2026, Argentina. Por autorización del usuario, avanzar desde el desarrollo aislado a la integración técnica de Liga, sin crear ni alterar torneos, reservas o bloqueos reales.
- **CONFIRMADO — GitHub:** revisión de SQL82 y corrección del disparador `bp_league_lock_roster()` para comprobar tanto el torneo de origen como el destino al trasladar una pareja con fixture sorteado. Prueba de regresión agregada. CI temporal 42616669399: suite completa y `node --check` del JS de Liga aprobados.
- **CONFIRMADO — Supabase:** migración `bp_sql82_liga_temporada` aplicada correctamente; `bp_league_matches` y `bp_league_settings` creadas vacías, RLS activo, lectura directa administrativa, escritura solamente vía RPC, RPC administrativas denegadas a `anon` y RPC pública permitida solo para ligas publicadas. `ends_on` ahora admite NULL para Liga y permanece obligatorio para otras modalidades.
- **Auditoría de conservación — CONFIRMADA:** antes y después de aplicar SQL82 se mantuvieron **2 torneos, 17 parejas, 112 reservas y 24 bloqueos**. Cero partidos y cero configuraciones de Liga (no se generó fixture real ni se tocó el torneo de prueba del usuario).
- **CONFIRMADO — Edge Function:** se desplegó `register-tournament-pair` versión **3**, `verify_jwt=false` como ya tenía por ser inscripción pública protegida por Turnstile; comprueba que la fecha final no sea obligatoria para `format='league'`, conservando controles existentes de cupo y cierre.
- **CONFIRMADO — publicación de código:** PR #13 fusionado en `main`, commit `5796035355507b746e1fb7f82d6b32aeb26cc7ac`. Comprobado en `main` que el desplegable **Modalidad** contiene exclusivamente «Fase de grupos + eliminatorias» y «Liga» y que `js/admin-liga82.js` está integrado; workflow de pruebas temporal retirado tras CI exitosa 42617336030.
- **Auditoría posterior a la fusión — CONFIRMADA:** Edge Function `register-tournament-pair` versión 3 activa, dos tablas nuevas presentes; conteos de producción preservados (**2 torneos, 17 parejas, 112 reservas y 24 bloqueos**).
- **CONFIRMADO — Cloudflare Pages:** verificación remota real desde GitHub Actions 42617716596 aprobada: `https://boulevard-padel.pages.dev/admin/index.html` contiene exclusivamente «Fase de grupos + eliminatorias» y «Liga» y `js/torneos-liga-motor.js` se entrega correctamente. Workflow temporal retirado luego de la comprobación.
- **PENDIENTE:** ensayo funcional desde Admin y sitio público con una Liga de prueba autorizada y ratificación con Martín del puntaje Liga 2/1/0. No se generaron partidos ni inscripciones ficticias en datos reales.

## 09/11/2026 — Pendientes al pausar pruebas de Liga y seguridad (traspaso entre chats)

- **Fecha / motivo / estado:** 09/11/2026 (Argentina). El responsable del proyecto se encuentra **probando Liga en producción con una competencia de prueba** y necesita confirmar ciertas reglas con Martín antes de continuar. **PENDIENTE DE VALIDACIÓN FUNCIONAL**, aunque la implementación técnica fue instalada, fusionada y se comprobó la publicación. No considerar Liga terminada hasta completar pruebas reales.
- **Estado confirmado para retomar:** repositorio público `boulevardpadelvila/boulevard-padel`; rama principal `main`; modalidad visible en Admin solo `Fase de grupos + eliminatorias` y `Liga`; SQL82 aplicada mediante migración `bp_sql82_liga_temporada` (versión `20261109122706`); Edge Function `register-tournament-pair` versión 3 activa; PR #13 fusionado; verificación de Cloudflare Pages aprobada. Los conteos del 09/11 luego de integrar fueron 2 torneos, 17 parejas, 112 reservas, 24 bloqueos **antes de que el usuario iniciara su prueba**; no usar esas cifras como estado actualizado.
- **Liga — pruebas manuales PENDIENTES:** creación/edición y publicación; inscripciones y aprobación/rechazo de parejas; cupo completo o cierre de inscripción para habilitar sorteo sin solicitudes pendientes; sorteo de una sola rueda con cantidades impares y pares; ninguna Fecha ni horario asignados automáticamente; Martín distribuye los encuentros entre `Fecha 1, 2...` (jornadas deportivas, no días calendario) con máximo dos partidos por pareja por Fecha; programación, reprogramación y postergación, validando conflictos con reservas y bloqueos; resultados 2 sets + STB a 10 con diferencia de 2 si 1–1, correcciones, tabla general, público/móvil, finalización y campeón. Verificar que el formato Grupos + Eliminatorias siga intacto. No borrar torneos ni inventar resultados durante la prueba sin confirmación expresa.
- **Reglas por confirmar con Martín — PENDIENTE:** validar el puntaje provisional de Liga (**ganador 2; perdedor 2–1 obtiene 1; perdedor 2–0 obtiene 0**); revisar criterios de desempate y qué sucede ante igualdad absoluta, especialmente al decidir campeón; registrar cualquier regla adicional que surja durante la prueba. No modificar reglamento ni datos productivos por suposición.
- **Torneos preexistentes — UX PENDIENTE para después de Liga:** en competencia de 7 parejas con dos grupos (4+3), clasifican 2 por grupo. En grupo de 4, el ganador de A3 es 1°, el perdedor A3 2° clasificado y el ganador A4 3° no clasificado, aunque la tabla estadística empate; incorporar explicación visual sin alterar la lógica. Mantener la regla histórica del caso 3+3+4 (10 parejas).
- **Seguridad — AUDITORÍA INICIADA, PENDIENTE DE PROFUNDIZAR:** el repositorio es público; **no guardar secretos, claves privadas ni datos de usuarios en GitHub**. Revisar íntegramente credenciales, historial, control de acceso a API/RPC/vistas, políticas RLS, privilegios de funciones, protección del Admin/Auth, limitación de abusos y consultas/cancelaciones por código, Edge Functions, backups y restauración, supervisión y alertas. La primera revisión no intrusiva encontró RLS activado en todas las tablas de `public` y ninguna concesión de escritura directa a `anon`; esto NO equivale a una certificación de seguridad. **Los detalles específicos de posibles debilidades se mantienen fuera del repositorio público hasta corregirlas.** No modificar permisos ni desplegar migraciones de seguridad sin análisis de impacto y pruebas.
- **Forma de trabajo acordada:** avanzar de a un paso, consultar código real actualizado de GitHub y estado real de Supabase antes de corregir; explicar si cada SQL es de lectura o cambia datos y si debe guardarse en SQL Editor; registrar cambios, pruebas y pendientes en esta bitácora única. Al abrir un chat nuevo, indicar: **«Retomemos Boulevard Pádel desde `BITACORA_DESARROLLO.md`, sección 09/11/2026 — Pendientes al pausar pruebas de Liga y seguridad; primero leer el estado de `main` y consultar antes de cambiar producción»**.

## 09/11/2026 — Parche 83: Fechas automáticas de Liga y games en tablas

- **Fecha / motivo:** 09/11/2026 (Argentina). Tras conversación con Martín, el usuario solicitó añadir GF, GC y Dif.G a tablas de grupos y una referencia de abreviaturas; la Liga debe agrupar automáticamente todos los cruces en Fechas completas, mientras Martín programa libremente día/hora de cada partido. La tabla se actualiza a medida que ingresa resultados (mecanismo existente).
- **Aclaración deportiva:** 12 parejas en una rueda equivalen a **66 partidos, 11 Fechas de 6 partidos**, con una aparición de cada pareja por Fecha (no 11 partidos por Fecha). Con impares, hay una pareja libre por Fecha. La Fecha deportiva no exige que los partidos se disputen el mismo día.
- **CAMBIOS CONFIRMADOS EN RAMA:** `desarrollo/fechas-liga-tablas83-20261109`. Motor de grupos computa games normales (excluye STB), suma GF/GC/Dif.G sin alterar los desempates acordados (Pts → Dif. sets → SF). Admin y público incorporan 12 columnas y glosario de abreviaturas. Agrega explicación de A3/A4 para grupos de cuatro con dos zonas y conserva clasificación existente. Estilos responsive aislados en `css/torneos-tablas83.css`. Liga presenta solo Programar/Reprogramar y Cargar/Corregir resultado. El motor puro distribuye partidos en Fechas automáticamente.
- **SQL 83 PREPARADA, NO INSTALADA:** `sql/SQL_83_LIGA_FECHAS_AUTOMATICAS.sql`: actualiza `bp_league_generate_fixture` para asignar Fecha en el sorteo y ajusta RPC de reordenamiento a máximo un partido por pareja por Fecha. Un bloque de migración conserva cada cruce del fixture antiguo y asigna Fechas solo si TODOS sus partidos siguen sin Fecha, sin programar y sin resultados; si hay cambios parciales, evita reorganizar automáticamente. No toca reservas ni bloqueos, no modifica ganadores ni rivales. **Definitiva: SÍ conservar en GitHub; NO ejecutar ni guardar manualmente en Supabase SQL Editor; requiere autorización explícita antes de aplicar la migración.**
- **Estado productivo confirmado al revisar, SOLO LECTURA:** Liga `SUMA 14 - Temporada 2027`: 12 parejas aprobadas, 66 encuentros sin Fecha, 0 programados, 0 jugados. Simulación de distribución desde `match_number`: 11 Fechas x 6, cero colisiones de parejas. **Estos conteos podrían cambiar si Martín o el usuario sigue probando; volver a verificar antes de instalar SQL83.** Otros torneos y turnero no modificados.
- **Tests:** GitHub Actions 42642753280 en rama: **120/120 aprobadas**, sintaxis JavaScript OK, cobertura nueva de Liga con pares/impares, GF/GC excluyendo STB, glosario y resguardo del fixture. Se verificó compatibilidad de las pruebas históricas.
- **Pendiente:** revisión final de SQL83, autorización explícita de instalación, verificar conteos nuevamente y aplicar la migración de forma transaccional; luego publicar la rama a `main`, validar Cloudflare en móvil/escritorio, probar programa de encuentros y resultados reales, y actualizar bitácora. Conservar auditoría de seguridad pendiente de la sección del 09/11. No considerar estos cambios publicados en producción aún.

## 09/11/2026 — Cierre técnico del Parche 83: instalado y publicado

- **Fecha, motivo y confirmación:** 09/11/2026 (Argentina). El usuario autorizó expresamente instalar SQL83 y publicar los ajustes acordados con Martín: columnas informativas GF/GC/Dif.G en posiciones de grupos, leyendas de abreviaturas, explicación de A3/A4 y armado automático de Fechas para Liga. **CONFIRMADO: instalación técnica y publicación terminadas.**
- **SQL83 aplicada mediante migración:** `bp_sql83_liga_fechas_automaticas`, versión `20261109152118`. Archivo definitivo `sql/SQL_83_LIGA_FECHAS_AUTOMATICAS.sql` conservado en GitHub. **No ejecutar de nuevo ni guardar manualmente en SQL Editor.** La migración sustituye `bp_league_generate_fixture` para asignar una Fecha deportiva a cada ronda del sorteo y ajusta `bp_league_assign_round` a máximo un partido por pareja y Fecha. Mantiene validación de administrador; se comprobó `anon EXECUTE=false`.
- **Migración del fixture de prueba — CONFIRMADA:** la Liga `SUMA 14 - Temporada 2027`, 12 parejas aprobadas, mantiene sus 66 enfrentamientos distintos, ahora distribuidos en 11 Fechas de seis partidos. Sin cruces repetidos, sin parejas duplicadas por Fecha y sin modificación de rivales, días, horarios ni resultados preexistentes (ninguno estaba cargado al migrar). Los totales de la base antes/después permanecieron: **112 reservas, 33 bloqueos, 4 torneos y 38 parejas**.
- **GitHub/Cloudflare — CONFIRMADO:** PR #14 fusionado a `main`, commit `a5b45759bf277b6f2b34dff5ca98f946fe92bb14`; chequeo Cloudflare Pages de ese commit completado con éxito. Admin y sitio público incorporan GF/GC/Dif.G, glosario y diseño responsive, más aclaración de clasificación A3/A4. El sorteo de Liga organiza Fechas; Martín programa libremente día y hora de cada partido y se conserva la actualización de posiciones al cargar resultados.
- **Pruebas automatizadas — CONFIRMADAS:** ejecución GitHub Actions 42642753280, **120 aprobadas, 0 fallidas**, incluyendo verificación de sintaxis JavaScript y formatos de una rueda de Liga para cantidades pares/impares.
- **Pendiente de validación funcional por Martín / usuario:** entrar al Admin publicado, comprobar las 11 Fechas, programar/reprogramar un encuentro sin alterar otros, cargar/corregir un marcador y verificar estadísticas y vista pública. La Liga de prueba sigue `is_published=false` según último control; si desea verla públicamente, deberá publicarla desde Admin cuando corresponda. No generar datos ficticios por cuenta propia ni dar por cerrada la prueba real sin confirmación. Mantener pendiente la auditoría de seguridad y el desempate final para campeón de Liga.


## 09/11/2026 — Parche 84: glosarios compactos de las tablas de posiciones

- **Fecha / motivo / estado:** 09/11/2026 (Argentina). Mejorar las referencias demasiado extensas debajo de las tablas de posiciones en celular y computadora, tanto en Admin como en el sitio público. **CONFIRMADO: Parche 84 publicado en `main` y desplegado en Cloudflare. PENDIENTE: aprobación de Martín y sincronización de la laptop antes de eliminar la rama.**
- **Rama única de trabajo:** `desarrollo/referencias-compactas-20261109`, basada en `main` sincronizada al commit `0329855`. Se conserva hasta que el usuario y Martín aprueben la visual, se integre a `main` y la laptop quede sincronizada; **no eliminar la rama antes**.
- **Diseño:** glosario con abreviaturas y significados distribuidos en dos columnas para móvil, más columnas adaptables para escritorio, letra más pequeña y nota explicativa separada. Aplica a grupos y Liga, Admin y sitio público. La leyenda usa `standingsLegendItems` y `standingsLegendNote` en el motor común; mantiene el texto anterior de respaldo donde corresponde.
- **Archivos modificados:** `js/torneos-motor.js`, `js/admin-resultados.js`, `js/torneos-public.js`, `js/admin-liga82.js`, `js/torneos-liga-public82.js`, `css/torneos-tablas83.css`. No se modificaron motor de Liga, cálculo de marcadores, turnero, archivos SQL ni funciones de Supabase.
- **Pruebas adaptadas a Prettier:** `tests/torneos-eliminatorias80.test.js`, `tests/torneos-fechas83.test.js`, `tests/torneos-liga-integracion82.test.js` y `tests/torneos-seguimiento71.test.js`. Se corrigieron expectativas de espacios y saltos de línea, sin suprimir verificaciones deportivas. Se agregó una prueba específica del Parche 84 (las cuatro vistas y CSS responsive). La validación en entorno local terminó con **121 pruebas aprobadas, 0 fallidas** y sintaxis JS comprobada. `git diff --check` sin observaciones.
- **Paquete de integración:** ZIP de actualización selectiva generado a partir de los archivos modificados, **sin `.git`, secretos ni otra copia completa del proyecto**. Se debe incorporar a la carpeta única de BoulevardPadel que ya existe en la laptop; revisar y ejecutar tests allí antes de publicar.
- **Pendiente:** importar los archivos corregidos en la rama local, verificar 121 pruebas, validar visual en móvil/escritorio, publicar en GitHub/Cloudflare únicamente tras revisión; requerir OK de Martín antes de eliminar la rama. No se realizó ninguna escritura remota durante este Parche 84.

### Cierre de publicación del Parche 84 — 09/11/2026

- **Estado — CONFIRMADO:** tras incorporar el ZIP selectivo a la laptop, el usuario ejecutó **121 pruebas, 121 aprobadas y 0 fallidas**, y revisó la grilla compacta en móvil local. Ajustó el mensaje del grupo a «Grupo completo. Clasifican dos parejas.» y actualizó la prueba correspondiente, conservando intacto el criterio deportivo de clasificación.
- **GitHub — CONFIRMADO:** commit de rama `ea816190361040e41d399280ba43db0d628f0555`; PR **#15** fusionado a `main` en el commit `e505f1f863de471c06a18cab3aace7fa0a7f2683`. El usuario revisó y aprobó también el diseño de escritorio en el despliegue Preview.
- **Cloudflare — CONFIRMADO:** compilación y despliegue de producción del merge `e505f1f` finalizados con estado **success**. Sitio oficial actualizado. No se aplicó ninguna SQL ni se cambió Supabase.
- **Pendientes:** sincronizar `main` en la laptop, probar el sitio oficial con Martín y **conservar sin eliminar** la rama `desarrollo/referencias-compactas-20261109` tanto local como remota hasta tener conformidad expresa de Martín y sincronización final. Mantener pendientes previos de la auditoría de seguridad de torneos y desempates.


## 09/11/2026 — Parche 85: selectores de horario en 24 horas

- **Fecha / motivo / estado:** 09/11/2026. La ventana «Programar partido» mostraba AM/PM en Chrome. **CONFIRMADO: 124 pruebas aprobadas, revisión visual aprobada, PR #16 fusionado a `main` y Cloudflare producción en estado success.**
- **Diagnóstico:** `input type="time"` usa las preferencias regionales del navegador, por lo que `lang="es-AR"` no asegura visualización `HH:mm`.
- **Solución:** reemplazo de los campos de hora de Liga y eliminatorias por selectores `<select>` con opciones explícitas en formato 24 horas, como en grupos. Liga mantiene 00:00–23:30 cada 30 minutos (rango original); eliminatorias conserva 09:00–23:30 cada 30 minutos. Se preservan IDs, precarga del horario programado, parámetros RPC y las validaciones actuales. Sin cambios SQL, Supabase ni turnero.
- **Archivos:** `admin/index.html`, `js/admin-liga82.js`, `js/admin-eliminatorias-partidos68.js`, nueva prueba `tests/torneos-horarios85.test.js`.
- **Rama:** `desarrollo/horarios-24h-20261109` basada en `main` `ae9159e`. Pendientes: pruebas locales completas, revisión visual Preview, aprobación antes de fusionar. Conservar la rama anterior Parche 84 hasta el OK de Martín.


### Cierre de publicación — Parche 85 (09/11/2026)

- **Local — CONFIRMADO:** `node --test tests/*.test.js` ejecutado por el usuario, **124/124 pruebas exitosas**, 0 fallidas. Verificación visual del selector de Liga en Cloudflare Preview aprobada por el usuario.
- **Auditoría de código — CONFIRMADA:** revisión de archivos HTML y JavaScript del proyecto; los formularios que seleccionan horas utilizan opciones `HH:mm` o controles de texto con validación de 24 horas. No hay selectores nativos `input type="time"` restantes en los formularios inspeccionados.
- **GitHub — CONFIRMADO:** commit de desarrollo `e66e1f6c488d5f15fc380714f0f73a45d7d7edea`, Pull Request **#16** integrado a `main` como `2c7a421552ce6fcd79bcadfd07d97661e6d77edb`.
- **Cloudflare — CONFIRMADO:** despliegue de producción del merge `2c7a421` completado correctamente (`success`). Sin cambios en SQL ni Supabase.
- **Pendiente de equipo:** actualizar `main` local mediante `git switch main`, `git pull --ff-only origin main` y `git status -sb`. Mantener ramas de desarrollo Parche 84 y Parche 85 hasta la aprobación final de Martín; no eliminarlas por el momento.


## 09/11/2026 — Parche 86: rivales de Liga en tres renglones (Admin y público)

- **Fecha / motivo / estado:** 09/11/2026. Solicitud del usuario para mejorar la lectura de los partidos agrupados por Fecha. **PREPARADO EN DESARROLLO; PENDIENTES PRUEBAS LOCALES Y REVISIÓN VISUAL ANTES DE PUBLICAR.**
- **Implementación:** tarjetas de Liga muestran nombre de pareja 1, separador `vs` centrado, y nombre de pareja 2 en tres renglones, nombres con negrita y `vs` pequeño (`0.72rem`, peso `400`). Se conservan la disposición responsive y la tipografía verde/dorada.
- **Alcance:** Admin `js/admin-liga82.js`, `css/admin-liga82.css`; público `js/torneos-liga-public82.js`, `css/torneos-liga82.css`. Los nombres se insertan como texto, sin HTML dinámico. No altera fechas, horarios, resultados, botones ni consultas Supabase.
- **Control de regresión:** `tests/torneos-rivales86.test.js` agrega tres pruebas estructurales. No se modifican SQL, reservas, grupos o eliminatorias.
- **Rama:** `desarrollo/rivales-liga-20261109` desde `main` `2a8a3ef`; publicar únicamente tras pruebas y conformidad visual del usuario. Conservar las ramas anteriores pendientes del OK final de Martín.
