# Escaleras y Serpientes - juego de ejemplo con temática de matemáticas

## Objetivo

El nuevo tipo de juego `SNAKES_LADDERS` ya aparecía en el apartado de
creación, pero no existía ninguna instancia jugable en el catálogo del
home — quien entra a crear uno no tenía ninguna referencia real de cómo
queda terminado. Se pidió sembrar un juego base con temática de
matemáticas (sumas y multiplicaciones) para que la gente lo pruebe antes
de crear el suyo, mismo objetivo que ya se resolvió para Maze Collector
con `seed-maze-collector-demos.ts`.

## Cambios realizados

- Nuevo `server/prisma/seed-snakes-ladders-demo.ts` (mismo patrón
  idempotente que `seed-maze-collector-demos.ts`/`seed-nexus-play.ts`):
  siembra **"Matemáticas: Escaleras y Números"**, `PUBLISHED`, categoría
  "Matemáticas" (se crea si no existe).
  - Tablero de 30 casillas.
  - Escaleras (multiplicaciones, el reto de alta complejidad): 4→16
    ("6×7"), 21→29 ("9×8").
  - Serpientes (sumas, reto de recuperación): 18→6 ("15+27"), 26→11
    ("8×9").
  - 6 retos de casilla normal adicionales (mezcla de sumas y
    multiplicaciones), superando el mínimo de 5 que exige el validador.
- Nuevo comando `npm run db:seed:snakes-ladders-demo` en
  `server/package.json`.

## Criterios de aceptación

- Correr el script dos veces seguidas no duplica el juego ni la materia
  (upsert por slug / por nombre de categoría) — verificado localmente.
- El contenido sembrado pasa las reglas reales de
  `SnakesLaddersContentValidator` — verificado con un `POST /games`
  idéntico contra el servidor local (201, no solo escritura directa a
  Mongo que bypasea el validador).
- El juego queda `PUBLISHED`, así que aparece en el catálogo del home sin
  que nadie tenga que publicarlo a mano.
- **Pendiente manual**: correr `npm run db:seed:snakes-ladders-demo` contra
  la base de datos real (producción) — el merge del código no crea el
  juego por sí solo, igual que pasó con los seeds anteriores.
