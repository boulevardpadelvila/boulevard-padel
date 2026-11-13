# Boulevard Pádel — Reglamento aprobado 12/11/2026

Estado al 12/11/2026: **IMPLEMENTADO Y PUBLICADO**, PR #21 y migraciones SQL90/91/92 aplicadas. La modalidad de **6 parejas pasó una prueba manual end-to-end en producción**; falta verificar especialmente 7 parejas y otras configuraciones con pruebas reales. Preservar reservas, turnos fijos y datos productivos.

## Liga
- Todos los partidos al mejor de tres sets NORMALES, sin STB. Esto incluye fase regular, semifinales y final.
- Ganador por 2-0 o 2-1: 2 puntos. Perdedor 1-2: 1 punto. Perdedor 0-2: 0 puntos.
- Clasifican cuatro. Semifinal 1° vs 3° y 2° vs 4°. Final entre ganadores, sin tercer puesto.

## Grupos y eliminatorias (6 a 40 parejas)
1. Sorteo aleatorio, transparente, imparcial, sobre parejas aprobadas.
2. Mayor cantidad posible de grupos de tres. Cuando existan grupos de cuatro, se ubican primero (A, B, C...). Ejemplo 10: A4, B3, C3. Ejemplo 11: A4, B4, C3.
3. Zona de 3: todos contra todos, 3 partidos, clasifican 2.
4. Zona de 4: 2 cruces iniciales, luego ganadores vs ganadores y perdedores vs perdedores; 4 partidos en total, clasifican 3. Posiciones por TABLA, nunca por rama de cruces.
5. Ganar 2-0 o 2-1: 2 puntos. Perder 0-2 o 1-2: 0 puntos.
6. Solo en grupos: STB como tercer set. En TODAS las rondas posteriores: sets normales.
7. Desempates: puntos, diferencia de sets, diferencia de games, enfrentamiento directo si existió; finalmente Martín resuelve expresamente. Los empates múltiples no pueden resolverse con un orden arbitrario. STB suma un set, no games.
8. Mantener las llaves del simulador aprobado para 6..40, incluyendo los patrones explícitos de 6..14 y la generación automática de 15..40.
9. Priorizar pases directos para 1° de las zonas de 4 (A, B...). Sin zonas de cuatro, seguir las etiquetas del simulador (9 parejas: 1° A y 1° B directos a semifinales).
10. Publicar todos los posibles cruces de la llave junto al fixture de grupos, aun sin conocer clasificados.
11. Martín registra manualmente marcadores ante abandono, retiro o inasistencia (por ejemplo 6-0 6-0); el sistema no exige motivos de resultados.
12. Sin partido por tercer puesto en ninguna modalidad.

## Estado de implementación y validación (12/11/2026)

- Motor puro `js/torneos-reglamento-2026.js` compartido con el simulador, con planes de 6 a 40 parejas.
- Admin y web pública integrados en `main`, con clasificación oficial, corrección de resultados, rondas, marcadores, programación segura (SQL92) y podio.
- Migraciones SQL90 (reglamento/llaves), SQL91 (sets normales Liga) y SQL92 (programación eliminatoria / bloqueos seguros) **instaladas** en Supabase. No aplicar de nuevo manualmente.
- Prueba de **6 parejas** realizada con 6 encuentros de grupo, empate triple y desempate manual, semifinales y final; datos/resultados verificados por lectura SQL. El torneo ficticio quedó `completed` y al cierre estaba **oculto** (`is_published=false`), pendiente de eliminación consensuada.
- Pruebas automáticas aprobadas en Node, PostgreSQL 17 aislado y Chromium, incluyendo llave larga de 31 partidos y vistas responsive; PR #29 publicado y Cloudflare Pages verificado.
- **Pendiente**: prueba manual con **7 parejas**, grupos A=4/B=3, 3 y 2 clasificadas, llave de 5 parejas, semis/final, público/móvil; no confundir cobertura automatizada de 6–40 con validación manual de todos los tamaños.
- La documentación histórica que indique «desarrollo» o «sin migrar» refleja el punto de partida del 12/11 y no el estado actual. Ver `ESTADO_ACTUAL.md` y el final de `BITACORA_DESARROLLO.md`.
