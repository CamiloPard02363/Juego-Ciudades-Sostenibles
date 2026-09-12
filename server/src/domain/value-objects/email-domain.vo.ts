import {
  InvalidOrganizationDomainError,
  PublicEmailProviderDomainError,
} from '../errors/organization.errors.js';
import type { Email } from './email.vo.js';

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Proveedores de correo personal/público: nadie puede reclamarlos como
 * dominio de una organización, o cualquier usuario de Gmail/Outlook/etc.
 * quedaría auto-unido a una "institución" que en realidad es un proveedor
 * de correo masivo.
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
]);

/**
 * Dominio de correo reclamado por una organización (ej. `colegio.edu.co`).
 *
 * Se normaliza a minúsculas y sin espacios para que la comparación contra el
 * dominio del correo de un usuario sea exacta — el auto-join por dominio
 * depende de que ambos lados usen la misma normalización.
 *
 * Nota de alcance: no hay verificación DNS real (MX/TXT). Se confía en el
 * dominio del correo del usuario, según lo definido en el issue #29.
 */
export class EmailDomain {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(rawDomain: string): EmailDomain {
    const normalized = rawDomain.trim().toLowerCase().replace(/^@/, '');

    if (!DOMAIN_REGEX.test(normalized)) {
      throw new InvalidOrganizationDomainError(rawDomain);
    }

    return new EmailDomain(normalized);
  }

  /** Extrae el dominio de un correo ya validado (`ana@colegio.edu.co` → `colegio.edu.co`). */
  static fromEmail(email: Email): EmailDomain {
    const parts = email.getValue().split('@');
    return EmailDomain.create(parts[parts.length - 1] ?? '');
  }

  getValue(): string {
    return this.value;
  }

  isPublicEmailProvider(): boolean {
    return PUBLIC_EMAIL_PROVIDER_DOMAINS.has(this.value);
  }

  /** Lanza si el dominio pertenece a un proveedor de correo público (ver arriba). */
  assertNotPublicProvider(): void {
    if (this.isPublicEmailProvider()) {
      throw new PublicEmailProviderDomainError(this.value);
    }
  }

  equals(other: EmailDomain): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
