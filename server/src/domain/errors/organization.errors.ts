import { DomainError } from './user.errors.js';

export class InvalidOrganizationRoleError extends DomainError {
  constructor(value: string) {
    super(`El rol de organización "${value}" no es válido.`);
  }
}

export class InvalidOrganizationNameError extends DomainError {
  constructor(reason: string) {
    super(`Nombre de organización inválido: ${reason}`);
  }
}

export class InvalidOrganizationDomainError extends DomainError {
  constructor(value: string) {
    super(`El dominio "${value}" no tiene un formato válido.`);
  }
}
