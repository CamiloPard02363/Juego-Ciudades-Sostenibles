import { InvalidPasswordError } from '../errors/user.errors.js';

const MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;

export class Password {
  private readonly hashedValue: string | null;

  private constructor(hashedValue: string | null) {
    this.hashedValue = hashedValue;
  }

  /** Valida una contraseña en texto plano antes de que infraestructura la hashee. */
  static assertIsStrong(plainPassword: string): void {
    if (plainPassword.length < MIN_LENGTH) {
      throw new InvalidPasswordError(`debe tener al menos ${MIN_LENGTH} caracteres.`);
    }
    if (!HAS_UPPERCASE.test(plainPassword)) {
      throw new InvalidPasswordError('debe contener al menos una letra mayúscula.');
    }
    if (!HAS_LOWERCASE.test(plainPassword)) {
      throw new InvalidPasswordError('debe contener al menos una letra minúscula.');
    }
    if (!HAS_NUMBER.test(plainPassword)) {
      throw new InvalidPasswordError('debe contener al menos un número.');
    }
  }

  /** Reconstruye el VO a partir de un hash ya generado (persistencia o casos de uso). */
  static fromHash(hashedValue: string): Password {
    if (!hashedValue) {
      throw new InvalidPasswordError('el hash no puede estar vacío.');
    }
    return new Password(hashedValue);
  }

  /**
   * Issue #197: representa un usuario sin contraseña local (login solo por
   * proveedor externo, ej. Google). Estado explícito en vez de un hash vacío
   * o inventado — evita que un valor mágico pase por alto una comparación
   * de bcrypt.
   */
  static none(): Password {
    return new Password(null);
  }

  hasPassword(): boolean {
    return this.hashedValue !== null;
  }

  getHashedValue(): string {
    if (this.hashedValue === null) {
      throw new InvalidPasswordError('este usuario no tiene contraseña local.');
    }
    return this.hashedValue;
  }
}
