import type {
  OrganizationMembershipModel,
  OrganizationModel,
} from '../../../generated/prisma/client.js';
import { Organization } from '../../../domain/entities/organization.entity.js';
import { OrganizationMembership } from '../../../domain/entities/organization-membership.entity.js';
import { EmailDomain } from '../../../domain/value-objects/email-domain.vo.js';
import { OrganizationRole } from '../../../domain/value-objects/organization-role.vo.js';

export class OrganizationMapper {
  static toDomain(record: OrganizationModel): Organization {
    return Organization.fromPersistence({
      id: record.id,
      name: record.name,
      domain: record.domain ? EmailDomain.create(record.domain) : null,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt,
    });
  }

  static toPersistence(organization: Organization) {
    const props = organization.toPersistence();

    return {
      id: props.id,
      name: props.name,
      domain: props.domain?.getValue() ?? null,
      createdByUserId: props.createdByUserId,
      createdAt: props.createdAt,
    };
  }
}

export class OrganizationMembershipMapper {
  static toDomain(record: OrganizationMembershipModel): OrganizationMembership {
    return OrganizationMembership.fromPersistence({
      organizationId: record.organizationId,
      userId: record.userId,
      orgRole: OrganizationRole.create(record.orgRole),
      joinedAt: record.joinedAt,
    });
  }

  static toPersistence(membership: OrganizationMembership) {
    const props = membership.toPersistence();

    return {
      organizationId: props.organizationId,
      userId: props.userId,
      orgRole: props.orgRole.getName(),
      joinedAt: props.joinedAt,
    };
  }
}
