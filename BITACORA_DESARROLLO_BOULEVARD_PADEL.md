# Bitácora de Desarrollo — Boulevard Pádel

## Proyecto
**Boulevard Pádel — Sitio web, turnero, portal Admin y torneos**

**Frontend:** HTML / CSS / JavaScript  
**Hosting:** Cloudflare Pages  
**Repositorio:** GitHub — `boulevard-padel`  
**Backend:** Supabase / PostgreSQL  
**Estado general:** Turnero público funcional; cierre final en curso antes de iniciar portal Admin

---

# 11/10/2026 — Inicio de la etapa definitiva

## Objetivo de la sesión
Comenzar la implementación real del sistema de reservas, definir una base sólida en Supabase y dejar preparado el backend antes de modificar el turnero público o construir el portal Admin.

## Decisiones tomadas
- Mantener el website público actual, ya aprobado por el cliente.
- No avanzar todavía con la sección pública de **Campeonatos y Torneos** hasta dejar terminado y estable el sistema de reservas y el portal Admin.
- Utilizar **Supabase/PostgreSQL** como backend definitivo.
- Mantener GitHub + Cloudflare Pages separados de Supabase; no conectar el repositorio directamente a Supabase.
- Configurar las tablas con **RLS habilitado** desde el inicio.
- No exponer automáticamente las tablas nuevas mediante Data API.
- El turnero mostrará por defecto desde hoy hasta **2 meses** si el Admin no establece un límite manual.
- El Admin podrá definir fecha inicial y fecha final del período habilitado para reservas.
- La duración provisoria de cada turno es de **90 minutos**.
- La configuración inicial provisoria de la cancha es de **lunes a domingo de 09:00 a 22:30**, permitiendo como último turno **21:00 a 22:30**.
- Los horarios son provisorios y luego serán completamente administrables desde el portal Admin.
- El Admin podrá bloquear días completos, semanas, eventos, mantenimiento o franjas horarias puntuales.
- El sistema queda preparado para múltiples canchas, aunque actualmente Boulevard Pádel tiene una sola.
- Los usuarios podrán solicitar turnos fijos por período determinado o indeterminado; la aprobación definitiva quedará a cargo del Admin.

## Supabase
Se creó el proyecto:

- **Organización:** Boulevard Pádel
- **Proyecto:** `boulevard-padel`
- **Plan:** Free
- **Región:** South America (São Paulo)
- **Data API:** habilitada
- **Automatically expose new tables:** deshabilitado
- **Automatic RLS:** habilitado
- **Estado:** Healthy

## Consultas SQL creadas

### 01_base_inicial_boulevard_padel
Se creó la estructura inicial del sistema:

- `profiles`
- `courts`
- `booking_settings`
- `weekly_hours`
- `customers`
- `fixed_turn_requests`
- `reservations`
- `blockouts`

También se crearon:

- enums para roles y estados;
- función automática `updated_at`;
- triggers de actualización;
- RLS en todas las tablas;
- función `is_admin()`;
- políticas iniciales para administración;
- configuración inicial del turnero;
- cancha inicial `Cancha 1`.

## Usuario administrador
Se creó un usuario en Supabase Authentication para Boulevard Pádel y se vinculó con `public.profiles`.

### 02_crear_admin_boulevard_padel
Perfil creado como:

- **Nombre:** Administrador Boulevard Pádel
- **Rol:** `admin`
- **Activo:** `true`

## Horarios provisorios

### 03_horarios_provisorios_cancha_1
Se cargaron 7 registros en `weekly_hours`, uno por cada día de la semana:

- Lunes a Domingo
- Apertura: **09:00**
- Cierre: **22:30**
- Estado: abierto

Con duración de 90 minutos, los turnos generados son:

- 09:00
- 10:30
- 12:00
- 13:30
- 15:00
- 16:30
- 18:00
- 19:30
- 21:00

## API pública del turnero

### 04_api_publica_turnero
Se crearon funciones públicas controladas para evitar acceso directo a tablas:

- `get_booking_config()`
- `get_available_slots(date)`

Estas funciones permiten consultar:

- período habilitado de reservas;
- duración del turno;
- zona horaria;
- disponibilidad real por fecha;
- reservas existentes;
- bloqueos activos.

Las tablas continúan protegidas mediante RLS.

## Pruebas iniciales

### 05_pruebas_api_turnero
Se verificó correctamente:

- ventana por defecto de 2 meses;
- duración de 90 minutos;
- zona horaria `America/Argentina/Cordoba`;
- generación de 9 horarios diarios;
- conversión correcta entre horario local de Argentina y UTC.

## Creación segura de reservas

### 06_api_crear_reserva
Se creó la función:

`create_booking(...)`

La función valida:

- nombre;
- teléfono;
- período habilitado;
- horario de apertura y cierre;
- duración del turno;
- turnos válidos del calendario;
- horarios pasados;
- bloqueos;
- reservas ya existentes;
- superposición de turnos.

También:

- crea o actualiza el cliente;
- genera un código de reserva `BP-XXXXXXXX`;
- guarda la reserva como `confirmed`;
- registra origen `web`;
- evita doble reserva incluso ante solicitudes simultáneas.

