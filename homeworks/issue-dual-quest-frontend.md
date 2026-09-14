# Dúo Lógico (DUAL_QUEST) — Fase 4: frontend

Última fase del rollout de "Dúo Lógico". Depende de que las 3 fases
anteriores ya estén fusionadas en `main` en este orden:

1. `feature/dual-quest-domain-etl`
2. `feature/dual-quest-realtime-movement`
3. `feature/dual-quest-gems-assembly`
4. `feature/dual-quest-frontend` (esta rama)

## Qué se agregó

### Cliente (`client/`)

- `dualQuestTypes.ts` — tipos espejo del dominio del servidor (grid,
  gates, triggers, gemas), helpers `buildEmptyGrid`/`resizeGrid` y
  constantes de límites de grid/gemas para el formulario.
- `useDualQuestRoom.ts` — hook de socket (mismo patrón que
  `useSnakesLaddersRoom.ts`), escucha `dual-quest:state`, `room:error`
  (no un evento con prefijo propio — la lección del bug de
  `useDominoRoom` ya corregido antes), `dual-quest:trigger-result` y
  `dual-quest:assembly-result`.
- `DualQuestBoard.tsx` — tablero de grid reutilizable tanto para la vista
  en vivo como para el editor del formulario de creación (`onCellClick`
  opcional).
- `TriggerQuestionModal.tsx` — mismo patrón que `ChallengeModal.tsx` para
  triggers de tipo pregunta.
- `AssemblyModal.tsx` — modal de ensamblaje final: reordenar gemas
  recolectadas (flechas arriba/abajo) y enviar el arreglo propuesto.
- `DualQuestRoomPage.tsx` — sala en vivo: movimiento continuo por
  teclado (flechas/WASD), selección de rol antes de crear sala, botón de
  activar interruptor cuando el jugador está parado sobre uno, modales de
  pregunta/ensamblaje, pantalla final con reinicio (solo el host).
- `DualQuestGameForm.tsx` — formulario de creación: editor de grid por
  modos de colocación (celda, inicio Fuego/Agua, núcleo, compuertas con
  su trigger anidado, gemas). El `order` de las gemas **se deriva del
  índice del arreglo**, no se captura manualmente — así la regla del
  servidor ("1..N contiguo") siempre se cumple por construcción.
- Wiring: `GameTypePicker.tsx`, `GameTypePickerPage.tsx`, rutas en
  `App.tsx` (`/juegos/crear/dual-quest` y `/dual-quest/sala/:code?`),
  `resolveRoomCode.ts` (`ResolvedRoomKind` incluye `'dual-quest'`),
  `GamesSection.tsx` (`handleCodeResolved`/`handlePlayClick`),
  `GameDetailModal.tsx` (`opensLiveRoom` incluye `DUAL_QUEST`),
  `game.service.ts` (`CreateGameInput` variante `DUAL_QUEST`).

### Servidor (`server/`) — 3 ajustes menores detectados al construir el frontend

Estos tres huecos se notaron recién al escribir las pantallas que los
necesitaban; no requirieron tocar dominio/ETL/gateway más allá de lo ya
construido en fases anteriores:

- `room:resolve-code` ahora también resuelve salas de Dúo Lógico (antes
  solo cubría Domino/Escaleras y Serpientes) — sin esto, pegar un código
  de sala de Dúo Lógico en el modal genérico de "unirse por código"
  fallaba.
- `DualQuestRoomState.coreQuestion` se agregó y se expone en la vista de
  cliente — lo necesita `AssemblyModal.tsx` para mostrar qué concepto se
  está armando.
- La vista de cliente ahora expone `triggers` (`triggerId`, `kind`,
  `activatedByRole`, `switchPosition`, `gateId`) — **sin** `prompt`,
  `options` ni `correctOptionIndex`, que solo viajan una vez que el
  trigger se activa (vía `pendingQuestion`). Sin esto, el cliente no
  tenía forma de saber dónde pararse para activar un interruptor.

## Verificación

- `server`: `npm run build` limpio, `npm test` 40/40 tests pasando
  (incluye los validadores existentes de Dúo Lógico; no se agregaron
  tests nuevos en esta fase porque los 3 ajustes son de superficie —
  exponer datos ya validados, no lógica nueva).
- `client`: `npm run build` limpio (`tsc -b && vite build`), `npm run
  lint` sin errores (solo warnings preexistentes del mismo tipo que ya
  existen en otros componentes del repo, p. ej. `set-state-in-effect` en
  `ChallengeModal.tsx`).

**No se realizó verificación visual en navegador real** — este entorno
no tiene herramienta de navegador, igual que en las fases de frontend
anteriores (Maze Collector, Escaleras y Serpientes). Antes de fusionar,
conviene que alguien pruebe manualmente: crear una sala de Dúo Lógico,
jugar con dos pestañas/usuarios, activar interruptores, recolectar gemas
y enviar el ensamblaje final.

## Orden de fusión

Fusionar en `main` en el orden exacto: `domain-etl` →
`realtime-movement` → `gems-assembly` → `frontend` (esta rama). Cada
rama está apilada sobre la anterior.
