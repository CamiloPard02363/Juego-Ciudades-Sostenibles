import { InvalidOrganizationRoleError } from '../errors/organization.errors.js';

/**
 * Rol de un usuario **dentro de una organización** concreta.
 *
 * IMPORTANTE: es un eje ortogonal al `Role` global de plataforma
 * (`role.vo.ts`). Aunque los nombres coinciden, no son intercambiables:
 * un usuario con `Role.student()` a nivel de plataforma puede ser
 * `OrganizationRole.admin()` de una organización, y viceversa. El `Role`
 * global gobierna permisos de toda la plataforma (ver todos los usuarios,
 * gestionar cualquier juego); el `OrganizationRole` solo aplica dentro de
 * la organización a la que pertenece la membresía.
 */
export type OrganizationRoleName = 'STUDENT' | 'TEACHER' | 'ADMIN';

const VALID_ORGANIZATION_ROLE_NAMES: readonly OrganizationRoleName[] = [
  'STUDENT',
  'TEACHER',
  'ADMIN',
];

export class OrganizationRole {
  private static readonly instances = new Map<OrganizationRoleName, OrganizationRole>();

  private readonly name: OrganizationRoleName;

  private constructor(name: OrganizationRoleName) {
    this.name = name;
  }

  static create(name: string): OrganizationRole {
    const normalized = name.trim().toUpperCase() as OrganizationRoleName;

    if (!VALID_ORGANIZATION_ROLE_NAMES.includes(normalized)) {
      throw new InvalidOrganizationRoleError(name);
    }

    const cached = OrganizationRole.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const role = new OrganizationRole(normalized);
    OrganizationRole.instances.set(normalized, role);
    return role;
  }

  static student(): OrganizationRole {
    return OrganizationRole.create('STUDENT');
  }

  static teacher(): OrganizationRole {
    return OrganizationRole.create('TEACHER');
  }

  static admin(): OrganizationRole {
    return OrganizationRole.create('ADMIN');
  }

  getName(): OrganizationRoleName {
    return this.name;
  }

  equals(other: OrganizationRole): boolean {
    return this.name === other.name;
  }

  isStudent(): boolean {
    return this.name === 'STUDENT';
  }

  isTeacher(): boolean {
    return this.name === 'TEACHER';
  }

  isAdmin(): boolean {
    return this.name === 'ADMIN';
  }

  toString(): string {
    return this.name;
  }
}
