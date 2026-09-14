# Dúo Lógico (DUAL_QUEST) - dominio, validador y ETL (Fase 1)

## Objetivo

Registrar el nuevo tipo de juego `DUAL_QUEST` — inspirado en Fireboy and
Watergirl, pero sin usar ese nombre por el mismo motivo legal que Maze
Collector no se llama "Pacman" — y su validador de contenido. Fase 1 de 4:
solo dominio + validador, sin sala en tiempo real todavía (esa es la
Fase 2, en otra rama).

## Decisiones de diseño confirmadas con el usuario

- **Motor de movimiento: cuadrícula en tiempo real, no física de
  plataformas** (gravedad/salto). Ningún juego de este repo simula física
  real; se reutilizará el patrón ya probado de `useMazeCollectorGame.ts`
  en la Fase 2, ahora con 2 jugadores sincronizados por socket. Las
  "plataformas de calor"/"piscinas" del pedido original se vuelven
  casillas temáticas bloqueadas por rol (`grid` valores 2/3); el
  "ascensor" se vuelve una compuerta (`gate`) que un `trigger` abre.
- **Nombre**: `DUAL_QUEST`.

## Cambios realizados

- `game-type.vo.ts`: nuevo `GameTypeName` `'DUAL_QUEST'` +
  `static dualQuest()`.
- Nuevo `dual-quest.content-validator.ts` (mismo estilo que
  `snakes-ladders.content-validator.ts`):
  - `config`: `coreQuestion`, tamaño de grid (8-24 x 6-18), la matriz
    `grid` (0 libre, 1 muro, 2 solo-FIRE, 3 solo-WATER) con dimensiones
    exactas, `fireStart`/`waterStart`/`corePosition` (deben caer en
    celdas pasables para su rol), `gates` (compuertas dinámicas, nacen
    sobre una celda libre) y `triggers` (`SWITCH` o `QUESTION`, cada uno
    ligado a un `gateId` real). **Toda compuerta declarada debe tener al
    menos un trigger que la abra** — sin esto, la dependencia obligatoria
    entre los dos jugadores no existe.
  - `content`: array de `fragmentGems` (`gemId`, `role`, `position`
    pasable para su rol, `label`, `order`). Mínimo 2 gemas por rol, y
    `order` combinado de ambos roles debe cubrir 1..N sin huecos ni
    repetidos — es la secuencia única del rompecabezas de ensamblaje
    final en la Gema Núcleo.
- Registrado en `content-validator.registry.ts` y `game.module.ts`.
- 14 tests nuevos de Vitest (config y content).

## Fuera de alcance de esta rama

- Sala en tiempo real, movimiento, triggers en vivo, ensamblaje — Fases
  2 y 3, otras ramas.
- Frontend — Fase 4.

## Criterios de aceptación

- `npm test`: 40/40 pasan (26 preexistentes + 14 nuevos). `npm run build`
  y `npm run lint` limpios.
- Verificado contra el servidor local real (no solo tests unitarios):
  - `POST /games` con un mapa de 8x6, una compuerta con su trigger
    QUESTION, y 4 gemas (2 por rol) con orden 1-4 → `201`.
  - `POST /games` con una compuerta sin ningún trigger → `400` con
    mensaje exacto citando cuál compuerta quedó huérfana.
  - `POST /games/import` con un lote de un juego `DUAL_QUEST` válido →
    `202`/`COMMITTED`, sin tocar ninguna línea del pipeline ETL
    (confirmado por tercera vez: es 100% genérico sobre `gameType`).
