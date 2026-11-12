# Boulevard Pádel · Reglamento deportivo aprobado 12/11/2026

**Estado:** definiciones deportivas cerradas por el usuario en acuerdo con Martín. La implementación técnica completa se valida por separado; este archivo no demuestra que las reglas estén activas en producción.

## Liga
- Todos los partidos, incluida la fase regular, semifinales y final, se disputan al mejor de **3 sets normales**. No se utiliza súper tie-break.
- Victoria: **2 puntos**. Derrota 1–2: **1 punto**. Derrota 0–2: **0 puntos**.
- Clasifican las primeras cuatro: semifinales **1° vs. 3°** y **2° vs. 4°**; sus ganadoras disputan la final.
- No hay partido por terceros puestos. Campeones y subcampeones se determinan únicamente con la final oficial.
- El historial anterior con súper tie-break se conserva tal cual; la modificación del formato rige para nuevas cargas.

## Grupos + eliminatorias · 6 a 40 parejas
- El sorteo de parejas se realiza con asignación aleatoria, exclusivamente entre parejas aprobadas. Priorizar zonas de 3 y colocar las zonas de 4 al comienzo (A, B, C…). Ej.: 10 = A4 + B3 + C3; 11 = A4 + B4 + C3.
- Zona de 3: todos contra todos (3 encuentros); clasifican 2.
- Zona de 4: dos encuentros iniciales, después ganadoras vs. ganadoras y perdedoras vs. perdedoras (4 encuentros); clasifican 3. **Los puestos se ordenan por tabla y desempates, nunca automáticamente por el resultado de un cruce A3/A4.**
- **Solo fase de grupos:** al quedar 1–1 en sets normales, se define con un súper tie-break a 10, por dos de ventaja; cuenta como set ganado, no suma games. **Todas las eliminatorias posteriores:** tercer set normal.
- Victoria en grupo 2 puntos, derrota 0 puntos, independientemente de 2–0 o 2–1.
- Orden de clasificación de grupo: 1) puntos; 2) diferencia de sets; 3) diferencia de games; 4) enfrentamiento directo si las dos parejas empatadas disputaron ese encuentro; 5) igualdad no resuelta: decisión de Martín. Si hay empate de 3 o más, no se resuelve automáticamente por resultados parciales del grupo de empate.
- Pases directos: se priorizan **primeros puestos de zonas de 4**, empezando por A, B…; cuando no haya zonas de 4 o queden más plazas libres, rige la distribución alfabética/posicional del simulador. Para nueve parejas, 1° A y 1° B reciben pases a semifinales, mientras 1° C juega previa.
- Mantener el diagrama de cruces del simulador para 6–40, incluidas sus rondas preliminares, y publicar la **estructura completa de cruces futuros** junto con el fixture, aunque los clasificados sean desconocidos.
- No habrá partido por tercer o cuarto puesto.
- Inasistencia, abandono o retiro: Martín registra el marcador correspondiente. Una derrota por W.O. o abandono puede constar como 6–0, 6–0; el sistema no requiere un motivo de marcador ni un estado deportivo especial. Para retiro definitivo, los encuentros pendientes se resuelven individualmente por marcador administrativo.

## Protección de producción
- No alterar ni eliminar reservas reales, turnos fijos, clientes, horarios, cupos o datos históricos por cambios deportivos.
- Programar partidos solo después de consultar disponibilidad real de cancha y protegerla con bloqueo transaccional. Ningún borrador o vista previa debe reservar cancha.
- Registrar un empate con decisión administrativa antes de confirmar los participantes de la siguiente ronda.
- Verificar 35 tamaños de torneo, pruebas de set/games, acceso de administrador, vista pública sin datos privados y no-regresión de reservas antes de publicar.

## Pendiente técnico a distinguir del reglamento
El motor deportivo aprobado y el simulador pueden existir antes de contar con la persistencia generalizada de llaves. El legado SQL80 admite solo cuatro o siete clasificadas. No usar esa estructura para otros tamaños ni modificar producción hasta disponer de programación, resultados, publicación pública y protecciones transaccionales verificadas para todo 6–40.
