# Boulevard Pádel — Respaldo externo en Google Drive (13/11/2026)

## 13/11/2026 — Drive de BP conectado: copia inicial real y actualización programada

**Drive verificado:** la cuenta conectada es `boulevardpadelvila@gmail.com`, del propio Boulevard Pádel. Se creó **una planilla nativa de Google Sheets** en ese Drive (sin usar cuentas personales):

<https://docs.google.com/spreadsheets/d/1ZO1QlRvVrfwlDMBb9QpuXfyfD8IQm7ewMb5Uw6MzUys/edit>

**Primera copia confirmada:** pestaña `Reservas` (31 registros confirmados, 32 filas con encabezado) y pestaña `Turnos fijos` (3 solicitudes aprobadas, 4 filas con encabezado). En cada pestaña figuran **exactamente cuatro columnas: Nombre, Día, Hora y Teléfono**. Se verificaron encabezados, cantidad de filas, ausencia de valores vacíos, filtros y zona horaria `America/Argentina/Cordoba`.

**Automatización habilitada:** se creó una tarea recurrente de ChatGPT denominada `Respaldo Boulevard Pádel`, de frecuencia **HOURLY**, que debe leer Supabase únicamente en modo lectura y actualizar ambas pestañas con una operación conjunta a través de la conexión privada de Google Drive. **Esta tarea depende de las conexiones activas de ChatGPT a Supabase y Google Drive**; no es una función autónoma de Cloudflare, GitHub, Apps Script ni un job del propio Supabase. Debe conservar la última copia si hay fallos, datos incompletos, un vaciado sospechoso o pérdida de acceso. **Al escribir este bloque, la primera ejecución futura aún NO se verificó**: es correcto decir «tarea programada», no «sincronización automática comprobada». Próxima ejecución prevista por la plataforma: 13/11/2026, aproximadamente 18:59 hora de Argentina.

**Recuperación ante caída:** abrir el enlace de Google Sheets desde la cuenta de BP, consultar los registros ya copiados; no sobrescribir ni borrar la copia en caso de un fallo de origen. El PDF de torneos continúa siendo **manual** mediante «PDF del torneo» en el Admin y debe guardarse en el Drive de BP. Los botones CSV siguen disponibles como copia manual adicional.

**Pendiente de validación técnica:** comprobar la primera ejecución y una variación real de datos, además de verificar que las conexiones sigan activas. No se alteraron datos del turnero ni se ejecutaron cambios SQL en producción para esta integración.

---


## Estado original de la fase manual (histórico)

> Las indicaciones «pendiente de conectar Drive» de esta sección describen el estado anterior al alta de la planilla y la tarea. El estado vigente está arriba.

## Estado real

- **IMPLEMENTADO en Admin:** exportación manual de **reservas confirmadas** y **turnos fijos aprobados** a CSV; cada archivo presenta **exactamente cuatro columnas**: Nombre, Día, Hora, Teléfono.
- **IMPLEMENTADO en Admin:** botón «PDF del torneo» en cada torneo. Abre una página de informe preparada para imprimir en A4, el navegador muestra «Guardar como PDF». Incluye parejas y resultados disponibles de Grupos/Eliminatorias o Liga, **sin teléfonos**.
- **PENDIENTE DE ACTIVAR:** creación y sincronización **automática** de una hoja nativa de Google Sheets dentro de la **cuenta Google de Boulevard Pádel**. Esa cuenta **no está conectada** al Google Drive disponible; hay conexión únicamente a otras cuentas. La exportación actual **descarga archivos al dispositivo** y **NO los sube a Drive** ni ejecuta tareas en segundo plano.

## Contenido y uso operativo

### Reservas

En Admin → Reservas → «Exportar reservas (CSV)». Salen todas las reservas cuyo estado almacenado sea `confirmed`, tanto actuales como futuras e históricas aún conservadas; **no** reservas canceladas. Las reservas marcadas «Finalizada» por la interfaz siguen estando confirmadas en base de datos y pueden aparecer.

| Nombre | Día | Hora | Teléfono |
|---|---|---|---|
| Nombre original de la reserva | dd/mm/aaaa | HH:mm (hora Argentina) | Contacto original de la reserva |

Fuente primaria `reservations.booking_name` y `booking_phone`, con respaldo en `customers.full_name`/`phone` para registros históricos. Sin código de reserva, correo, observaciones, estado ni datos técnicos. La descarga incluye todas las páginas; nunca se trunca silenciosamente a 1000 filas.

### Turnos fijos

En Admin → Turnos fijos → «Exportar turnos fijos (CSV)». Se incluyen únicamente solicitudes con estado `approved`; se excluyen pendientes, finalizadas, rechazadas y canceladas. «Día» es el **día habitual semanal** (p. ej., Miércoles), no una fecha concreta.

| Nombre | Día | Hora | Teléfono |
|---|---|---|---|
| Nombre del cliente | Lunes…Domingo | HH:mm | Contacto del cliente |

### Torneos

En Admin → Torneos, cada tarjeta muestra «PDF del torneo». El informe contiene el nombre, estado, parejas inscriptas aprobadas y resultados disponibles en fase de grupos/eliminatorias o Liga. Para un torneo aún en curso se indica «datos provisionales». **No incluye teléfonos.** El botón abre el informe y solicita impresión: en el navegador hay que elegir **«Guardar como PDF»**.

## Guardar en Drive (procedimiento manual vigente)

1. Entrar al Admin mientras el sitio y Supabase funcionan y generar los CSV/PDF.
2. Ingresar a Google Drive **con la cuenta de Boulevard Pádel** y subir los archivos a una carpeta privada «Respaldos Boulevard Pádel».
3. Importar los dos CSV en una hoja nativa de Google Sheets (pestañas «Reservas» y «Turnos fijos»), si se quiere una planilla centralizada. Configurar «Teléfono» como texto para preservar signos y ceros iniciales.
4. Verificar la hora de la última copia. Guardar versiones con fecha en vez de sobrescribir irreversiblemente la anterior.

**Aviso:** Una exportación manual no garantiza respaldo reciente si el sistema falla antes de realizarla. Las hojas y PDF ya almacenados en Drive seguirán disponibles cuando Cloudflare, GitHub o Supabase estén caídos. Mientras no exista sincronización automática, acordar una rutina manual de respaldo.

## Siguiente fase — automatización externa pendiente

Cuando el Drive de la **cuenta BP** esté conectado y su titular autorice la configuración, crear UNA hoja de Google Sheets en ese Drive (reservas y turnos fijos, cuatro columnas cada una) y programar actualizaciones con historial de versiones y alerta de errores. La ejecución debe funcionar **independientemente del navegador Admin**. No publicar teléfonos en la web ni usar `service_role` en el frontend, repositorio o un Apps Script con permisos amplios; utilizar un puente de lectura restringida con secreto privado, política de acceso por mínimo privilegio y sin columnas adicionales. Probar una actualización real y el funcionamiento cuando falla una sincronización, antes de declarar el respaldo «automático».

## Seguridad

Los datos personales descargados se gestionan únicamente por administradores autenticados. El CSV protege contra interpretación de nombres o teléfonos como fórmulas de planilla. El PDF HTML escapa caracteres potencialmente maliciosos. Ninguno de los exportadores realiza escrituras a Supabase o llamadas a Google Drive; no guarda credenciales.
