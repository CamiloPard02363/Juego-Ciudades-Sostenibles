import { OrganizationRole } from '../value-objects/organization-role.vo.js';

export interface OrganizationMembershipProps {
  organizationId: string;
  userId: string;
  orgRole: OrganizationRole;
  joinedAt: Date;
}

export interface CreateOrganizationMembershipProps {
  organizationId: string;
  userId: string;
  orgRole: OrganizationRole;
}

/**
 * Vínculo N:N entre un usuario y una organización, con el rol que ese usuario
 * tiene **dentro de esa organización**. La identidad de la membresía es el par
 * `(organizationId, userId)` — no tiene id propio, y la BD lo respalda con un
 * constraint único compuesto. Un mismo usuario puede tener varias membresías
 * (una por organización) con roles distintos en cada una.
 */
export class OrganizationMembership {
  private props: OrganizationMembershipProps;

  private constructor(props: OrganizationMembershipProps) {
    this.props = props;
  }

  static create(props: CreateOrganizationMembershipProps): OrganizationMembership {
    return new OrganizationMembership({
      organizationId: props.organizationId,
      userId: props.userId,
      orgRole: props.orgRole,
      joinedAt: new Date(),
    });
  }

  static fromPersistence(props: OrganizationMembershipProps): OrganizationMembership {
    return new OrganizationMembership(props);
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get orgRole(): OrganizationRole {
    return this.props.orgRole;
  }

  get joinedAt(): Date {
    return this.props.joinedAt;
  }

  isAdmin(): boolean {
    return this.props.orgRole.isAdmin();
  }

  changeRole(newRole: OrganizationRole): void {
    this.props.orgRole = newRole;
  }

  toPersistence(): OrganizationMembershipProps {
    return { ...this.props };
  }
}
