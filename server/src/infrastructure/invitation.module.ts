import { Module } from '@nestjs/common';
import { InvitationCoreModule } from './invitation-core.module.js';
import { UserModule } from './user.module.js';
import { OrganizationCoreModule } from './organization-core.module.js';
import { ClassCoreModule } from './class-core.module.js';
import { GetInvitationByTokenUseCase } from '../application/use-cases/get-invitation-by-token.use-case.js';
import { AcceptInvitationUseCase } from '../application/use-cases/accept-invitation.use-case.js';
import { InvitationController } from './http/controllers/invitation.controller.js';

/**
 * Módulo público de invitaciones (issue #232): expone las rutas `GET
 * /invitations/:token` y `POST /invitations/:token/accept`, sin
 * `JwtAuthGuard` — quien las llama todavía no tiene cuenta.
 */
@Module({
  imports: [InvitationCoreModule, UserModule, OrganizationCoreModule, ClassCoreModule],
  controllers: [InvitationController],
  providers: [GetInvitationByTokenUseCase, AcceptInvitationUseCase],
})
export class InvitationModule {}
