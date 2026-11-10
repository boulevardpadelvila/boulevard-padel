# Archivo técnico · Eliminatorias generalizadas (trabajo no publicado)

**Fecha de archivo:** 10/11/2026.  
**Origen:** `desarrollo/eliminatorias-generalizadas-20261107`, commit `a21dad931fd7b773c45b7c14b900834b64cdba54`.  
**Estado:** referencia histórica **NO integrada** al motor de producción ni validada como nueva modalidad.  
**Objetivo:** conservar sin pérdida el único bloque experimental que esa rama añadió, antes de retirar una rama Git obsoleta.

La rama incorporaba un helper de diagnóstico de tamaños de grupos de 3/4 parejas, clasificados, cruces y pases de ronda. **No constituye un formato deportivo aprobado** ni implementa una eliminatoria completa para cinco clasificados. No debe copiarse a `main` sin revisar nuevamente las reglas acordadas con Martín, diseñar el comportamiento UI/DB y crear pruebas.

## Código original conservado literalmente

```js
  // Etapa 80 (solo desarrollo): contar grupos y clasificados sin asumir 3,3,4.
  // Los pasos concretos del bracket dependen de las reglas deportivas que
  // Martín apruebe: N=5 con UN único bye a semis no completa dos semifinales
  // de dos parejas. No fabricar una semifinal ni premiar a nadie por defecto.
  function analyzeKnockoutGroups(groupSizes, requestedSemifinalByes = null) {
    if (!Array.isArray(groupSizes) || groupSizes.length < 2 ||
        groupSizes.some((n) => !Number.isSafeInteger(n) || (n !== 3 && n !== 4))) {
      throw new Error("Las eliminatorias requieren al menos dos grupos, cada uno de 3 o 4 parejas.");
    }
    const groupCount = groupSizes.length;
    const pairCount = groupSizes.reduce((n, x) => n + x, 0);
    const qualifyingCount = groupSizes.reduce((n, x) => n + (x === 3 ? 2 : 3), 0);
    const groupMatchCount = groupSizes.reduce((n, x) => n + (x === 3 ? 3 : 4), 0);
    const target = 2 ** Math.floor(Math.log2(qualifyingCount));
    const nextPower = target === qualifyingCount ? target : target * 2;
    const firstRoundCapacity = qualifyingCount <= 4 ? 4 : nextPower;
    const firstRoundMatchCount = qualifyingCount <= 4 ? 0 : qualifyingCount - firstRoundCapacity / 2;
    const directToFollowingRound = qualifyingCount <= 4
      ? 0 : firstRoundCapacity - qualifyingCount;
    const requirements = {
      groupCount,
      pairCount,
      qualifyingCount,
      groupMatchCount,
      firstRoundCapacity,
      firstRoundMatchCount,
      directToFollowingRound,
      standardTwoPairSemifinalsPossible: true,
    };
    if (requestedSemifinalByes !== null) {
      if (!Number.isSafeInteger(requestedSemifinalByes) || requestedSemifinalByes < 0) {
        throw new Error("Cantidad de pases directos inválida.");
      }
      // Sólo cuenta los pases DIRECTOS A SEMIFINALES cuando hay 4-8 clasificadas.
      // Con 9 o más habría rondas adicionales y el destino del pase cambia.
      const required = qualifyingCount > 4 && qualifyingCount <= 8
        ? directToFollowingRound : 0;
      requirements.requestedSemifinalByes = requestedSemifinalByes;
      requirements.standardTwoPairSemifinalsPossible =
        qualifyingCount <= 8 && requestedSemifinalByes === required;
      requirements.needsFormatDecision = !requirements.standardTwoPairSemifinalsPossible;
    }
    return requirements;
  }
```

La rama también añadía la exportación `analyzeKnockoutGroups` en el objeto `Object.freeze`; **la producción no tiene ni necesita actualmente ese export**.

## Otras verificaciones de limpieza

La rama `desarrollo/torneos-20261102` tenía siete commits propios históricos y divergía de `main`, pero:

- `sql/SQL_70_ELIMINACION_COMPLETA_TORNEOS.sql` es **idéntico byte a byte** entre esa rama y `main` (Git blob `5d9f08687cd7cc5bd1b61ba90b09781451fd7490`).
- `tests/torneos-eliminacion70.test.js` también es **idéntico byte a byte** entre rama y `main` (Git blob `c06a03485a2c80a1a4d55a5e93a41e56d360860d`).
- El código moderno de `main` en `js/admin-torneos.js` ya incluye los RPC de vista previa y eliminación segura, además de los avances posteriores.
- Las diferencias de la rama con `main` en Admin/HTML/bitácora corresponden a una versión histórica. **No fusionar ni sobrescribir archivos vigentes con esa versión.**

**Importante:** retirar ramas de GitHub no tiene impacto alguno en Supabase, reservas, turnos fijos, bloqueos ni Cloudflare. La única bitácora de desarrollo es `BITACORA_DESARROLLO.md`; este documento es un archivo de referencia de código, no otra bitácora.
