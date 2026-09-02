import { InvalidRoleError } from '../errors/user.errors.js';

export type RoleName = 'STUDENT' | 'TEACHER' | 'ADMIN';

const VALID_ROLE_NAMES: readonly RoleName[] = ['STUDENT', 'TEACHER', 'ADMIN'];

export class Role {
  private static readonly instances = new Map<RoleName, Role>();

  private readonly name: RoleName;

  private constructor(name: RoleName) {
    this.name = name;
  }

  static create(name: string): Role {
    const normalized = name.trim().toUpperCase() as RoleName;

    if (!VALID_ROLE_NAMES.includes(normalized)) {
      throw new InvalidRoleError(name);
    }

    const cached = Role.instances.get(normalized);
    if (cached) {
      return cached;
    }

    const role = new Role(normalized);
    Role.instances.set(normalized, role);
    return role;
  }

  static student(): Role {
    return Role.create('STUDENT');
  }

  static teacher(): Role {
    return Role.create('TEACHER');
  }

  static admin(): Role {
    return Role.create('ADMIN');
  }

  getName(): RoleName {
    return this.name;
  }

  equals(other: Role): boolean {
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
