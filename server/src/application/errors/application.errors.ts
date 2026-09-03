export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EmailAlreadyRegisteredError extends ApplicationError {
  constructor(email: string) {
    super(`Ya existe una cuenta registrada con el correo "${email}".`);
  }
}

export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('El correo o la contraseña son incorrectos.');
  }
}

export class UserNotFoundError extends ApplicationError {
  constructor(userId: string) {
    super(`No se encontró un usuario con id "${userId}".`);
  }
}

export class UserInactiveError extends ApplicationError {
  constructor() {
    super('El usuario está inactivo y no puede iniciar sesión.');
  }
}

export class GameNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(`No se encontró un juego con identificador "${identifier}".`);
  }
}

export class GameSlugAlreadyTakenError extends ApplicationError {
  constructor(slug: string) {
    super(`Ya existe un juego con el identificador "${slug}".`);
  }
}

export class CategoryNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(`No se encontró una categoría con identificador "${identifier}".`);
  }
}

export class CategorySlugAlreadyTakenError extends ApplicationError {
  constructor(slug: string) {
    super(`Ya existe una categoría con el identificador "${slug}".`);
  }
}

export class InvalidImageError extends ApplicationError {
  constructor(reason: string) {
    super(reason);
  }
}
