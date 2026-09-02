const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const MIN_PASSWORD_LENGTH = 6

/** Devuelve el mensaje de error, o `null` si el valor es válido. */
export function validateEmail(email: string): string | null {
  const value = email.trim()
  if (!value) return 'El correo es obligatorio.'
  if (!EMAIL_PATTERN.test(value)) return 'Ingresa un correo válido.'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'La contraseña es obligatoria.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return null
}
