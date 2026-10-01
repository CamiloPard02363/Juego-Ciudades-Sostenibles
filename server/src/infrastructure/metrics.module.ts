import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { OrganizationCoreModule } from './organization-core.module.js';
import { ClassCoreModule } from './class-core.module.js';
import { GAME_PLAY_RESULT_REPOSITORY } from '../domain/ports/game-play-result.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaGamePlayResultRepository } from './persistence/prisma/prisma-game-play-result.repository.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { ClassAccessResolver } from '../application/services/class-access-resolver.service.js';
import { ClassRankingService } from '../application/services/class-ranking.service.js';
import { StudentMetricsService } from '../application/services/student-metrics.service.js';
import { RecordGamePlayResultService } from '../application/services/record-game-play-result.service.js';
import { GetClassRankingUseCase } from '../application/use-cases/get-class-ranking.use-case.js';
import { GetStudentMetricsUseCase } from '../application/use-cases/get-student-metrics.use-case.js';
import { GetMyMetricsUseCase } from '../application/use-cases/get-my-metrics.use-case.js';
import { RecordGamePlayResultUseCase } from '../application/use-cases/record-game-play-result.use-case.js';
import { MetricsController } from './http/controllers/metrics.controller.js';

/**
 * Módulo de dashboard de métricas (issue #226). Vive separado de
 * `ClassModule`/`OrganizationModule` porque su razón de cambio es distinta:
 * agregación/lectura de resultados de partida, no gestión de membresía de
 * clases u organizaciones.
 */
@Module({
  imports: [UserModule, OrganizationCoreModule, ClassCoreModule],
  controllers: [MetricsController],
  providers: [
    PrismaService,
    { provide: GAME_PLAY_RESULT_REPOSITORY, useClass: PrismaGamePlayResultRepository },
    RequesterAdminResolver,
    ClassAccessResolver,
    ClassRankingService,
    StudentMetricsService,
    RecordGamePlayResultService,
    GetClassRankingUseCase,
    GetStudentMetricsUseCase,
    GetMyMetricsUseCase,
    RecordGamePlayResultUseCase,
  ],
})
export class MetricsModule {}
