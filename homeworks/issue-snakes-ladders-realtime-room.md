# Escaleras y Serpientes: Ciudad Sostenible - sala en tiempo real (Fase 2)

## Objetivo

Agregar el modo multijugador en tiempo real para `SNAKES_LADDERS` en
`rooms.gateway.ts`, de 2 a 4 jugadores por sala, replicando exactamente el
patrón ya probado de Dominó (store en memoria + timers de turno + handlers
`@SubscribeMessage`) generalizado a N jugadores en vez de 2 fijos.

## Restricción crítica respetada

El middleware de autenticación de Socket.IO en `afterInit`/`server.use()`
(que evita la condición de carrera documentada donde `handleConnection`
async dejaba una ventana con `socket.data.userId` todavía `undefined`) **no
se tocó en absoluto**. Los handlers nuevos solo leen `socket.data.userId`/
`displayName` ya puestos por ese middleware, igual que Dominó y ¿Quién Es?.

## Cambios realizados

- Nuevo `server/src/domain/ports/snakes-ladders-room-store.port.ts`:
  `SnakesLaddersRoomState` (hasta 4 `players`, `pendingChallenge` sin
  `correctOptionIndex`, `questions` completas solo del lado del servidor),
  interfaz `SnakesLaddersRoomStore`, token `SNAKES_LADDERS_ROOM_STORE`.
- Nuevo `server/src/infrastructure/rooms/in-memory-snakes-ladders-room.store.ts`
  (mismo `Map` en memoria que `InMemoryDominoRoomStore`).
- `rooms.module.ts`: registrado el nuevo store.
- `rooms.gateway.ts`: nuevo bloque `snakes-ladders:*` con
  `create`/`join`/`start`/`roll-dice`/`answer-challenge`/`rematch-vote`/
  `leave`, más limpieza en el `handleDisconnect` compartido:
  - **El dado lo tira el servidor** (`1 + Math.floor(Math.random()*6)`),
    nunca el cliente.
  - **La respuesta se corrige contra `room.questions`** (copia del
    `content` real del juego, cargada una sola vez al crear la sala) —
    el cliente nunca ve `correctOptionIndex`, ni antes ni durante el reto.
  - Reglas exactas pedidas: casilla normal fallida → vuelve a la posición
    antes de tirar; escalera acierta → sube, falla → se queda en la base;
    serpiente acierta → se queda, falla → baja.
  - Turno rotativo circular sobre `room.players` (no "el otro" como
    Dominó) — soporta de 2 a 4 jugadores.
  - Dos timers de seguridad (mismo criterio que Dominó: el servidor nunca
    deja la partida colgada): si nadie tira a tiempo, pasa el turno sin
    mover a nadie; si nadie responde el reto a tiempo, cuenta como fallo
    automático.
  - Ganar: llegar o pasar la última casilla (simplificación deliberada,
    sin la regla clásica de "caer justo").

## Fuera de alcance

- Frontend (tablero, sala en vivo, formulario) — Fase 3, otra rama.
- Persistencia del estado de partida en Mongo — a propósito no existe,
  igual que Dominó/¿Quién Es? (la sala vive y muere en memoria).

## Criterios de aceptación

- `npm run build` / `npm test` / `npm run lint` limpios en `server/`
  (sin warnings nuevos más allá de uno preexistente no relacionado).
- **Verificado end-to-end con clientes de Socket.IO reales** (no solo
  revisión de código): 3 jugadores conectados con JWT real, crear sala,
  unirse, iniciar, y jugar 23 rondas completas hasta que un jugador gana —
  confirmando que el turno rota entre los 3 (no solo 2), que los retos se
  resuelven y desbloquean el siguiente turno, y que la partida siempre
  termina con un ganador.
- El middleware de autenticación de `afterInit` sigue intacto — no se tocó
  `handleConnection` ni `authenticateSocket`.
