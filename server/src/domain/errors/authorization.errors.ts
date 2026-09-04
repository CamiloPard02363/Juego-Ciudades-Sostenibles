import { DomainError } from './user.errors.js';

export class ForbiddenActionError extends DomainError {
  constructor(action: string) {
    super(`No tiene permisos para realizar la acción: "${action}".`);
  }
}
