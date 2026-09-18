import { Module } from '@nestjs/common';
import { CLASS_REPOSITORY } from '../domain/ports/class.repository.port.js';
import {
  INVITE_CODE_GENERATOR,
} from '../domain/ports/invite-code-generator.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaClassRepository } from './persistence/prisma/prisma-class.repository.js';
import { RandomInviteCodeGenerator } from './security/random-invite-code-generator.adapter.js';

/**
 * Módulo "core" de clases: expone solo el repositorio y el generador de
 * códigos de invitación, sin controladores ni dependencia de UserModule.
 * Igual motivo que `OrganizationCoreModule`: `GameModule` necesita
 * `CLASS_REPOSITORY` para la regla de autorización de juegos DRAFT (issue
 * #101, punto 2) sin arrastrar un ciclo de imports en ESM.
 */
@Module({
  providers: [
    PrismaService,
    { provide: CLASS_REPOSITORY, useClass: PrismaClassRepository },
    { provide: INVITE_CODE_GENERATOR, useClass: RandomInviteCodeGenerator },
  ],
  exports: [CLASS_REPOSITORY, INVITE_CODE_GENERATOR],
})
export class ClassCoreModule {}
