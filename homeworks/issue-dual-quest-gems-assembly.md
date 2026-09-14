# Dúo Lógico (DUAL_QUEST) - gemas y ensamblaje final (Fase 3)

## Objetivo

Agregar el corazón pedagógico del juego sobre la sala en tiempo real ya
construida en la Fase 2: cada rol recolecta sus propias gemas fragmento y,
al llegar ambos a la Gema Núcleo, arman juntos la secuencia correcta del
concepto. Sin esto, Dúo Lógico sería un plataformas cooperativo cualquiera
— esto es lo que lo convierte en la herramienta de "construcción del
conocimiento" del pedido original.

## Cambios realizados

- `DualQuestRoomState` (puerto): nuevos campos `fragmentGems` (definición
  completa, incluye `order` — nunca se serializa tal cual al cliente) y
  `collectedGemIds` (compartido entre ambos jugadores).
- `rooms.gateway.ts`:
  - `create` ahora carga `fragmentGems` desde `game.content`.
  - **Auto-recolección** en el tick de movimiento: cada jugador solo
    recoge gemas de su propio rol al caer en su casilla (mismo criterio
    que Maze Collector).
  - `toDualQuestClientView` manda `gems` (gemId, role, label, position,
    collected) y `canAssemble` (true solo cuando `bothAtCore` **y** ya se
    recolectaron todas) — nunca el campo `order`, o el rompecabezas se
    resolvería solo ordenando ascendente.
  - Nuevo `dual-quest:submit-assembly`: el cliente manda el arreglo de
    `gemId`s en el orden que cree correcto; el servidor lo corrige contra
    el `order` real de `room.fragmentGems` (nunca contra algo que mande
    el cliente). Reintentos ilimitados — una respuesta incorrecta no
    penaliza, solo no termina la partida.
  - Nuevo `dual-quest:restart` (solo el anfitrión, solo con la partida
    terminada): reinicia posiciones, compuertas y gemas sin recrear la
    sala — cierra el ciclo de "puedes volver a intentarlo".

## Criterios de aceptación

- `npm run build` / `npm test` (40/40) / `npm run lint` limpios en
  `server/` (sin warnings nuevos).
- **Verificado end-to-end con 2 clientes de Socket.IO reales**: ambos
  roles recolectando sus propias gemas automáticamente, activar un
  trigger SWITCH abre su compuerta, ambos llegando a la Gema Núcleo
  activa `canAssemble`, un ensamblaje con el orden incorrecto se rechaza
  sin terminar la partida, el orden correcto sí la termina
  (`phase: 'FINISHED'`), y `dual-quest:restart` deja la sala lista para
  jugar de nuevo (gemas y compuertas reiniciadas).

## Fuera de alcance

- Frontend (tablero, modal de ensamblaje, formulario de creación) —
  Fase 4, última rama.
