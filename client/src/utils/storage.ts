const TOKEN_KEY = 'sostenibilidad.token'

/**
 * `localStorage` lanza en modo privado o con cookies bloqueadas, así que
 * cada acceso va protegido y la app sigue funcionando sin persistencia.
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sin persistencia la sesión solo dura lo que dure la pestaña.
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}
