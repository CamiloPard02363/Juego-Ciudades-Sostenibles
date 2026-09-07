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
