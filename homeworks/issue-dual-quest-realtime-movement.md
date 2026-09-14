# Dúo Lógico (DUAL_QUEST) - movimiento en tiempo real y compuertas (Fase 2)

## Objetivo

Agregar el modo multijugador en tiempo real para `DUAL_QUEST` en
`rooms.gateway.ts`: exactamente 2 jugadores (uno FIRE, uno WATER) moviéndose
simultáneamente sobre una cuadrícula compartida, con casillas bloqueadas
por rol y compuertas que un jugador abre para el otro (la "dependencia
obligatoria" del pedido original). **Sin gemas ni ensamblaje todavía** —
eso es la Fase 3, en otra rama.

## Diferencia de patrón frente a los juegos anteriores

Todos los juegos en vivo anteriores (Dominó, ¿Quién Es?, Escaleras y
Serpientes) son por turnos: un `setTimeout` que se rearma en cada turno.
Dúo Lógico no tiene turnos — los dos jugadores se mueven a la vez, en
tiempo real. Se agregó un **tick continuo por sala**
(`dualQuestMovementTicks`, un `setInterval` de 150ms mientras
`phase === 'PLAYING'`) que aplica la dirección deseada de cada jugador en
cada vuelta — mismo cálculo de colisión por celda que
`useMazeCollectorGame.ts` en el cliente, pero corriendo del lado del
servidor para 2 jugadores remotos en vez de uno local.

## Cambios realizados

- Nuevo `dual-quest-room-store.port.ts` / `InMemoryDualQuestRoomStore`,
  mismo criterio efímero que los demás stores de sala.
- `rooms.module.ts`: registrado el nuevo store.
- `rooms.gateway.ts`: nuevo bloque `dual-quest:*`:
  - `create` (el creador elige rol, default FIRE) / `join` (el segundo
    jugador recibe automáticamente el rol que falta — nunca dos del
    mismo).
  - `start` — arranca el tick de movimiento.
  - `move` — el jugador solo manda su dirección deseada; el tick decide
    si de verdad se mueve (colisión contra `grid` + compuertas cerradas).
  - `activate-trigger` — exige estar parado exactamente en
    `switchPosition` y ser el rol correcto; `SWITCH` abre la compuerta al
    toque, `QUESTION` guarda la pregunta como pendiente (sin la respuesta
    correcta) y la emite a la sala.
  - `answer-trigger` — el servidor corrige contra `room.triggers` (nunca
    confía en el cliente); correcto abre la compuerta, incorrecto no
    castiga (se puede reintentar volviendo a activar el trigger).
  - `bothAtCore` se actualiza en cada tick (true cuando ambos coinciden en
    `corePosition`) — queda listo para que la Fase 3 abra el ensamblaje.
  - `leave` + limpieza en el `handleDisconnect` compartido.
- El middleware de autenticación en `afterInit`/`server.use()` no se tocó.

## Criterios de aceptación

- `npm run build` / `npm test` (40/40) / `npm run lint` limpios en
  `server/` (sin warnings nuevos más allá del preexistente no
  relacionado).
- **Verificado end-to-end con 2 clientes de Socket.IO reales** (no solo
  revisión de código): crear sala, unirse (roles asignados correctamente),
  iniciar, mover a FIRE a través de una casilla solo-FIRE (cruza bien),
  intentar mover a WATER contra un muro (queda bloqueado exactamente donde
  debe), activar un trigger QUESTION parado en el interruptor correcto,
  **confirmar que `correctOptionIndex` nunca llega al cliente** en la
  pregunta pendiente, responder correctamente y verificar que la compuerta
  se abre.

## Fuera de alcance

- Gemas fragmento, recolección, ensamblaje final — Fase 3.
- Frontend — Fase 4.
