export type GuessWhoCard = {
  cardId: string
  imageUrl: string
  label: string
  audioUrl: string | null
  /** Dato breve opcional sobre el tema de esa tarjeta (ej. dato de un país si es una bandera) — se muestra como burbuja de información en el juego. */
  info: string | null
}

/**
 * Tarjetas mínimas que hay que descartar antes de poder acusar al rival —
 * debe coincidir con MIN_DISCARDS_BEFORE_ACCUSATION del gateway. Compartida
 * entre el lobby (mensaje fijo), MatchBoard (habilitar el botón) y el
 * torneo, para no repetir el número en cuatro lugares distintos.
 */
export const MIN_DISCARDS_TO_ACCUSE = 3

export type RoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED'

export type RoomPlayerView = {
  userId: string
  displayName: string
  discardedCardIds: string[]
  secretCardId: string | null
  ready?: boolean
  isSelf: boolean
  hasVotedRematch: boolean
  /**
   * true solo para quien creó la sala 1v1 — es el único que puede fijar los
   * segundos por turno. No aplica a matches de torneo (ahí el rol
   * equivalente es `creatorUserId` a nivel de TournamentStateView).
   */
  isHost?: boolean
}

export type RoomStateView = {
  code: string
  gameTitle: string
  cards: GuessWhoCard[]
  maxAccusationCount: number
  turnDurationSeconds: number
  phase: RoomPhase
  winnerUserId: string | null
  activePlayerUserId: string | null
  /** Timestamp (epoch ms) en el que vence el turno actual, para dibujar el countdown. */
  turnDeadline: number | null
  players: RoomPlayerView[]
}

/** Resultado de una acusación (room:accusation-result), tal como llega del servidor. */
export type AccusationResult = {
  accuserUserId: string
  accuserName: string
  /** Dueño de la carta que se intentó adivinar (el rival de quien acusó). */
  targetUserId: string
  targetName: string
  cardId: string
  correct: boolean
}

/** Mensaje del chat de una sala 1v1 — relay en vivo, sin historial persistido. */
export type GuessWhoChatMessage = {
  userId: string
  displayName: string
  text: string
  sentAt: number
}

// --- Modo grupo (torneo eliminatorio) ---

export type TournamentPhase = 'WAITING' | 'RUNNING' | 'FINISHED'

export type TournamentParticipantView = {
  userId: string
  displayName: string
  points: number
  eliminated: boolean
  eliminatedAtRound: number | null
  ready?: boolean
  isSelf: boolean
}

export type TournamentRoundMatchSummary = {
  matchCode: string
  isBye: boolean
  phase: RoomPhase
  playerUserIds: string[]
  winnerUserId: string | null
}

export type TournamentRoundSummary = {
  round: number
  matches: TournamentRoundMatchSummary[]
}

/** Vista de un match 1v1 de torneo: mismo shape que una sala 1v1 normal, más metadata de ronda. */
export type TournamentMatchStateView = {
  matchCode: string
  round: number
  isBye: boolean
  gameTitle: string
  cards: GuessWhoCard[]
  maxAccusationCount: number
  turnDurationSeconds: number
  phase: RoomPhase
  winnerUserId: string | null
  activePlayerUserId: string | null
  turnDeadline: number | null
  players: RoomPlayerView[]
}

export type TournamentStateView = {
  code: string
  gameTitle: string
  maxParticipants: number
  turnDurationSeconds: number
  phase: TournamentPhase
  currentRound: number
  creatorUserId: string
  winnerUserId: string | null
  participants: TournamentParticipantView[]
  rounds: TournamentRoundSummary[]
  myMatch: TournamentMatchStateView | null
}

export type TournamentPairingAnnouncement = {
  round: number
  matchCode: string
  pairing: { userId: string; displayName: string }[]
}
