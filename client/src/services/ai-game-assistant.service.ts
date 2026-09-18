import { ApiError } from '../utils/http'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type GameDraft = {
  config: Record<string, unknown>
  content: unknown[]
}

/**
 * POST /games/ai-draft — sube archivos propios del usuario (nunca un link) y
 * devuelve un borrador de config/content ya validado con las mismas reglas
 * que la creación manual del juego. No crea ni guarda ningún juego.
 */
export async function generateGameDraft(
  token: string,
  gameType: string,
  files: File[],
): Promise<GameDraft> {
  const formData = new FormData()
  formData.append('gameType', gameType)
  for (const file of files) formData.append('files', file)

  const response = await fetch(`${API_URL}/games/ai-draft`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: formData,
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : 'No se pudo configurar el juego con IA.'
    throw new ApiError(message, response.status)
  }

  return payload as GameDraft
}
