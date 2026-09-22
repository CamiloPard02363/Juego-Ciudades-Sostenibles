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

export class GameImportJobNotFoundError extends ApplicationError {
  constructor(jobId: string) {
    super(`No se encontró un trabajo de importación con id "${jobId}".`);
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

export class ClassNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(`No se encontró una clase con identificador "${identifier}".`);
  }
}

export class SubjectNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(`No se encontró una materia con identificador "${identifier}".`);
  }
}

export class SubjectSlugAlreadyTakenError extends ApplicationError {
  constructor(slug: string) {
    super(`Ya existe una materia con el identificador "${slug}".`);
  }
}

export class ParentSubjectNotFoundError extends ApplicationError {
  constructor(parentSubjectId: string) {
    super(`No se encontró la materia raíz "${parentSubjectId}" para crear la sub-materia.`);
  }
}

export class OrganizationNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(`No se encontró una organización con identificador "${identifier}".`);
  }
}

/**
 * Error de negocio explícito para la carrera por dominio: se lanza tanto en el
 * chequeo previo como al traducir la violación del índice único de
 * `organizations.domain`, para que el segundo creador nunca reciba un 500.
 */
export class OrganizationDomainAlreadyClaimedError extends ApplicationError {
  constructor(domain: string) {
    super(`El dominio "${domain}" ya fue reclamado por otra organización.`);
  }
}

export class NotAnOrganizationMemberError extends ApplicationError {
  constructor(organizationName: string) {
    super(`Debes pertenecer a la institución "${organizationName}" para realizar esta acción.`);
  }
}

/**
 * Error de negocio explícito tanto para el chequeo previo (findMembership)
 * como para la traducción de la violación del índice único compuesto
 * `(organizationId, userId)` — ver el catch de P2002 en
 * PrismaOrganizationRepository.createMembership().
 */
export class UserAlreadyMemberOfOrganizationError extends ApplicationError {
  constructor(organizationId: string) {
    super(`El usuario ya es miembro de la organización "${organizationId}".`);
  }
}

export class InvalidImageError extends ApplicationError {
  constructor(reason: string) {
    super(reason);
  }
}

/**
 * Issue #133, Frente E (CA-E5): la clase está desactivada y no admite nuevas
 * matrículas, ni por código de invitación (`POST /classes/join`) ni por
 * matrícula directa del profesor (`POST /classes/:classId/enrollments`).
 */
export class ClassInactiveError extends ApplicationError {
  constructor() {
    super('Esta clase está inactiva y no admite nuevas matrículas.');
  }
}

/**
 * Issue #133, Frente C (CA-C2): la clase no tiene `organizationId`, así que
 * no aplica el concepto de "estudiantes de mi organización" para matricular
 * directo sin código de invitación.
 */
export class ClassHasNoOrganizationError extends ApplicationError {
  constructor(classId: string) {
    super(`La clase "${classId}" no está asociada a ninguna organización.`);
  }
}

/**
 * Issue #133, Frente A (CA-A2): el `inviteCode` de organización no coincide
 * con ninguna organización — análogo a `ClassNotFoundError` para
 * `POST /classes/join`.
 */
export class OrganizationNotFoundByInviteCodeError extends ApplicationError {
  constructor(inviteCode: string) {
    super(`No se encontró una organización con el código de invitación "${inviteCode}".`);
  }
}

/**
 * Issue #133, Frente F (CA-F2): nadie puede cambiar su propio rol dentro de
 * una organización, ni siquiera un ADMIN sobre sí mismo.
 */
export class CannotChangeOwnOrganizationRoleError extends ApplicationError {
  constructor() {
    super('No puedes cambiar tu propio rol dentro de la organización.');
  }
}

/**
 * Issue #133, Frente F (CA-F1): el usuario objetivo del cambio de rol no es
 * miembro de la organización indicada.
 */
export class TargetUserNotMemberOfOrganizationError extends ApplicationError {
  constructor(organizationId: string) {
    super(`El usuario no es miembro de la organización "${organizationId}".`);
  }
}
