import { DomainError } from './user.errors.js';

export class InvalidCategoryNameError extends DomainError {
  constructor(reason: string) {
    super(`Nombre de categoría inválido: ${reason}`);
  }
}
