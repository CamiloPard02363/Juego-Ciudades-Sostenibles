import { Module } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY } from '../domain/ports/organization.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaOrganizationRepository } from './persistence/prisma/prisma-organization.repository.js';
import { OrganizationAutoJoinService } from '../application/services/organization-auto-join.service.js';

/**
 * Módulo "core" de organizaciones: expone el repositorio y el servicio de
 * auto-join sin controladores ni dependencia de UserModule. Vive en su propio
 * archivo (no en organization.module.ts) porque en ESM el ciclo de imports
 * ocurre a nivel de módulo/archivo: si compartiera archivo con
 * `OrganizationModule` (que sí importa `UserModule`), importar este módulo
 * desde `user.module.ts` seguiría ejecutando esa importación circular.
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
