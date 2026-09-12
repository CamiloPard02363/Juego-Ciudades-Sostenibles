import { Organization } from '../entities/organization.entity.js';
import { OrganizationMembership } from '../entities/organization-membership.entity.js';
import type { EmailDomain } from '../value-objects/email-domain.vo.js';

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

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
  /** Query sin filtro de pertenencia — solo para ADMIN global de plataforma. */
  findAll(): Promise<Organization[]>;
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
}
