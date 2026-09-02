const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

/** Error de una respuesta HTTP. `status === 0` indica fallo de red. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

/** Mensajes por defecto cuando el servidor no envía uno legible. */
const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Correo o contraseña incorrectos.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  500: 'Error en el servidor. Intenta más tarde.',
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Extrae el mensaje de error de una respuesta de Nest, que suele tener la
 * forma `{ statusCode, message: string | string[], error }`.
 */
function extractMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload) return payload

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const { message } = payload as { message: unknown }
    if (Array.isArray(message) && message.length > 0) return String(message[0])
    if (typeof message === 'string' && message) return message
  }

  return DEFAULT_MESSAGES[status] ?? 'Ocurrió un error inesperado.'
}

/** Realiza una petición al API y devuelve el cuerpo ya deserializado. */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, token, signal } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // Una cancelación no es un error del API: se propaga tal cual.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica tu conexión.',
      0,
    )
  }

  const payload = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(extractMessage(payload, response.status), response.status)
  }

  return payload as T
}
