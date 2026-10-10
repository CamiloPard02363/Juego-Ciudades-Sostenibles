import { request } from '../utils/http'
import type { GameDraft } from './ai-game-assistant.service'
import type { GameTheme } from './game.service'

/**
 * Borrador del mismo tema en otro tipo de juego (issue #8). Es un
 * `GameDraft` más el tema del juego origen, que pre-llena los campos
 * comunes del formulario del tipo destino.
 */
export type AdaptedGameDraft = GameDraft & {
  sourceGameId: string
  title: string
  description: string
  categoryId: string
  theme: GameTheme
}

/**
 * POST /games/:id/adapt — arma un borrador del juego en otro tipo. No crea
 * ni guarda nada: el usuario lo revisa en el formulario y lo crea como un
 * juego nuevo a su nombre.
 */
export function adaptGame(
  token: string,
  gameId: string,
  input: { targetType: string; mode?: string },
): Promise<AdaptedGameDraft> {
  return request<AdaptedGameDraft>(`/games/${gameId}/adapt`, {
    method: 'POST',
    token,
    body: input,
  })
}
