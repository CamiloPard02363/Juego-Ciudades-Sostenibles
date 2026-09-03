import { ApiError } from '../utils/http'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type UploadFolder = 'game-covers' | 'memory-cards'

/** POST /uploads/image — sube una imagen a Cloudinary y devuelve su URL pública. */
export async function uploadImage(
  token: string,
  file: File,
  folder: UploadFolder,
): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/uploads/image?folder=${folder}`, {
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
        : 'No se pudo subir la imagen.'
    throw new ApiError(message, response.status)
  }

  return payload as { url: string }
}
