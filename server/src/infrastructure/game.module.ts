import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { OrganizationCoreModule } from './organization-core.module.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { GAME_IMPORT_JOB_REPOSITORY } from '../domain/ports/game-import-job.repository.port.js';
import { TRANSACTION_RUNNER } from '../domain/ports/transaction-runner.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { MongoGameImportJobRepository } from './persistence/mongo/mongo-game-import-job.repository.js';
import { MongoSessionFactory } from './persistence/mongo/mongo-session.factory.js';
import { MemoryMatchContentValidator } from '../application/content-validators/memory-match.content-validator.js';
import { GuessWhoContentValidator } from '../application/content-validators/guess-who.content-validator.js';
import { DominoContentValidator } from '../application/content-validators/domino.content-validator.js';
import { MazeCollectorContentValidator } from '../application/content-validators/maze-collector.content-validator.js';
import { SnakesLaddersContentValidator } from '../application/content-validators/snakes-ladders.content-validator.js';
import { DualQuestContentValidator } from '../application/content-validators/dual-quest.content-validator.js';
import { ContentValidatorRegistry } from '../application/content-validators/content-validator.registry.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { GameAuthorizationService } from '../application/services/game-authorization.service.js';
import { GameFactoryService } from '../application/services/game-factory.service.js';
import { GameImportExtractor } from '../application/etl/game-import.extractor.js';
import { CreateGameUseCase } from '../application/use-cases/create-game.use-case.js';
import { GetGameByIdUseCase } from '../application/use-cases/get-game-by-id.use-case.js';
import { GetGameBySlugUseCase } from '../application/use-cases/get-game-by-slug.use-case.js';
import { ListGamesUseCase } from '../application/use-cases/list-games.use-case.js';
import { UpdateGameUseCase } from '../application/use-cases/update-game.use-case.js';
import { PublishGameUseCase } from '../application/use-cases/publish-game.use-case.js';
import { UnpublishGameUseCase } from '../application/use-cases/unpublish-game.use-case.js';
import { DeleteGameUseCase } from '../application/use-cases/delete-game.use-case.js';
import { DonateGameToOrganizationUseCase } from '../application/use-cases/donate-game-to-organization.use-case.js';
import { ImportGamesBatchUseCase } from '../application/use-cases/import-games-batch.use-case.js';
import { GameController } from './http/controllers/game.controller.js';
import { GameImportController } from './http/controllers/game-import.controller.js';

@Module({
  imports: [UserModule, OrganizationCoreModule],
  controllers: [GameController, GameImportController],
  providers: [
    MongoService,
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    { provide: GAME_IMPORT_JOB_REPOSITORY, useClass: MongoGameImportJobRepository },
    { provide: TRANSACTION_RUNNER, useClass: MongoSessionFactory },
    MemoryMatchContentValidator,
    GuessWhoContentValidator,
    DominoContentValidator,
    MazeCollectorContentValidator,
    SnakesLaddersContentValidator,
    DualQuestContentValidator,
    ContentValidatorRegistry,
    RequesterAdminResolver,
    GameAuthorizationService,
    GameFactoryService,
    GameImportExtractor,
    CreateGameUseCase,
    GetGameByIdUseCase,
    GetGameBySlugUseCase,
    ListGamesUseCase,
    UpdateGameUseCase,
    PublishGameUseCase,
    UnpublishGameUseCase,
    DeleteGameUseCase,
    DonateGameToOrganizationUseCase,
    ImportGamesBatchUseCase,
  ],
})
export class GameModule {}
