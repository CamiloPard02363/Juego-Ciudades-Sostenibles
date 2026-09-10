import type { DominoConcept } from './dominoTypes'

export type DominoRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED'

/** Una ficha: sus dos mitades son índices dentro de `concepts`. */
export type DominoTileView = {
  id: string
  a: number
  b: number
}

/** Una ficha ya colocada en el tablero, orientada hacia los extremos abiertos. */
export type DominoPlacedTileView = {
  id: string
  left: number
  right: number
  isDouble: boolean
  /** userId de quien la colocó — dispara la animación de "jugada" en ese lado. */
  placedByUserId: string
}

export type DominoRoomPlayerView = {
  userId: string
  displayName: string
  /** Cantidad de fichas en mano — siempre visible, propia y ajena. */
  handCount: number
  /** La mano completa solo llega para el jugador dueño de este socket; null para el rival. */
  hand: DominoTileView[] | null
  isSelf: boolean
  hasVotedRematch: boolean
  /** true solo para quien creó la sala — único que puede fijar los segundos por turno. */
  isHost?: boolean
}

export type DominoRoomStateView = {
  code: string
  gameTitle: string
  concepts: DominoConcept[]
  handSize: number
  turnDurationSeconds: number
  phase: DominoRoomPhase
  board: DominoPlacedTileView[]
  boneyardCount: number
  winnerUserId: string | null
  /** true si terminó por bloqueo (nadie podía jugar) en vez de por mano vacía. */
  endedByBlock: boolean
  activePlayerUserId: string | null
  turnDeadline: number | null
  players: DominoRoomPlayerView[]
}
