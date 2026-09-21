/**
 * Edad en años cumplidos a partir de una fecha de nacimiento ISO
 * ("YYYY-MM-DD" o con hora), ajustada por mes/día (no un simple resta de
 * años). `null` si no hay fecha registrada.
 */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

/** Umbral de segmentación: menos de esta edad entra al Modo Kids. */
export const KIDS_MODE_MAX_AGE = 10

/**
 * Único punto de verdad de "esta cuenta ve el Modo Kids" — antes era
 * `role === 'STUDENT'` a secas (todo estudiante, sin importar la edad). Ahora
 * además hace falta que sea menor de `KIDS_MODE_MAX_AGE` años. Sin fecha de
 * nacimiento registrada se trata como NO-Kids (adulto) por defecto — nunca al
 * revés — para no asumir de más sobre una cuenta con datos incompletos.
 */
export function isKidsMode(user: { role: string; birthDate: string | null } | null | undefined): boolean {
  if (!user || user.role !== 'STUDENT') return false
  const age = calculateAge(user.birthDate)
  return age !== null && age < KIDS_MODE_MAX_AGE
}
