import { InvalidEmailError } from '../errors/user.errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(rawEmail: string): Email {
    const normalized = rawEmail.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      throw new InvalidEmailError(rawEmail);
    }

    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
