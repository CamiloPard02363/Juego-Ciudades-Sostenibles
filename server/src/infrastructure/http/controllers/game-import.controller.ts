import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ImportGamesBatchUseCase } from '../../../application/use-cases/import-games-batch.use-case.js';
import {
  GAME_IMPORT_JOB_REPOSITORY,
  type GameImportJobRepository,
} from '../../../domain/ports/game-import-job.repository.port.js';
import { GameImportJobNotFoundError } from '../../../application/errors/application.errors.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { ImportGamesBatchDto } from '../dtos/import-games-batch.dto.js';

/**
 * Pipeline ETL de importación masiva, separado del CRUD normal de juegos
 * (`GameController`) — es un flujo distinto (Extract/Transform/Load,
 * transaccional, con job de seguimiento), no una operación CRUD más.
 * Aunque `POST` procesa el lote de forma síncrona hoy (no hay infraestructura
 * de colas todavía), responde `202` y expone `GET .../:jobId` a propósito:
 * el mismo `ImportGamesBatchUseCase` podrá invocarse después desde un worker
 * de cola sin cambiar este contrato HTTP.
 */
@Controller('games/import')
@UseGuards(JwtAuthGuard)
export class GameImportController {
  constructor(
    private readonly importGamesBatchUseCase: ImportGamesBatchUseCase,
    @Inject(GAME_IMPORT_JOB_REPOSITORY) private readonly jobRepository: GameImportJobRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  importBatch(@CurrentUserId() requestedByUserId: string, @Body() dto: ImportGamesBatchDto) {
    return this.importGamesBatchUseCase.execute({
      requestedByUserId,
      idempotencyKey: dto.idempotencyKey,
      items: dto.items,
    });
  }

  @Get(':jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new GameImportJobNotFoundError(jobId);

    return {
      jobId: job.id,
      status: job.status,
      insertedGameIds: job.insertedGameIds,
      errors: job.errors,
    };
  }
}
