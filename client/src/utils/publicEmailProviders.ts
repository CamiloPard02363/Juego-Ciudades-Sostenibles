/**
 * Espejo en frontend de `PUBLIC_EMAIL_PROVIDER_DOMAINS` en
 * `server/src/domain/value-objects/email-domain.vo.ts`. Se usa solo para
 * decidir si mostramos el banner de "fundar organización" sin round-trip al
 * servidor — la fuente de verdad real sigue siendo el backend, que rechaza
 * el intento igualmente si esta lista queda desactualizada.
 */
const PUBLIC_EMAIL_PROVIDER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.es',
  'hotmail.com',
  'hotmail.es',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'gmx.com',
  'yandex.com',
])

export function isPublicEmailProviderDomain(domain: string): boolean {
  return PUBLIC_EMAIL_PROVIDER_DOMAINS.has(domain.trim().toLowerCase())
}

export function getEmailDomain(email: string): string {
  const parts = email.trim().toLowerCase().split('@')
  return parts[parts.length - 1] ?? ''
}
