import { io } from 'socket.io-client'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type ResolvedRoomKind = 'room' | 'tournament' | 'domino' | 'snakes-ladders' | 'dual-quest'

export type ResolvedRoom = {
  kind: ResolvedRoomKind
  gameId: string
  gameTitle: string
}

/**
 * A qué ruta navegar para cada `kind` que puede devolver el servidor —
 * 'room' y 'tournament' (¿Quién Es? 1v1 / torneo) no están acá porque abren
 * un overlay existente en vez de navegar a una página propia (ver
 * `handleCodeResolved` en GamesSection.tsx). Un juego nuevo con sala en
 * vivo y página propia solo necesita una entrada acá — el resto del flujo
 * (JoinByCodeModal, resolveRoomCode) ya es agnóstico al tipo de juego.
 */
export const LIVE_ROOM_ROUTES: Partial<Record<ResolvedRoomKind, (code: string) => string>> = {
  domino: (code) => `/domino/sala/${code}`,
  'snakes-ladders': (code) => `/escaleras-serpientes/sala/${code}`,
  'dual-quest': (code) => `/dual-quest/sala/${code}`,
}

/**
 * Tipos de juego (valores de `Game.gameType`) que tienen sala en vivo con
 * código para unirse — usado por GameDetailModal para decidir si mostrar el
 * campo de "unirme con código" propio del juego y el botón "Abrir sala" en
 * vez de "Jugar". Agregar un juego nuevo con sala en vivo es agregar su
 * `gameType` acá (y una entrada en LIVE_ROOM_ROUTES si tiene página propia).
 */
export const LIVE_ROOM_GAME_TYPES: readonly string[] = ['GUESS_WHO', 'DOMINO', 'SNAKES_LADDERS', 'DUAL_QUEST']

/**
 * Resuelve un código de sala contra el gateway (revisa salas 1v1 de "¿Quién
 * Es?", torneos grupales y salas de dominó) sin importar a qué juego
 * pertenece. Un solo socket de usar-y-tirar por llamado: no hace falta
 * mantenerlo vivo más allá de la respuesta.
 *
 * Compartido entre JoinByCodeModal (código agnóstico, cualquier juego) y el
 * campo de código propio de cada juego en GameDetailModal, para no duplicar
 * esta lógica de conexión/ack/error entre ambos.
 */
export function resolveRoomCode(token: string, code: string): Promise<ResolvedRoom> {
  return new Promise((resolve, reject) => {
    const socket = io(`${API_URL}/rooms`, { auth: { token }, transports: ['websocket'] })

    // El gateway no resuelve el ack cuando el código no existe (el filtro de
    // excepciones solo emite "room:error"), así que ese evento es el único
    // camino confiable para el caso de error — el ack solo se usa si sí trae
    // el resultado resuelto.
    socket.on('room:error', (payload: { message: string }) => {
      socket.disconnect()
      reject(new Error(payload.message))
    })
    socket.on('connect', () => {
      socket.emit('room:resolve-code', { code }, (response?: ResolvedRoom) => {
        if (response && 'kind' in response) {
          socket.disconnect()
          resolve(response)
        }
      })
    })
    socket.on('connect_error', () => {
      socket.disconnect()
      reject(new Error('No se pudo conectar. Intenta de nuevo.'))
    })
  })
}
