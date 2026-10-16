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
