import { InvalidClassNameError } from '../errors/class.errors.js';

export interface ClassProps {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  /** Organización personal del profesor (issue #101). `null` para clases previas a la migración. */
  organizationId: string | null;
  /** Código de invitación estático generado una vez al crear la clase (no rota). */
  inviteCode: string;
  createdAt: Date;
  /**
   * Soft-delete de la clase (issue #133, Frente E). Desactivada = no admite
   * nuevas matrículas (join directo o por código), pero las `ClassEnrollment`
   * existentes NO se tocan — decisión de producto confirmada por Manuel.
   * Mismo patrón que `Organization.isActive`.
   */
  isActive: boolean;
}

export interface CreateClassProps {
  id: string;
  name: string;
  description?: string;
  teacherUserId: string;
  organizationId?: string | null;
  inviteCode: string;
}

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 80;

export class ClassEntity {
  private constructor(private readonly props: ClassProps) {}

  static create(props: CreateClassProps): ClassEntity {
    const name = props.name.trim();
    if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      throw new InvalidClassNameError();
    }

    return new ClassEntity({
      id: props.id,
      name,
      description: props.description?.trim() ?? '',
      teacherUserId: props.teacherUserId,
      organizationId: props.organizationId ?? null,
      inviteCode: props.inviteCode,
      createdAt: new Date(),
      isActive: true,
    });
  }

  static fromPersistence(props: ClassProps): ClassEntity {
    return new ClassEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get teacherUserId(): string {
    return this.props.teacherUserId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get inviteCode(): string {
    return this.props.inviteCode;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  reactivate(): void {
    this.props.isActive = true;
  }

  toPersistence(): ClassProps {
    return { ...this.props };
  }
}
