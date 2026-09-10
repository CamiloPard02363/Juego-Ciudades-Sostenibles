import { Inject, Injectable } from '@nestjs/common';
import { Organization } from '../../domain/entities/organization.entity.js';
import { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { EmailDomain } from '../../domain/value-objects/email-domain.vo.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import {
  ORGANIZATION_REPOSITORY,
  type OrganizationRepository,
} from '../../domain/ports/organization.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { OrganizationDomainAlreadyClaimedError } from '../errors/application.errors.js';
import {
  toOrganizationResponseDto,
  type OrganizationResponseDto,
} from '../dtos/organization-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface CreateOrganizationInput {
  name: string;
  domain?: string | null;
  createdByUserId: string;
}

/**
 * Cualquier usuario autenticado puede crear una organización, y queda como
 * `orgRole = ADMIN` de ella automáticamente — no hace falta ser ADMIN global
 * de plataforma (ejes ortogonales, ver `organization-role.vo.ts`).
 */
@Injectable()
export class CreateOrganizationUseCase
  implements UseCase<CreateOrganizationInput, OrganizationResponseDto>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: OrganizationRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<OrganizationResponseDto> {
    // Chequeo previo para el caso común (mensaje claro y falla rápido). La
    // garantía real ante dos creaciones simultáneas con el mismo dominio la da
    // el índice único en `organizations.domain` — ver el catch de P2002 en
    // PrismaOrganizationRepository.createWithOwner().
    if (input.domain) {
      const domain = EmailDomain.create(input.domain);
      const claimed = await this.organizationRepository.findByDomain(domain);

      if (claimed) {
        throw new OrganizationDomainAlreadyClaimedError(domain.getValue());
      }
    }

    const organization = Organization.create({
      id: this.idGenerator.generate(),
      name: input.name,
      domain: input.domain ?? null,
      createdByUserId: input.createdByUserId,
    });

    const ownerMembership = OrganizationMembership.create({
      organizationId: organization.id,
      userId: input.createdByUserId,
      orgRole: OrganizationRole.admin(),
    });

    await this.organizationRepository.createWithOwner(organization, ownerMembership);

    return toOrganizationResponseDto(organization);
  }
}
