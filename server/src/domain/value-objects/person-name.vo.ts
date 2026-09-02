import { InvalidPersonNameError } from '../errors/user.errors.js';

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/;
const MAX_LENGTH = 60;

export class PersonName {
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;

  private constructor(firstName: string, middleName: string | null, lastName: string) {
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
  }

  static create(firstName: string, lastName: string, middleName?: string | null): PersonName {
    const cleanFirstName = PersonName.validateRequired('first_name', firstName);
    const cleanLastName = PersonName.validateRequired('last_name', lastName);
    const cleanMiddleName = middleName?.trim()
      ? PersonName.validateOptional('middle_name', middleName)
      : null;

    return new PersonName(cleanFirstName, cleanMiddleName, cleanLastName);
  }

  private static validateRequired(field: string, value: string): string {
    const trimmed = value?.trim() ?? '';

    if (trimmed.length === 0) {
      throw new InvalidPersonNameError(field, 'es obligatorio.');
    }
    return PersonName.validateFormat(field, trimmed);
  }

  private static validateOptional(field: string, value: string): string {
    return PersonName.validateFormat(field, value.trim());
  }

  private static validateFormat(field: string, value: string): string {
    if (value.length > MAX_LENGTH) {
      throw new InvalidPersonNameError(field, `no puede superar ${MAX_LENGTH} caracteres.`);
    }
    if (!NAME_REGEX.test(value)) {
      throw new InvalidPersonNameError(field, 'contiene caracteres no permitidos.');
    }
    return value;
  }

  getFullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
}
