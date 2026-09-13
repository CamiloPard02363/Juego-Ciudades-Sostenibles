import { Inject, Injectable } from '@nestjs/common';
import { Game } from '../../domain/entities/game.entity.js';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import {
  GAME_IMPORT_JOB_REPOSITORY,
  type GameImportJobRepository,
} from '../../domain/ports/game-import-job.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../domain/ports/transaction-runner.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { GameFactoryService } from '../services/game-factory.service.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { GameImportExtractor } from '../etl/game-import.extractor.js';
import type {
  GameImportBatchInput,
  GameImportItemErrorDto,
  GameImportJobResultDto,
} from '../etl/game-import.dto.js';

/**
 * Orquesta el pipeline ETL de importación masiva de juegos:
 *
 * 1. **Extract**: `GameImportExtractor` chequea la forma del lote.
 * 2. **Transform**: cada ítem pasa por `GameFactoryService.build()` —el
 *    mismo camino de validación que usa crear un juego a mano, vía
 *    `ContentValidatorRegistry`— para no duplicar ninguna regla de negocio.
 *    Se corre TODO el lote antes de abrir la transacción (fail-fast: no
 *    tiene sentido gastar una transacción en datos que ya sabemos inválidos).
 * 3. **Load**: si el lote entero es válido, `bulkInsert` corre dentro de
 *    `session.withTransaction()` — todo o nada. Si algo falla ahí adentro,
 *    Mongo revierte automáticamente y el job queda FAILED.
 *
 * Es la única operación de todo el código que necesita una transacción
 * multi-documento: importar un paquete de N juegos debe confirmar como una
 * sola unidad, porque un import parcial deja el catálogo en un estado
 * inconsistente sin manera limpia de identificar qué quedó a medias.
 *
 * Solo un ADMIN de plataforma puede ejecutar una importación masiva —a
 * diferencia de crear un juego suelto, que cualquier usuario puede hacer—
 * porque acá se está atribuyendo autoría de contenido en nombre de terceros
 * (ver decisión: el admin que ejecuta el import queda como `creatorUserId`).
 */
@Injectable()
export class ImportGamesBatchUseCase
  implements UseCase<GameImportBatchInput, GameImportJobResultDto>
{
  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_IMPORT_JOB_REPOSITORY) private readonly jobRepository: GameImportJobRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly extractor: GameImportExtractor,
    private readonly gameFactory: GameFactoryService,
    private readonly requesterAdminResolver: RequesterAdminResolver,
    @Inject(TRANSACTION_RUNNER) private readonly transactionRunner: TransactionRunner,
  ) {}

  async execute(input: GameImportBatchInput): Promise<GameImportJobResultDto> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestedByUserId);
    if (!isAdmin) {
      throw new ForbiddenActionError('importar juegos masivamente');
    }

    // Idempotencia: un reintento con la misma clave que ya confirmó devuelve
    // el resultado guardado en vez de repetir el trabajo (o duplicar juegos
    // si el "reintento" en realidad era una respuesta perdida por la red).
    const existingJob = await this.jobRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existingJob?.status === 'COMMITTED') {
      return {
        jobId: existingJob.id,
        status: 'COMMITTED',
        insertedGameIds: existingJob.insertedGameIds,
        errors: [],
      };
    }

    const jobId = existingJob?.id ?? this.idGenerator.generate();
    const items = this.extractor.parse(input.items);

    // Transform: se construye (valida) TODO el lote antes de tocar la
    // transacción. Un solo ítem inválido hace fallar el lote entero — la
    // política es todo-o-nada (ALL_OR_NOTHING), no una carga parcial.
    const games: Game[] = [];
    const errors: GameImportItemErrorDto[] = [];

    for (let index = 0; index < items.length; index += 1) {
      try {
        const game = await this.gameFactory.build({
          ...items[index],
          creatorUserId: input.requestedByUserId,
          organizationId: null,
        });
        games.push(game);
      } catch (error) {
        errors.push({ index, message: error instanceof Error ? error.message : 'Error desconocido.' });
      }
    }

    if (errors.length > 0) {
      await this.jobRepository.save({
        id: jobId,
        idempotencyKey: input.idempotencyKey,
        requestedByUserId: input.requestedByUserId,
        status: 'FAILED',
        totalItems: items.length,
        insertedGameIds: [],
        errors,
        createdAt: existingJob?.createdAt ?? new Date(),
        completedAt: new Date(),
      });
      return { jobId, status: 'FAILED', insertedGameIds: [], errors };
    }

    // Load: todos los juegos del lote se insertan en una sola transacción.
    await this.transactionRunner.run(async (session) => {
      await this.gameRepository.bulkInsert(games, session);
    });

    const insertedGameIds = games.map((game) => game.id);
    await this.jobRepository.save({
      id: jobId,
      idempotencyKey: input.idempotencyKey,
      requestedByUserId: input.requestedByUserId,
      status: 'COMMITTED',
      totalItems: items.length,
      insertedGameIds,
      errors: [],
      createdAt: existingJob?.createdAt ?? new Date(),
      completedAt: new Date(),
    });

    return { jobId, status: 'COMMITTED', insertedGameIds, errors: [] };
  }
}
