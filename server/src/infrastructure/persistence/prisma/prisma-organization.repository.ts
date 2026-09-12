import { Injectable } from '@nestjs/common';
import type { OrganizationRepository } from '../../../domain/ports/organization.repository.port.js';
import type { Organization } from '../../../domain/entities/organization.entity.js';
import type { OrganizationMembership } from '../../../domain/entities/organization-membership.entity.js';
import type { EmailDomain } from '../../../domain/value-objects/email-domain.vo.js';
import { OrganizationDomainAlreadyClaimedError } from '../../../application/errors/application.errors.js';
import { PrismaService } from './prisma.service.js';
import {
  OrganizationMapper,
  OrganizationMembershipMapper,
} from './organization.mapper.js';

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

function isUniqueConstraintViolation(error: unknown, target: string): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== UNIQUE_CONSTRAINT_ERROR_CODE) return false;

  const rawTarget = candidate.meta?.target;
  const targets = Array.isArray(rawTarget)
    ? rawTarget.map(String)
    : [String(rawTarget ?? '')];

  return targets.some((value) => value.includes(target));
}

@Injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Organización + membresía del creador en una sola transacción: si la
   * membresía fallara, no queremos dejar una organización huérfana sin ADMIN.
   * La violación del índice único de `domain` se traduce a error de negocio
   * para que la carrera entre dos creadores no escape como 500 genérico.
   */
  async createWithOwner(
    organization: Organization,
    ownerMembership: OrganizationMembership,
  ): Promise<void> {
    const orgData = OrganizationMapper.toPersistence(organization);
    const membershipData = OrganizationMembershipMapper.toPersistence(ownerMembership);

    try {
      await this.prisma.$transaction([
        this.prisma.organizationModel.create({ data: orgData }),
        this.prisma.organizationMembershipModel.create({ data: membershipData }),
      ]);
    } catch (error) {
      if (isUniqueConstraintViolation(error, 'domain')) {
        throw new OrganizationDomainAlreadyClaimedError(orgData.domain ?? '');
      }
      throw error;
    }
  }

  async save(organization: Organization): Promise<void> {
    const data = OrganizationMapper.toPersistence(organization);

    try {
      await this.prisma.organizationModel.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error, 'domain')) {
        throw new OrganizationDomainAlreadyClaimedError(data.domain ?? '');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Organization | null> {
    const record = await this.prisma.organizationModel.findUnique({ where: { id } });
    return record ? OrganizationMapper.toDomain(record) : null;
  }

  async findByDomain(domain: EmailDomain): Promise<Organization | null> {
    const record = await this.prisma.organizationModel.findUnique({
      where: { domain: domain.getValue() },
    });
    return record ? OrganizationMapper.toDomain(record) : null;
  }

  async findAll(): Promise<Organization[]> {
    const records = await this.prisma.organizationModel.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(OrganizationMapper.toDomain);
  }

  async findAllByUserId(userId: string): Promise<Organization[]> {
    const records = await this.prisma.organizationModel.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(OrganizationMapper.toDomain);
  }

  /**
   * Idempotente por diseño: el auto-join por dominio corre en cada login, así
   * que un `upsert` sobre `(organizationId, userId)` evita tanto duplicados
   * como pisar el rol de alguien ya ascendido — el `update` no toca `orgRole`.
   */
  async saveMembership(membership: OrganizationMembership): Promise<void> {
    const data = OrganizationMembershipMapper.toPersistence(membership);

    await this.prisma.organizationMembershipModel.upsert({
      where: {
        organizationId_userId: {
          organizationId: data.organizationId,
          userId: data.userId,
        },
      },
      create: data,
      update: { orgRole: data.orgRole },
    });
  }

  async findMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | null> {
    const record = await this.prisma.organizationMembershipModel.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    return record ? OrganizationMembershipMapper.toDomain(record) : null;
  }

  async findMembershipsByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMembership[]> {
    const records = await this.prisma.organizationMembershipModel.findMany({
      where: { organizationId },
      orderBy: { joinedAt: 'asc' },
    });
    return records.map(OrganizationMembershipMapper.toDomain);
  }

  async findMembershipsByUserId(userId: string): Promise<OrganizationMembership[]> {
    const records = await this.prisma.organizationMembershipModel.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });
    return records.map(OrganizationMembershipMapper.toDomain);
  }
}
