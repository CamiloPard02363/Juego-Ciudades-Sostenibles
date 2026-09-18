export type SnakesLaddersLink = { from: number; to: number }
export type SnakesLaddersTriggerType = 'CELL' | 'LADDER' | 'SNAKE'
export type SnakesLaddersDifficulty = 'LOW' | 'MEDIUM' | 'HIGH'

export type SnakesLaddersQuestionDraft = {
  cellNumber: number
  triggerType: SnakesLaddersTriggerType
  prompt: string
  options: string[]
  correctOptionIndex: number
  difficulty?: SnakesLaddersDifficulty
}

export const MIN_BOARD_SIZE = 25
export const MAX_BOARD_SIZE = 40
export const DEFAULT_BOARD_SIZE = 30
export const DEFAULT_TURN_DURATION_SECONDS = 45
export const MIN_CELL_QUESTIONS = 5

export type SnakesLaddersRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED'

/** Nunca incluye la respuesta correcta — eso solo lo sabe el servidor hasta que se resuelve el reto. */
export type SnakesLaddersPendingChallengeView = {
  cellNumber: number
  triggerType: SnakesLaddersTriggerType
  forUserId: string
  prompt: string
  options: string[]
  deadlineTs: number
}

export type SnakesLaddersRoomPlayerView = {
  userId: string
  displayName: string
  position: number
  ready?: boolean
  isSelf: boolean
  isHost: boolean
  hasVotedRematch: boolean
}

export type SnakesLaddersRoomStateView = {
  code: string
  gameTitle: string
  boardSize: number
  ladders: SnakesLaddersLink[]
  snakes: SnakesLaddersLink[]
  turnDurationSeconds: number
  phase: SnakesLaddersRoomPhase
  winnerUserId: string | null
  activePlayerUserId: string | null
  turnDeadline: number | null
  lastRoll: number | null
  pendingChallenge: SnakesLaddersPendingChallengeView | null
  players: SnakesLaddersRoomPlayerView[]
}

export type SnakesLaddersChallengeResult = {
  userId: string
  correct: boolean
  correctOptionIndex: number | null
  position: number
}

/** Columnas del tablero — con 25-40 casillas da entre 5 y 8 filas, proporción cómoda para pantalla. */
export const BOARD_COLUMNS = 5

export type CellPosition = { row: number; col: number }

/**
 * Numeración en serpentina (boustrophedon) desde la esquina inferior
 * izquierda: fila de abajo va de izquierda a derecha, la siguiente de
 * derecha a izquierda, alternando — el patrón visual clásico de Escaleras y
 * Serpientes.
 */
export function buildCellPositions(boardSize: number, columns: number = BOARD_COLUMNS): Map<number, CellPosition> {
  const rows = Math.ceil(boardSize / columns)
  const positions = new Map<number, CellPosition>()
  let cellNumber = 1

  for (let rowFromBottom = 0; rowFromBottom < rows; rowFromBottom++) {
    const row = rows - 1 - rowFromBottom
    const leftToRight = rowFromBottom % 2 === 0
    const colOrder = Array.from({ length: columns }, (_, i) => (leftToRight ? i : columns - 1 - i))
    for (const col of colOrder) {
      if (cellNumber > boardSize) break
      positions.set(cellNumber, { row, col })
      cellNumber++
    }
  }

  return positions
}

export function boardRowCount(boardSize: number, columns: number = BOARD_COLUMNS): number {
  return Math.ceil(boardSize / columns)
}
