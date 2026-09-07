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
}

export type RoomStateView = {
  code: string
  gameTitle: string
  cards: GuessWhoCard[]
  maxAccusationCount: number
  phase: RoomPhase
  winnerUserId: string | null
  /** Id del jugador que puede descartar/acusar ahora mismo. `null` fuera de la fase PLAYING. */
  currentTurnUserId: string | null
  players: RoomPlayerView[]
}
