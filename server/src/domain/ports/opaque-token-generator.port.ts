export const OPAQUE_TOKEN_GENERATOR = Symbol('OPAQUE_TOKEN_GENERATOR');

/**
 * Genera y resume tokens opacos (no JWT) de alta entropía, usados para
 * refresh tokens. Distinto de `PasswordHasher`: ese usa bcrypt (lento a
 * propósito, para resistir fuerza bruta sobre contraseñas de baja entropía);
 * un refresh token ya es aleatorio de alta entropía, así que basta un hash
 * rápido (SHA-256) para no pagar el costo de bcrypt en cada refresh.
 */
export interface OpaqueTokenGenerator {
  generate(): string;
  hash(token: string): string;
}
