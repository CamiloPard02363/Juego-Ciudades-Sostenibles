import { LIVE_ROOM_GAME_TYPES } from './resolveRoomCode'

export type GameModeFilter = 'SOLO' | 'MULTI'

/**
 * Colores fijos por modo de juego (issue #216), acordes a la paleta que ya
 * usa el resto de la plataforma (mismos tonos que CATEGORY_RULES en
 * gamesCatalogVisuals.ts): azul para 1 jugador (calma, concentración
 * individual) y magenta/rosa para multijugador (el mismo tono que usa el
 * botón "Unirme con código" en GamesSection, por asociación con jugar con
 * más personas). A diferencia del color por materia (colorForCategory), este
 * NO depende de la categoría del juego — es siempre el mismo para que la
 * insignia de modo sea reconocible de un vistazo en cualquier tarjeta.
 */
export const SOLO_MODE_COLOR = '#3b82f6'
export const MULTI_MODE_COLOR = '#ec4899'

export function modeColorForGameType(gameType: string): string {
  return isMultiplayerGameType(gameType) ? MULTI_MODE_COLOR : SOLO_MODE_COLOR
}

export function isMultiplayerGameType(gameType: string): boolean {
  return LIVE_ROOM_GAME_TYPES.includes(gameType)
}

export function modeFilterForGameType(gameType: string): GameModeFilter {
  return isMultiplayerGameType(gameType) ? 'MULTI' : 'SOLO'
}
