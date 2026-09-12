import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { EmailDomain } from '../../domain/value-objects/email-domain.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import type { Email } from '../../domain/value-objects/email.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';

/**
 * Auto-join por dominio de correo.
 *
 * Se invoca en signup y también en cada login: el segundo caso cubre a los
 * usuarios que ya existían cuando alguien reclamó su dominio después —sin él,
 * esos usuarios nunca entrarían a su organización sin acción manual.
 *
 * Nunca hace fallar la operación que lo invoca: si el auto-join revienta, el
 * registro o el login deben completarse igual. Se registra el error y sigue.
 */
@Injectable()
export class OrganizationAutoJoinService {
  private readonly logger = new Logger(OrganizationAutoJoinService.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  async joinByEmailDomain(userId: string, email: Email): Promise<void> {
    try {
      const domain = EmailDomain.fromEmail(email);
      const organization = await this.organizationRepository.findByDomain(domain);

      if (!organization) {
        return;
      }

      const existing = await this.organizationRepository.findMembership(
        organization.id,
        userId,
      );

      // Ya es miembro: no se re-escribe el rol, para no degradar a quien haya
      // sido ascendido a TEACHER o ADMIN dentro de la organización.
      if (existing) {
        return;
      }

      await this.organizationRepository.saveMembership(
        OrganizationMembership.create({
          organizationId: organization.id,
          userId,
          orgRole: OrganizationRole.student(),
        }),
      );
    } catch (error) {
      this.logger.error(
        `No se pudo auto-vincular al usuario "${userId}" por dominio de correo.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
