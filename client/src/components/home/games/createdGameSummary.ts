import { gameInstructionSummaries, type CreationInstructionKind } from './gameInstructions'
import { isMultiplayerGameType } from './gameModeVisuals'

/** Los 7 formularios de creación que terminan en `SaveVisibilityModal`. */
export type CreatedGameKind =
  | 'PAIRS'
  | 'OPPOSITES'
  | 'GUESS_WHO'
  | 'DOMINO'
  | 'MAZE_COLLECTOR'
  | 'SNAKES_LADDERS'
  | 'DUAL_QUEST'

/**
 * Mapeo explícito de cada formulario de creación a (issue #245):
 * - `label`: nombre visible del tipo, el mismo título que muestra su formulario
 *   y el selector de tipo/modo (GameTypePicker, GameModePicker).
 * - `gameType`: el `Game.gameType` que guarda el formulario; de ahí sale el
 *   modo (1 jugador / multijugador) vía `isMultiplayerGameType`.
 * - `instructionKind`: la clave de `gameInstructions` con la que se juega lo
 *   recién creado. Ojo: ¿Quién Es? se crea como GUESS_WHO (el torneo
 *   GUESS_WHO_GROUP es solo una forma de jugarlo) y Dúo Lógico se crea como
 *   DUAL_QUEST (no DUAL_QUEST_PIXI, que es el motor de demo aparte).
 */
const CREATED_GAME_KINDS: Record<CreatedGameKind, { label: string; gameType: string; instructionKind: CreationInstructionKind }> = {
  PAIRS: { label: 'Pares', gameType: 'MEMORY_MATCH', instructionKind: 'PAIRS' },
  OPPOSITES: { label: 'Conceptos opuestos', gameType: 'MEMORY_MATCH', instructionKind: 'OPPOSITES' },
  GUESS_WHO: { label: '¿Quién Es?', gameType: 'GUESS_WHO', instructionKind: 'GUESS_WHO' },
  DOMINO: { label: 'Dominó', gameType: 'DOMINO', instructionKind: 'DOMINO' },
  MAZE_COLLECTOR: { label: 'Recolector de laberinto', gameType: 'MAZE_COLLECTOR', instructionKind: 'MAZE_COLLECTOR' },
  SNAKES_LADDERS: { label: 'Escaleras y Serpientes', gameType: 'SNAKES_LADDERS', instructionKind: 'SNAKES_LADDERS' },
  DUAL_QUEST: { label: 'Dúo Lógico', gameType: 'DUAL_QUEST', instructionKind: 'DUAL_QUEST' },
}

export type CreatedGameSummary = {
  typeLabel: string
  gameType: string
  isMultiplayer: boolean
  purpose: string
  howTo: string
}

export function summarizeCreatedGame(kind: CreatedGameKind): CreatedGameSummary {
  const { label, gameType, instructionKind } = CREATED_GAME_KINDS[kind]
  const { purpose, howTo } = gameInstructionSummaries[instructionKind]
  return { typeLabel: label, gameType, isMultiplayer: isMultiplayerGameType(gameType), purpose, howTo }
}
