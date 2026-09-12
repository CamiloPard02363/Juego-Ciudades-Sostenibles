import { Module } from '@nestjs/common';
import { OrganizationCoreModule } from './organization-core.module.js';
import { UserModule } from './user.module.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { CreateOrganizationUseCase } from '../application/use-cases/create-organization.use-case.js';
import { ListMyOrganizationsUseCase } from '../application/use-cases/list-my-organizations.use-case.js';
import { ListAllOrganizationsUseCase } from '../application/use-cases/list-all-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from '../application/use-cases/list-organization-members.use-case.js';
import { OrganizationController } from './http/controllers/organization.controller.js';

/** Módulo público de organizaciones: casos de uso + endpoints HTTP. */
@Module({
  imports: [OrganizationCoreModule, UserModule],
  controllers: [OrganizationController],
  providers: [
    RequesterAdminResolver,
    CreateOrganizationUseCase,
    ListMyOrganizationsUseCase,
    ListAllOrganizationsUseCase,
    ListOrganizationMembersUseCase,
  ],
})
export class OrganizationModule {}
