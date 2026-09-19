export type DualQuestRole = 'FIRE' | 'WATER'
export type DualQuestCellPosition = { row: number; col: number }
export type DualQuestDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export type DualQuestTriggerKind = 'SWITCH' | 'QUESTION'

export type DualQuestGateDraft = {
  gateId: string
  position: DualQuestCellPosition
}

export type DualQuestTriggerDraft = {
  triggerId: string
  kind: DualQuestTriggerKind
  activatedByRole: DualQuestRole
  switchPosition: DualQuestCellPosition
  gateId: string
  prompt?: string
  options?: string[]
  correctOptionIndex?: number
}

export type DualQuestGemDraft = {
  gemId: string
  role: DualQuestRole
  position: DualQuestCellPosition
  label: string
}

export const MIN_GRID_COLS = 8
export const MAX_GRID_COLS = 24
export const MIN_GRID_ROWS = 6
export const MAX_GRID_ROWS = 18
export const DEFAULT_GRID_COLS = 8
export const DEFAULT_GRID_ROWS = 6
export const MIN_GEMS_PER_ROLE = 2

/** 0 = libre, 1 = muro, 2 = solo pasable por FIRE, 3 = solo pasable por WATER. */
export type DualQuestCellValue = 0 | 1 | 2 | 3

export function buildEmptyGrid(rows: number, cols: number): DualQuestCellValue[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0 as DualQuestCellValue))
}

/** Recorta o extiende un grid existente a un nuevo tamaño, preservando el contenido que quepa (relleno con 0 = libre en las celdas nuevas). */
export function resizeGrid(grid: number[][], rows: number, cols: number): DualQuestCellValue[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => (grid[row]?.[col] as DualQuestCellValue | undefined) ?? 0),
  )
}

// --- Vistas de la sala en vivo (espejo de toDualQuestClientView en el servidor) ---

export type DualQuestRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED'

export type DualQuestGateView = {
  gateId: string
  position: DualQuestCellPosition
  open: boolean
}

export type DualQuestGemView = {
  gemId: string
  role: DualQuestRole
  label: string
  position: DualQuestCellPosition
  collected: boolean
}

/** Metadata segura del trigger: nunca `prompt`/`options`/`correctOptionIndex` (eso solo llega vía `pendingQuestion`). */
export type DualQuestTriggerView = {
  triggerId: string
  kind: DualQuestTriggerKind
  activatedByRole: DualQuestRole
  switchPosition: DualQuestCellPosition
  gateId: string
}

export type DualQuestPendingQuestionView = {
  triggerId: string
  forRole: DualQuestRole
  prompt: string
  options: string[]
}

export type DualQuestPlayerView = {
  userId: string
  displayName: string
  role: DualQuestRole
  position: DualQuestCellPosition
  ready?: boolean
  isSelf: boolean
  isHost: boolean
}

export type DualQuestRoomStateView = {
  code: string
  gameTitle: string
  coreQuestion: string
  gridCols: number
  gridRows: number
  grid: number[][]
  corePosition: DualQuestCellPosition
  gates: DualQuestGateView[]
  triggers: DualQuestTriggerView[]
  phase: DualQuestRoomPhase
  bothAtCore: boolean
  collectedGemIds: string[]
  gems: DualQuestGemView[]
  canAssemble: boolean
  pendingQuestion: DualQuestPendingQuestionView | null
  players: DualQuestPlayerView[]
}

export type DualQuestTriggerResult = {
  triggerId: string
  role: DualQuestRole
  correct: boolean
}

export type DualQuestAssemblyResult = {
  correct: boolean
}
