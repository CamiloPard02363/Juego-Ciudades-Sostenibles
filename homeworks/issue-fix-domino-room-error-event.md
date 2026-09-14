# Fix: los errores de la sala de Dominó nunca llegaban al cliente

## Objetivo

`useDominoRoom.ts` escuchaba el evento `domino:error`, pero el servidor
(`WsExceptionFilter`) siempre emite `room:error` sin importar el prefijo de
la sala — confirmado leyendo `ws-exception.filter.ts` y comparando con
`useGuessWhoRoom.ts`/`useGuessWhoTournament.ts`/`resolveRoomCode.ts`, que sí
escuchan `room:error` correctamente. El resultado: cualquier error real en
una sala de Dominó (código inexistente, sala llena, jugar fuera de turno,
etc.) se perdía en silencio — el usuario nunca veía el mensaje.

## Cambio

- `client/src/components/home/games/useDominoRoom.ts`: escucha `room:error`
  en vez de `domino:error`.

## Criterios de aceptación

- Verificado en vivo contra el servidor real: unirse a un código de sala de
  dominó inexistente dispara `room:error` con el mensaje
  `"No existe una sala de dominó con ese código."` — el evento que ahora
  escucha el hook corregido.
- Build y lint limpios en `client/`.
- No se tocó ningún otro archivo — el bug era puntual a esa única línea.
