import { request } from '../utils/http'

type ClientEventType = 'game_opened' | 'section_viewed'

/**
 * Best-effort: si falla (red, backend con analítica apagada, etc.) no debe
 * romper ninguna interacción del usuario, así que el error se ignora.
 */
export function trackEvent(
  token: string,
  type: ClientEventType,
  data: { gameId?: string; metadata?: Record<string, unknown> } = {},
): void {
  request('/analytics/events', {
    method: 'POST',
    token,
    body: { type, ...data },
  }).catch(() => {})
}
