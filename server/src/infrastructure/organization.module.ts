import { Module } from '@nestjs/common';
import { OrganizationCoreModule } from './organization-core.module.js';
import { ClassCoreModule } from './class-core.module.js';
import { UserModule } from './user.module.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { CreateOrganizationUseCase } from '../application/use-cases/create-organization.use-case.js';
import { ListMyOrganizationsUseCase } from '../application/use-cases/list-my-organizations.use-case.js';
import { ListAllOrganizationsUseCase } from '../application/use-cases/list-all-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from '../application/use-cases/list-organization-members.use-case.js';
import { AddOrganizationMemberUseCase } from '../application/use-cases/add-organization-member.use-case.js';
import { RemoveOrganizationMemberUseCase } from '../application/use-cases/remove-organization-member.use-case.js';
import { DeactivateOrganizationUseCase } from '../application/use-cases/deactivate-organization.use-case.js';
import { ReactivateOrganizationUseCase } from '../application/use-cases/reactivate-organization.use-case.js';
import { JoinOrganizationUseCase } from '../application/use-cases/join-organization.use-case.js';
import { ListOrganizationStudentsUseCase } from '../application/use-cases/list-organization-students.use-case.js';
import { ChangeOrganizationMemberRoleUseCase } from '../application/use-cases/change-organization-member-role.use-case.js';
import { RolesGuard } from './http/guards/roles.guard.js';
import { OrganizationController } from './http/controllers/organization.controller.js';

/** Módulo público de organizaciones: casos de uso + endpoints HTTP. */
@Module({
  imports: [OrganizationCoreModule, ClassCoreModule, UserModule],
  controllers: [OrganizationController],
  providers: [
    RequesterAdminResolver,
    RolesGuard,
    CreateOrganizationUseCase,
    ListMyOrganizationsUseCase,
    ListAllOrganizationsUseCase,
    ListOrganizationMembersUseCase,
    AddOrganizationMemberUseCase,
    RemoveOrganizationMemberUseCase,
    DeactivateOrganizationUseCase,
    ReactivateOrganizationUseCase,
    JoinOrganizationUseCase,
    ListOrganizationStudentsUseCase,
    ChangeOrganizationMemberRoleUseCase,
  ],
})
export class OrganizationModule {}
