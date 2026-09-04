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
  /** Interno: evita reintentar refresh dos veces para la misma petición. */
  _isRetry?: boolean
}

/**
 * `AuthProvider` registra aquí cómo reaccionar cuando una petición
 * autenticada agota los reintentos de refresh: la sesión ya no es
 * recuperable y hay que cerrarla y volver al login.
 */
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

/**
 * `AuthProvider` registra aquí cómo obtener un access token nuevo usando el
 * refresh token (que vive en una cookie httpOnly, invisible para este
 * archivo). Devuelve el access token nuevo, o `null` si el refresh falló.
 */
let refreshAccessToken: (() => Promise<string | null>) | null = null

export function setRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshAccessToken = handler
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
  const { method = 'GET', body, token, signal, _isRetry = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      // El refresh token vive en una cookie httpOnly ajena a este archivo;
      // sin esto el navegador no la envía en peticiones cross-origin.
      credentials: 'include',
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
    // Un 401 en una petición sin token es "credenciales incorrectas" (login).
    // Un 401 con token es el access token vencido a mitad de sesión: se
    // intenta renovar con el refresh token antes de darse por vencido, y
    // solo si eso también falla se cierra la sesión.
    if (response.status === 401 && token && !_isRetry && refreshAccessToken) {
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        return request<T>(path, { ...options, token: newAccessToken, _isRetry: true })
      }
      unauthorizedHandler?.()
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', response.status)
    }
    throw new ApiError(extractMessage(payload, response.status), response.status)
  }

  return payload as T
}
