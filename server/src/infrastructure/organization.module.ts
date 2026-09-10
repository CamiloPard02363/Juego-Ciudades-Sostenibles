import { Module } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY } from '../domain/ports/organization.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaOrganizationRepository } from './persistence/prisma/prisma-organization.repository.js';
import { OrganizationAutoJoinService } from '../application/services/organization-auto-join.service.js';
import { UserModule } from './user.module.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { CreateOrganizationUseCase } from '../application/use-cases/create-organization.use-case.js';
import { ListMyOrganizationsUseCase } from '../application/use-cases/list-my-organizations.use-case.js';
import { ListAllOrganizationsUseCase } from '../application/use-cases/list-all-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from '../application/use-cases/list-organization-members.use-case.js';
import { OrganizationController } from './http/controllers/organization.controller.js';

/**
 * Módulo "core" de organizaciones: expone el repositorio y el servicio de
 * auto-join sin controladores ni dependencia de UserModule. Existe separado de
 * `OrganizationModule` para romper el ciclo UserModule ↔ OrganizationModule:
 * UserModule necesita el auto-join en signup/login, y las organizaciones
 * necesitan el repositorio de usuarios para listar miembros.
 */
@Module({
  providers: [
    PrismaService,
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    OrganizationAutoJoinService,
  ],
  exports: [ORGANIZATION_REPOSITORY, OrganizationAutoJoinService],
})
export class OrganizationCoreModule {}

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
