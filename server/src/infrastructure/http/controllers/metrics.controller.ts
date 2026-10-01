import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { GetClassRankingUseCase } from '../../../application/use-cases/get-class-ranking.use-case.js';
import { GetStudentMetricsUseCase } from '../../../application/use-cases/get-student-metrics.use-case.js';
import { GetMyMetricsUseCase } from '../../../application/use-cases/get-my-metrics.use-case.js';
import { RecordGamePlayResultUseCase } from '../../../application/use-cases/record-game-play-result.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { RecordGamePlayResultDto } from '../dtos/record-game-play-result.dto.js';

/**
 * Controlador delgado (issue #226): solo traduce HTTP <-> use-case. Toda la
 * lógica de autorización y agregación vive en la capa de aplicación
 * (`application/use-cases` + `application/services`), nunca acá.
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(
    private readonly getClassRankingUseCase: GetClassRankingUseCase,
    private readonly getStudentMetricsUseCase: GetStudentMetricsUseCase,
    private readonly getMyMetricsUseCase: GetMyMetricsUseCase,
    private readonly recordGamePlayResultUseCase: RecordGamePlayResultUseCase,
  ) {}

  /** Home de clase (issue #226): ranking + datos para el gráfico de pie. */
  @Get('classes/:id/metrics/ranking')
  getClassRanking(@CurrentUserId() requestingUserId: string, @Param('id') classId: string) {
    return this.getClassRankingUseCase.execute({ classId, requestingUserId });
  }

  /** Detalle de un estudiante puntual de la clase, visto por su profesor/admin. */
  @Get('classes/:id/students/:studentId/metrics')
  getStudentMetrics(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('studentId') studentUserId: string,
  ) {
    return this.getStudentMetricsUseCase.execute({ classId, studentUserId, requestingUserId });
  }

  /** Vista propia de métricas del estudiante autenticado (issue #226). */
  @Get('me/metrics')
  getMyMetrics(@CurrentUserId() requestingUserId: string) {
    return this.getMyMetricsUseCase.execute(requestingUserId);
  }

  /** El estudiante autenticado registra el resultado de una partida jugada. */
  @Post('me/game-results')
  @HttpCode(HttpStatus.CREATED)
  recordGamePlayResult(
    @CurrentUserId() requestingUserId: string,
    @Body() dto: RecordGamePlayResultDto,
  ) {
    return this.recordGamePlayResultUseCase.execute({ ...dto, requestingUserId });
  }
}
