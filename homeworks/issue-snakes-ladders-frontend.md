# Escaleras y Serpientes: Ciudad Sostenible - frontend (Fase 3)

## Objetivo

Interfaz completa para crear y jugar Escaleras y Serpientes en `/client`:
formulario de creación, tablero dinámico, modal de retos con feedback
inmediato, y la página de sala en vivo (2-4 jugadores) conectada al backend
de la Fase 2.

## Cambios realizados

- `snakesLaddersTypes.ts`: tipos espejo del servidor + `buildCellPositions`,
  una función pura que numera las casillas en serpentina (boustrophedon)
  según `boardSize`, para que el tablero se dibuje solo a partir de la
  configuración del juego.
- `SnakesLaddersBoard.tsx`: tablero dinámico — grilla CSS con las casillas
  numeradas, escaleras/serpientes dibujadas como líneas sobre un `<svg>`
  con `viewBox` en unidades de grilla (escala sola, sin cálculos de
  píxeles), y una ficha de color por jugador (hasta 4) en su casilla
  actual.
- `ChallengeModal.tsx`: modal del reto — pregunta y opciones para todos
  (modo espectador para quien no le toca), solo quien lo recibió puede
  responder; el feedback de correcto/incorrecto llega después del servidor,
  nunca se sabe la respuesta antes de responder.
- `useSnakesLaddersRoom.ts`: hook de conexión de socket, mismo patrón que
  `useDominoRoom`. A diferencia de ese hook (que tiene un bug existente:
  escucha `domino:error`, evento que el servidor nunca emite), este escucha
  `room:error` — el nombre real que usa `WsExceptionFilter` — no se
  corrigió el bug de Dominó porque no se pidió, pero se documentó.
- `SnakesLaddersRoomPage.tsx`: página de sala en vivo (ruta
  `/escaleras-serpientes/sala/:code?`), mismo patrón que `DominoRoomPage`
  generalizado a hasta 4 jugadores (lista de jugadores con su casilla
  actual en vez de "rival" fijo).
- `SnakesLaddersGameForm.tsx` + `create/SnakesLaddersGameFormPage.tsx`:
  formulario de creación. Cada escalera/serpiente se edita junto con su
  reto en un mismo bloque (no dos listas separadas que haya que mantener
  sincronizadas) — al enviar, se separan en `config` (posiciones) y
  `content` (retos) como espera el validador del servidor.
- `GameTypePicker.tsx` / `create/GameTypePickerPage.tsx` / `App.tsx`:
  nueva opción y rutas de creación + sala.
- `GamesSection.tsx::handlePlayClick`: rama para `SNAKES_LADDERS` que
  navega a la sala (mismo criterio que `DOMINO`).
- `GameDetailModal.tsx`: `SNAKES_LADDERS` agregado a `opensLiveRoom` (botón
  "Abrir sala" en vez de "Jugar", campo de código propio del juego).
- `game.service.ts`: nueva rama de `CreateGameInput` para `SNAKES_LADDERS`.

## Cambio adicional necesario en el backend (Fase 2)

`rooms.gateway.ts::handleResolveCode` (`room:resolve-code`) solo conocía
salas de ¿Quién Es?, torneo y Dominó — el campo de "unirme con código" de
`GameDetailModal` (compartido entre todos los juegos) no habría encontrado
una sala de Escaleras y Serpientes. Se agregó el `SNAKES_LADDERS_ROOM_STORE`
a esa resolución (nuevo `kind: 'snakes-ladders'`), reflejado en
`resolveRoomCode.ts` y `GamesSection.tsx::handleCodeResolved` del cliente.

## Criterios de aceptación

- `npm run build` limpio en `server/` y `client/`.
- `npm run lint` sin advertencias nuevas más allá de patrones ya aceptados
  en el resto del código (ej. `set-state-in-effect` al resetear la opción
  seleccionada cuando cambia el reto, mismo patrón que `MatchBoard.tsx`).
- Crear un juego de Escaleras y Serpientes desde la UI debe enviar un
  payload que ya se verificó válido contra el validador real del servidor
  (Fase 1) y contra la sala en tiempo real real (Fase 2).
- **Pendiente de verificación manual en navegador**: no hay herramienta de
  navegador disponible en este entorno para probar la interacción visual
  real (arrastrar, animaciones, responsividad del tablero en móvil) — se
  verificó exhaustivamente la lógica (tipos, compilación, y contra el
  backend real en las Fases 1 y 2), pero la experiencia visual final debe
  revisarse a mano antes de mergear.