## Prueba de reserva real

### 07_prueba_reserva_real
Se creó correctamente una reserva de prueba:

- **Cliente:** Cliente de Prueba
- **Teléfono:** +543492000000
- **Horario:** 09:00 a 10:30
- **Código:** `BP-8ECDC367`

Resultados comprobados:

- la reserva se guardó correctamente;
- se creó el cliente;
- el horario de 09:00 dejó de aparecer en `get_available_slots()`;
- al intentar reservar nuevamente el mismo horario, el sistema devolvió correctamente:

`Este horario acaba de ser reservado`

Esto confirma que la protección contra doble reserva funciona.

## Estado actual
El núcleo del backend del turnero ya funciona en Supabase:

- configuración;
- horarios;
- disponibilidad;
- clientes;
- reservas;
- bloqueo de superposición;
- Admin inicial;
- RLS;
- API pública controlada.

El website todavía utiliza el turnero simulado del frontend y aún no está conectado a Supabase.

## Próximo paso recomendado
1. Conectar `reservar.html` y `reservas.js` a Supabase.
2. Reemplazar la disponibilidad ficticia por `get_available_slots()`.
3. Reemplazar la confirmación simulada por `create_booking()`.
4. Rediseñar la selección de fechas para soportar hasta 2 meses de manera cómoda, preferentemente mediante calendario mensual.
5. Probar reservas reales desde la web local.
6. Recién después comenzar el portal `/admin`.

## Pendientes posteriores
- Portal Admin.
- Gestión visual de horarios por día.
- Bloqueos por rango de fechas y horarios.
- Solicitudes y aprobación de turnos fijos.
- Reprogramación y cancelación de reservas.
- Dashboard de reservas.
- Clientes.
- Configuración del período visible del turnero.
- Sección pública **Campeonatos y Torneos**.
- Administración de eventos, categorías, zonas, fixture, resultados, tablas y llaves.

---

## Convención para próximas sesiones
En cada jornada registrar:

- fecha;
- objetivo;
- cambios realizados;
- decisiones tomadas;
- pruebas efectuadas;
- errores o bloqueos;
- estado actual;
- próximo paso.

# 11/10/2026 — Integración real del turnero público y cancelaciones

## Objetivo de la sesión
Conectar el turnero público a Supabase, reemplazar la lógica simulada por reservas reales, completar el ciclo de vida de una reserva y dejar el frontend prácticamente cerrado antes de comenzar el portal Admin.

## Cambios realizados

### Integración frontend ↔ Supabase
Se creó y configuró `js/supabase-config.js` con la URL del proyecto y la Publishable Key pública.

`reservar.html` carga, en este orden:

1. Supabase JS v2 desde CDN;
2. `js/supabase-config.js`;
3. `js/reservas.js`.

Se detectó y corrigió inicialmente un error `404` porque `supabase-config.js` no estaba en la ruta esperada.

### Rediseño de selección de fechas
Se descartó el selector nativo `<input type="date">` porque visualmente no resultaba coherente con el diseño original.

Se recuperó el estilo anterior del turnero con tarjetas de fecha y se lo conectó al backend real:

- tarjetas horizontales;
- desplazamiento lateral;
- flechas en escritorio;
- desplazamiento táctil en móvil;
- rango dinámico obtenido desde `get_booking_config()`;
- por defecto: hoy + 2 meses;
- selección de fecha → consulta real de horarios mediante `get_available_slots(date)`.

### Reserva real desde la web
El flujo público quedó operativo:

1. elegir fecha;
2. elegir horario;
3. completar nombre y teléfono;
4. confirmar reserva;
5. persistir la reserva en Supabase;
6. mostrar confirmación real con código de reserva.

Se verificó correctamente que un horario reservado deja de aparecer inmediatamente en la disponibilidad pública.

## Consulta y cancelación de reservas

### 08_consulta_y_cancelacion_reservas
Se agregó a `booking_settings`:

- `cancellation_hours_before` = **12**.

Se crearon las funciones públicas controladas:

- `get_booking_by_code(text)`;
- `cancel_booking_by_code(text)`.

La consulta pública se realiza únicamente mediante código de reserva. No se utiliza teléfono para cancelar, ya que el código funciona como llave privada de gestión de la reserva.

Regla acordada:

- cualquier persona que posea el código puede consultar y gestionar esa reserva;
- el código puede compartirse entre integrantes del mismo grupo;
- si se pierde el código, el usuario debe comunicarse con Boulevard Pádel;
- no existe recuperación automática por teléfono.

### 09_codigo_reserva_seguro
Se reforzó el formato del código de reserva.

Formato actual:

`BP-XXXX-XXXX-XXXX`

Ejemplo validado:

`BP-E06B-0167-3635`

Se creó `generate_booking_code()` para generar códigos aleatorios y comprobar que no exista un código igual antes de utilizarlo.

La restricción `UNIQUE` de `reservation_code` continúa funcionando como protección adicional.

