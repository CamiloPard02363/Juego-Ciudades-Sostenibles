export type GuessWhoCard = {
  cardId: string
  imageUrl: string
  label: string
  audioUrl: string | null
}

export type RoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED'

export type RoomPlayerView = {
  userId: string
  displayName: string
  discardedCardIds: string[]
  secretCardId: string | null
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
