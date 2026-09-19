import { Organization } from '../entities/organization.entity.js';
import { OrganizationMembership } from '../entities/organization-membership.entity.js';
import type { EmailDomain } from '../value-objects/email-domain.vo.js';

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

export interface FindAllOrganizationsFilter {
  /** Substring case-insensitive contra nombre o dominio (issue #106, CA2.2). */
  search?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
}

export interface PaginatedOrganizations {
  items: Organization[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrganizationRepository {
  /**
   * Persiste la organización y la membresía del creador de forma atómica.
   * Si el dominio ya está reclamado, la violación del índice único debe
   * traducirse a `OrganizationDomainAlreadyClaimedError` — así la carrera
   * entre dos creaciones simultáneas nunca produce un 500 genérico.
   */
  createWithOwner(
    organization: Organization,
    ownerMembership: OrganizationMembership,
  ): Promise<void>;

  save(organization: Organization): Promise<void>;
  findById(id: string): Promise<Organization | null>;
  findByDomain(domain: EmailDomain): Promise<Organization | null>;
  /**
   * Query sin filtro de pertenencia — solo para ADMIN global de plataforma.
   * Con paginación, `search` (nombre o dominio) e `isActive` (issue #106,
   * CA2.2).
   */
  findAll(filter: FindAllOrganizationsFilter): Promise<PaginatedOrganizations>;
  findAllByUserId(userId: string): Promise<Organization[]>;

  saveMembership(membership: OrganizationMembership): Promise<void>;
  /**
   * A diferencia de `saveMembership` (upsert idempotente usado por el
   * auto-join), esta operación falla si ya existe la membresía — la
   * violación del índice único `(organizationId, userId)` debe traducirse a
   * `UserAlreadyMemberOfOrganizationError` en la capa de infraestructura.
   */
  createMembership(membership: OrganizationMembership): Promise<void>;
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMembership | null>;
  findMembershipsByOrganizationId(organizationId: string): Promise<OrganizationMembership[]>;
  findMembershipsByUserId(userId: string): Promise<OrganizationMembership[]>;
  /**
   * Remueve la membresía `(organizationId, userId)` (issue #106, CA3.1).
   * Idempotente: si la membresía no existe, no falla (mismo criterio que
   * `deleteMany` de Prisma) — expulsar dos veces al mismo usuario no debe dar
   * un error de negocio.
   */
  removeMembership(organizationId: string, userId: string): Promise<void>;
}
