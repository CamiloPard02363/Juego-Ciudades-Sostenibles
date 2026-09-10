import { io } from 'socket.io-client'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type ResolvedRoomKind = 'room' | 'tournament' | 'domino'

export type ResolvedRoom = {
  kind: ResolvedRoomKind
  gameId: string
  gameTitle: string
}

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
