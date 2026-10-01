export interface InvitationProps {
  id: string;
  tokenHash: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  classId: string | null;
  invitedByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

export interface CreateInvitationProps {
  id: string;
  tokenHash: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  classId?: string | null;
  invitedByUserId: string;
  expiresAt: Date;
}

/**
 * Invitación nominal (issue #232): alta manual de un estudiante que aún no
 * tiene cuenta, vía link con token de un solo uso y expirable — MVP sin
 * envío de email real, el admin/profesor copia y distribuye el link.
 *
 * `classId` null = invitación solo a la organización; `classId` presente =
 * invitación a una clase específica, que al aceptarse matricula también en
 * `organizationId` (la organización dueña de esa clase).
 *
 * El token en claro nunca se persiste (mismo patrón que `RefreshToken`):
 * solo se guarda `tokenHash`, resuelto con `OpaqueTokenGenerator`.
 */
export class Invitation {
  private props: InvitationProps;

  private constructor(props: InvitationProps) {
    this.props = props;
  }

  static create(props: CreateInvitationProps): Invitation {
    return new Invitation({
      id: props.id,
      tokenHash: props.tokenHash,
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      organizationId: props.organizationId,
      classId: props.classId ?? null,
      invitedByUserId: props.invitedByUserId,
      createdAt: new Date(),
      expiresAt: props.expiresAt,
      acceptedAt: null,
    });
  }

  static fromPersistence(props: InvitationProps): Invitation {
    return new Invitation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get email(): string {
    return this.props.email;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get classId(): string | null {
    return this.props.classId;
  }

  get invitedByUserId(): string {
    return this.props.invitedByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  isAccepted(): boolean {
    return this.props.acceptedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  /** `true` si el token todavía puede usarse para completar el registro. */
  isPending(now: Date = new Date()): boolean {
    return !this.isAccepted() && !this.isExpired(now);
  }

  accept(): void {
    this.props.acceptedAt = new Date();
  }

  toPersistence(): InvitationProps {
    return { ...this.props };
  }
}
