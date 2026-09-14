# Escaleras y Serpientes: Ciudad Sostenible - dominio, validador y ETL (Fase 1)

## Objetivo

Registrar el nuevo tipo de juego `SNAKES_LADDERS` en el catálogo de tipos y
crear su validador de contenido, para que quede disponible tanto en la
creación normal (`POST /games`) como en la importación masiva
(`POST /games/import`), sin tocar el gateway de salas en tiempo real todavía
(eso es la Fase 2, en otra rama).

## Contexto de investigación

Antes de escribir código se investigó a fondo el estado actual del backend
(3 agentes de exploración en paralelo): agregar un tipo de juego nuevo ya es
un flujo maduro y completamente genérico — `Game.entity.ts`, el mapper de
Mongo, el `$jsonSchema` de la colección `games` y todo el pipeline ETL
(`game-factory.service.ts`, `import-games-batch.use-case.ts`,
`game-import.extractor.ts`, etc.) no conocen ningún `gameType` en particular;
todos delegan en `ContentValidatorRegistry.resolve(gameType)`. Esto se
confirmó **probando en vivo** contra el servidor local, no solo leyendo el
código (ver Verificación).

## Cambios realizados

- `server/src/domain/value-objects/game-type.vo.ts`: agregado
  `'SNAKES_LADDERS'` a `GameTypeName`/`VALID_GAME_TYPES`, más
  `static snakesLadders()`.
- Nuevo `server/src/application/content-validators/snakes-ladders.content-validator.ts`,
  mismo estilo que `domino.content-validator.ts`/`maze-collector.content-validator.ts`:
  - `config`: `boardSize` (25-40), `turnDurationSeconds` (15-180, default 45),
    `ladders`/`snakes` (pares `from`/`to` dentro de `[2, boardSize-1]`,
    dirección correcta según el tipo, sin solapamientos entre ellas).
  - `content`: retos `{cellNumber, triggerType: CELL|LADDER|SNAKE, prompt,
    options (2-6), correctOptionIndex, difficulty?}`. Toda escalera y toda
    serpiente declarada en `config` **debe** tener su reto correspondiente
    (si falta, error citando exactamente cuál casilla quedó sin pregunta);
    mínimo 5 retos de casillas normales para que el tablero no dependa solo
    de escaleras/serpientes.
- Registrado en `content-validator.registry.ts` y `game.module.ts`.
- Nuevo `snakes-ladders.content-validator.spec.ts` (Vitest, 14 casos):
  config válido, boardSize fuera de rango, dirección incorrecta de
  escalera/serpiente, solapamiento de casillas, escalera/serpiente sin
  reto asociado, mínimo de retos CELL, `correctOptionIndex` fuera de rango,
  caso completo válido.
- **Nada más cambia**: confirmado que `game.entity.ts`, el mapper de Mongo,
  `games.collection-schema.ts` y el pipeline ETL completo no necesitaron
  ninguna línea tocada.

## Fuera de alcance (Fase 2 y 3, otras ramas)

- Sala en tiempo real en `rooms.gateway.ts` (crear/unirse/tirar dado/
  responder retos/revancha) — no se toca en esta rama.
- Frontend (tablero, formulario de creación, sala en vivo) — tampoco.

## Criterios de aceptación

- `npm test` en `server/`: 26/26 tests pasan (12 preexistentes + 14 nuevos).
- `npm run build` limpio.
- Verificado contra el servidor local real (no solo tests unitarios):
  - `POST /games` con un tablero de 30 casillas, 2 escaleras, 2 serpientes
    y 9 retos → `201`.
  - `POST /games` con una escalera sin su reto asociado → `400` con mensaje
    exacto: `"falta el reto de la escalera que empieza en la casilla 4."`.
  - `POST /games/import` con un lote de un juego `SNAKES_LADDERS` válido →
    `202`/`COMMITTED`, sin haber tocado ni una línea del pipeline ETL.
