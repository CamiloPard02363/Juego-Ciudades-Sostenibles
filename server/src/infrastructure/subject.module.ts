import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { OrganizationCoreModule } from './organization-core.module.js';
import { SUBJECT_REPOSITORY } from '../domain/ports/subject.repository.port.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaSubjectRepository } from './persistence/prisma/prisma-subject.repository.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { CreateRootSubjectUseCase } from '../application/use-cases/create-root-subject.use-case.js';
import { CreateSubSubjectUseCase } from '../application/use-cases/create-sub-subject.use-case.js';
import { ListSubjectsUseCase } from '../application/use-cases/list-subjects.use-case.js';
import { ListAllSubjectsUseCase } from '../application/use-cases/list-all-subjects.use-case.js';
import { PublishSubjectUseCase } from '../application/use-cases/publish-subject.use-case.js';
import { DeleteSubjectUseCase } from '../application/use-cases/delete-subject.use-case.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { RolesGuard } from './http/guards/roles.guard.js';
import { SubjectController } from './http/controllers/subject.controller.js';

@Module({
  imports: [UserModule, OrganizationCoreModule],
  controllers: [SubjectController],
  providers: [
    PrismaService,
    MongoService,
    { provide: SUBJECT_REPOSITORY, useClass: PrismaSubjectRepository },
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    RequesterAdminResolver,
    RolesGuard,
    CreateRootSubjectUseCase,
    CreateSubSubjectUseCase,
    ListSubjectsUseCase,
    ListAllSubjectsUseCase,
    PublishSubjectUseCase,
    DeleteSubjectUseCase,
  ],
})
export class SubjectModule {}
