import { Inject, Injectable, Logger } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity.js';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  INVITE_CODE_GENERATOR,
  type InviteCodeGenerator,
} from '../../domain/ports/invite-code-generator.port.js';
import type { User } from '../../domain/entities/user.entity.js';

/**
 * Garantiza que un usuario TEACHER tenga su propia Organization unipersonal,
 * quedando ADMIN de ella — sin flujo manual (issue #101).
 *
 * Reutiliza `OrganizationRepository.createWithOwner` (misma operación
 * atómica que usa `CreateOrganizationUseCase` cuando cualquier usuario crea
 * una organización a mano); este servicio solo decide *cuándo* y con qué
 * nombre se dispara esa creación para el caso TEACHER, sin duplicar la
 * lógica de persistencia.
 *
 * Se invoca en dos puntos: al crear la primera Class del profesor (el punto
 * más natural, ver `CreateClassUseCase`) y de forma idempotente — si ya tiene
 * una organización personal, no crea una segunda.
 */
@Injectable()
export class TeacherPersonalOrganizationService {
  private readonly logger = new Logger(TeacherPersonalOrganizationService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    @Inject(INVITE_CODE_GENERATOR) private readonly inviteCodeGenerator: InviteCodeGenerator,
  ) {}

  /**
   * Devuelve el id de la organización personal del profesor, creándola si
   * todavía no existe. Idempotente: si el profesor ya es ADMIN de alguna
   * organización sin dominio reclamado creada por él mismo, la reutiliza en
   * vez de crear una nueva en cada llamada.
   */
  async ensurePersonalOrganization(teacher: User): Promise<string> {
    const existing = await this.findExistingPersonalOrganization(teacher.id);
    if (existing) {
      return existing.id;
    }

    const organization = Organization.create({
      id: this.idGenerator.generate(),
      name: `Organización de ${teacher.displayName}`,
      domain: null,
      createdByUserId: teacher.id,
      inviteCode: await this.generateUniqueInviteCode(),
    });

    const ownerMembership = OrganizationMembership.create({
      organizationId: organization.id,
      userId: teacher.id,
      orgRole: OrganizationRole.admin(),
    });

    await this.organizationRepository.createWithOwner(organization, ownerMembership);

    return organization.id;
  }

  private async findExistingPersonalOrganization(
    teacherUserId: string,
  ): Promise<Organization | null> {
    try {
      const organizations = await this.organizationRepository.findAllByUserId(teacherUserId);
      return (
        organizations.find(
          (organization) =>
            organization.createdByUserId === teacherUserId && organization.domain === null,
        ) ?? null
      );
    } catch (error) {
      this.logger.error(
        `No se pudo resolver la organización personal existente del profesor "${teacherUserId}".`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /** Mismo criterio que `CreateOrganizationUseCase.generateUniqueInviteCode`. */
  private async generateUniqueInviteCode(): Promise<string> {
    let code = this.inviteCodeGenerator.generate();
    let existing = await this.organizationRepository.findByInviteCode(code);

    while (existing) {
      code = this.inviteCodeGenerator.generate();
      existing = await this.organizationRepository.findByInviteCode(code);
    }

    return code;
  }
}