Durante esta modificación se detectó un error en `create_booking()` por usar `wh.day_of_week`, columna inexistente.

Se corrigió utilizando:

- `weekly_hours.weekday`;
- filtro adicional por `court_id`.

### 10_fix_cancelacion_reserva
Se detectó el error PostgreSQL:

`column reference "reservation_code" is ambiguous`

Se corrigió `cancel_booking_by_code()` calificando explícitamente las columnas de `reservations` mediante alias.

Después de la corrección, la cancelación funcionó correctamente.

## Pantalla de confirmación
El código de reserva ahora tiene mayor protagonismo visual.

Se agregó:

- mensaje claro indicando que debe conservarse;
- advertencia de que quien posea el código podrá gestionar la reserva;
- botón **Copiar código**;
- botón **Compartir**;
- fallback al portapapeles si el navegador no dispone de Web Share API;
- indicación de contactar a Boulevard Pádel si se pierde el código.

## Consultar / cancelar reserva
Se incorporó una nueva vista pública accesible desde el turnero mediante:

**Consultar / cancelar**

El usuario ingresa únicamente el código de reserva.

La vista muestra:

- código;
- estado;
- fecha;
- horario;
- disponibilidad o no de cancelación online.

Si la reserva ya está cancelada, no se muestra nuevamente el botón de cancelación.

Se agregó como refuerzo CSS:

`.booking-manage__cancel[hidden] { display: none !important; }`

## Cancelación online
Regla definitiva actual:

- más de 12 horas antes → permite cancelar;
- exactamente 12 horas antes → permite cancelar;
- menos de 12 horas antes → bloquea la cancelación y solicita contactar a Boulevard Pádel.

Pruebas realizadas:

- **menos de 12 h:** bloqueado correctamente;
- **más de 12 h:** habilitado correctamente;
- **exactamente 12 h:** `can_cancel = true` verificado mediante transacción temporal con `ROLLBACK`.

Cuando se cancela:

- la reserva permanece en la base;
- `status` pasa a `cancelled`;
- no se elimina historial;
- el horario vuelve a aparecer inmediatamente como disponible en el turnero.

## Modal de cancelación
Se reemplazó `window.confirm()` por un modal propio acorde a la identidad visual del sitio.

El modal incluye:

- fecha;
- horario;
- explicación de que el turno volverá a quedar disponible;
- botón **Volver**;
- botón **Confirmar cancelación**;
- cierre mediante `×`;
- cierre haciendo clic fuera;
- cierre mediante tecla `Esc`.

## Botones de gestión
En la pantalla de consulta se reorganizaron los botones en una misma fila:

- izquierda: **Volver al turnero**;
- derecha: **Cancelar turno**.

## Hacer otra reserva
Se eliminó `window.location.reload()`.

Ahora el botón **Hacer otra reserva**:

- reinicia el estado del turnero sin recargar la página;
- limpia formulario, fecha y horario seleccionados;
- vuelve a bloquear los pasos correspondientes;
- conserva las fechas cargadas;
- vuelve suavemente al inicio del turnero.

Esto corrigió el problema de restauración incorrecta del scroll en dispositivos móviles.

## Responsive validado
Se revisó el flujo público completo en:

- **390 × 844 px**;
- **430 × 932 px**;
- **768 × 1024 px**.

Resultado: diseño y funcionamiento correctos en celular y tablet.

## Pruebas funcionales completadas
Se validó correctamente:

- carga de configuración desde Supabase;
- calendario dinámico;
- horarios disponibles reales;
- reserva desde frontend;
- bloqueo de doble reserva;
- generación de código robusto;
- copiar código;
- compartir código;
- consulta por código;
- cancelación válida;
- bloqueo de cancelación a menos de 12 h;
- cancelación exacta a 12 h;
- estado `cancelled` persistente;
- liberación automática del horario;
- reinicio del turnero para una nueva reserva;
- responsive móvil/tablet.

## Estado actual
El turnero público está **funcionalmente completo en su núcleo**.

Antes de declararlo cerrado y comenzar `/admin`, quedan dos tareas:

1. implementar protección contra abuso/bots con **Cloudflare Turnstile**;
2. realizar prueba integral final y limpiar reservas/clientes de prueba.

## Cloudflare Turnstile — estado de avance
Se ingresó al dashboard de Cloudflare de Boulevard Pádel y se localizó:

**Application security → Turnstile**

La implementación todavía no comenzó.

Criterio acordado:

- Turnstile se utilizará al momento de confirmar una nueva reserva;
- la Site Key podrá utilizarse en frontend;
- la Secret Key nunca se expondrá en HTML/JavaScript/GitHub;
- la validación deberá realizarse de forma segura antes de aceptar la reserva.

## Próximo paso exacto
Retomar desde:

**Cloudflare Dashboard → Application security → Turnstile**

Crear/configurar el widget para Boulevard Pádel y luego integrar la validación segura en el flujo de `create_booking()`.

Después:

1. prueba integral final del turnero;
2. limpieza de reservas y clientes de prueba;
3. actualización final de esta bitácora;
4. comenzar portal `/admin`.

---
