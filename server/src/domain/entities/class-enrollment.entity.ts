export interface ClassEnrollmentProps {
  id: string;
  classId: string;
  userId: string;
  enrolledAt: Date;
}

export interface CreateClassEnrollmentProps {
  id: string;
  classId: string;
  userId: string;
}

/**
 * Vínculo N:M entre una Class y un estudiante matriculado (issue #101),
 * análogo a `OrganizationMembership`. Un estudiante puede matricularse en
 * múltiples clases sin límite; el constraint único real `(classId, userId)`
 * vive en BD (ver `ClassEnrollmentModel` en schema.prisma) — esta entidad no
 * necesita reforzarlo porque `POST /classes/join` es idempotente por diseño
 * (unirse dos veces con el mismo código no duplica la matrícula).
 */
export class ClassEnrollment {
  private readonly props: ClassEnrollmentProps;

  private constructor(props: ClassEnrollmentProps) {
    this.props = props;
  }

  static create(props: CreateClassEnrollmentProps): ClassEnrollment {
    return new ClassEnrollment({
      id: props.id,
      classId: props.classId,
      userId: props.userId,
      enrolledAt: new Date(),
    });
  }

  static fromPersistence(props: ClassEnrollmentProps): ClassEnrollment {
    return new ClassEnrollment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get classId(): string {
    return this.props.classId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get enrolledAt(): Date {
    return this.props.enrolledAt;
  }

  toPersistence(): ClassEnrollmentProps {
    return { ...this.props };
  }
}
