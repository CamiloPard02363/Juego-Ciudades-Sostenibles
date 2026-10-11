/**
 * Adónde lleva el botón "Jugar" según el tipo de juego. Vive aparte (y no
 * dentro de GamesSection) para que la página de Memoria pueda usar la misma
 * tabla cuando le llega un juego que no es suyo, y para poder probarla.
 *
 * Antes, cualquier tipo que no estuviera en la lista caía por defecto en
 * Memoria: un juego de un tipo nuevo (o de un tipo que esta versión del
 * cliente todavía no conoce, p. ej. si el despliegue del cliente quedó atrás
 * del servidor) se abría como MatchMente con datos que no le corresponden.
 * Ahora un tipo desconocido devuelve `unsupported` y se avisa.
 */

type PlayableGame = { id: string; slug: string; gameType: string }

export type PlayTarget =
  /** ¿Quién Es? se abre como sala en vivo dentro del inicio (no es una ruta propia). */
  | { kind: 'guess-who-room' }
  | { kind: 'navigate'; path: string }
  | { kind: 'unsupported' }

export function playTargetFor(game: PlayableGame): PlayTarget {
  const slug = encodeURIComponent(game.slug)
  const id = encodeURIComponent(game.id)

  switch (game.gameType) {
    case 'GUESS_WHO':
      return { kind: 'guess-who-room' }
    // El dominó es una sala 1v1 en tiempo real con página propia (ver DominoRoomPage).
    case 'DOMINO':
      return { kind: 'navigate', path: `/domino/sala?gameId=${id}` }
    // Un jugador contra la IA, sin sala en vivo (ver MazeCollectorPlayPage).
    case 'MAZE_COLLECTOR':
      return { kind: 'navigate', path: `/jugar/laberinto/${slug}` }
    // Un jugador contra las medusas, sin sala en vivo (ver TrueFalseMazePlayPage).
    case 'TRUE_FALSE_MAZE':
      return { kind: 'navigate', path: `/jugar/laberinto-vf/${slug}` }
    // Sala en tiempo real de 2 a 4 jugadores.
    case 'SNAKES_LADDERS':
      return { kind: 'navigate', path: `/escaleras-serpientes/sala?gameId=${id}` }
    // Sala en tiempo real de exactamente 2 jugadores (Fuego/Agua).
    case 'DUAL_QUEST':
      return { kind: 'navigate', path: `/dual-quest/sala?gameId=${id}` }
    // Motor físico en el navegador, carga el nivel por slug (ver DualQuestPixiPlayPage).
    case 'DUAL_QUEST_PIXI':
      return { kind: 'navigate', path: `/dual-quest-pixi/${slug}` }
    // Memoria (Parejas/Opuestos), con el popup de opciones antes de arrancar.
    case 'MEMORY_MATCH':
      return { kind: 'navigate', path: `/jugar/memoria/${slug}` }
    default:
      return { kind: 'unsupported' }
  }
}

export const UNSUPPORTED_GAME_MESSAGE =
  'Este tipo de juego todavía no está disponible en esta versión de la página. Recarga la página (Ctrl + F5) y vuelve a intentarlo.'
