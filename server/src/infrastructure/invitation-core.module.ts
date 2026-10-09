import { Module } from '@nestjs/common';
import { INVITATION_REPOSITORY } from '../domain/ports/invitation.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaInvitationRepository } from './persistence/prisma/prisma-invitation.repository.js';
import { InvitationLinkBuilder } from '../application/services/invitation-link-builder.service.js';

/**
 * Módulo "core" de invitaciones (issue #232): expone solo el repositorio y
 * el constructor de links, sin controladores — mismo motivo que
 * `OrganizationCoreModule`/`ClassCoreModule`: lo consumen tanto
 * `OrganizationModule` como `ClassModule` (alta manual a institución/clase)
 * y `InvitationModule` (aceptar el link), sin crear un ciclo de imports ESM.
 */
@Module({
  providers: [
    PrismaService,
    { provide: INVITATION_REPOSITORY, useClass: PrismaInvitationRepository },
    InvitationLinkBuilder,
  ],
  exports: [INVITATION_REPOSITORY, InvitationLinkBuilder],
})
export class InvitationCoreModule {}
