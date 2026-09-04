import { InvalidUserStateError } from '../errors/user.errors.js';
import { Email } from '../value-objects/email.vo.js';
import { Password } from '../value-objects/password.vo.js';
import { PersonName } from '../value-objects/person-name.vo.js';
import { Role } from '../value-objects/role.vo.js';

export interface UserProps {
  id: string;
  email: Email;
  password: Password;
  name: PersonName;
  role: Role;
  displayName: string;
  avatarUrl: string | null;
  birthDate: Date | null;
  locale: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  lastUpdate: Date;
}

export interface CreateUserProps {
  id: string;
  email: Email;
  password: Password;
  name: PersonName;
  role?: Role;
  displayName?: string;
  avatarUrl?: string | null;
  birthDate?: Date | null;
  locale?: string;
}

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static create(props: CreateUserProps): User {
    const now = new Date();

    return new User({
      id: props.id,
      email: props.email,
      password: props.password,
      name: props.name,
      role: props.role ?? Role.student(),
      displayName: props.displayName?.trim() || props.name.firstName,
      avatarUrl: props.avatarUrl ?? null,
      birthDate: props.birthDate ?? null,
      locale: props.locale ?? 'es-CO',
      isActive: true,
      isEmailVerified: false,
      lastLoginAt: null,
      createdAt: now,
      lastUpdate: now,
    });
  }

  /** Reconstruye una instancia existente desde persistencia, sin reaplicar reglas de creación. */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get password(): Password {
    return this.props.password;
  }

  get name(): PersonName {
    return this.props.name;
  }

  get role(): Role {
    return this.props.role;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get birthDate(): Date | null {
    return this.props.birthDate;
  }

  get locale(): string {
    return this.props.locale;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastUpdate(): Date {
    return this.props.lastUpdate;
  }

  changePassword(newPassword: Password): void {
    this.props.password = newPassword;
    this.touch();
  }

  changeName(newName: PersonName): void {
    this.props.name = newName;
    this.touch();
  }

  changeDisplayName(newDisplayName: string): void {
    const trimmed = newDisplayName.trim();

    if (!trimmed) {
      throw new InvalidUserStateError('el nombre visible no puede estar vacío.');
    }
    this.props.displayName = trimmed;
    this.touch();
  }

  changeAvatar(avatarUrl: string | null): void {
    this.props.avatarUrl = avatarUrl;
    this.touch();
  }

  changeRole(newRole: Role): void {
    this.props.role = newRole;
    this.touch();
  }

  verifyEmail(): void {
    if (this.props.isEmailVerified) {
      throw new InvalidUserStateError('el correo ya está verificado.');
    }
    this.props.isEmailVerified = true;
    this.touch();
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new InvalidUserStateError('el usuario ya está inactivo.');
    }
    this.props.isActive = false;
    this.touch();
  }

  reactivate(): void {
    if (this.props.isActive) {
      throw new InvalidUserStateError('el usuario ya está activo.');
    }
    this.props.isActive = true;
    this.touch();
  }

  registerLogin(loginDate: Date = new Date()): void {
    if (!this.props.isActive) {
      throw new InvalidUserStateError('un usuario inactivo no puede iniciar sesión.');
    }
    this.props.lastLoginAt = loginDate;
    this.touch();
  }

  isTeacher(): boolean {
    return this.props.role.isTeacher();
  }

  isAdmin(): boolean {
    return this.props.role.isAdmin();
  }

  /** Regla de negocio: solo ADMIN puede listar/gestionar el conjunto completo de usuarios. */
  canManageUsers(): boolean {
    return this.props.role.isAdmin();
  }

  /** Regla de negocio: ADMIN y TEACHER pueden ver el progreso/perfiles de estudiantes. */
  canViewLearningData(): boolean {
    return this.props.role.isAdmin() || this.props.role.isTeacher();
  }

  private touch(): void {
    this.props.lastUpdate = new Date();
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }
}
