import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { OrganizationCoreModule } from './organization-core.module.js';
import { ClassCoreModule } from './class-core.module.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { TeacherPersonalOrganizationService } from '../application/services/teacher-personal-organization.service.js';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../application/use-cases/list-my-classes.use-case.js';
import { ListMyClassesDetailUseCase } from '../application/use-cases/list-my-classes-detail.use-case.js';
import { ListAllClassesUseCase } from '../application/use-cases/list-all-classes.use-case.js';
import { AddGameToClassUseCase } from '../application/use-cases/add-game-to-class.use-case.js';
import { RemoveGameFromClassUseCase } from '../application/use-cases/remove-game-from-class.use-case.js';
import { ListClassGamesUseCase } from '../application/use-cases/list-class-games.use-case.js';
import { JoinClassUseCase } from '../application/use-cases/join-class.use-case.js';
import { ListMyEnrollmentsUseCase } from '../application/use-cases/list-my-enrollments.use-case.js';
import { RemoveClassEnrollmentUseCase } from '../application/use-cases/remove-class-enrollment.use-case.js';
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js';
import { DeactivateClassUseCase } from '../application/use-cases/deactivate-class.use-case.js';
import { ReactivateClassUseCase } from '../application/use-cases/reactivate-class.use-case.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { RolesGuard } from './http/guards/roles.guard.js';
import { ClassController } from './http/controllers/class.controller.js';

@Module({
  imports: [UserModule, OrganizationCoreModule, ClassCoreModule],
  controllers: [ClassController],
  providers: [
    MongoService,
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    RolesGuard,
    RequesterAdminResolver,
    TeacherPersonalOrganizationService,
    CreateClassUseCase,
    ListMyClassesUseCase,
    ListMyClassesDetailUseCase,
    ListAllClassesUseCase,
    AddGameToClassUseCase,
    RemoveGameFromClassUseCase,
    ListClassGamesUseCase,
    JoinClassUseCase,
    ListMyEnrollmentsUseCase,
    RemoveClassEnrollmentUseCase,
    EnrollStudentUseCase,
    DeactivateClassUseCase,
    ReactivateClassUseCase,
  ],
})
export class ClassModule {}
