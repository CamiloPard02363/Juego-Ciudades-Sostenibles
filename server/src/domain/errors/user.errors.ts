export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidEmailError extends DomainError {
  constructor(value: string) {
    super(`El correo "${value}" no tiene un formato válido.`);
  }
}

export class InvalidPasswordError extends DomainError {
  constructor(reason: string) {
    super(`Contraseña inválida: ${reason}`);
  }
}

export class InvalidPersonNameError extends DomainError {
  constructor(field: string, reason: string) {
    super(`Nombre inválido en "${field}": ${reason}`);
  }
}

export class InvalidRoleError extends DomainError {
  constructor(value: string) {
    super(`El rol "${value}" no es válido.`);
  }
}

export class InvalidUserStateError extends DomainError {
  constructor(reason: string) {
    super(`Operación inválida sobre el usuario: ${reason}`);
  }
}
