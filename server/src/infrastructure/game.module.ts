import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { JwtAuthGuard } from './http/guards/jwt-auth.guard.js';
import { MemoryMatchContentValidator } from '../application/content-validators/memory-match.content-validator.js';
import { ContentValidatorRegistry } from '../application/content-validators/content-validator.registry.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { CreateGameUseCase } from '../application/use-cases/create-game.use-case.js';
import { GetGameByIdUseCase } from '../application/use-cases/get-game-by-id.use-case.js';
import { GetGameBySlugUseCase } from '../application/use-cases/get-game-by-slug.use-case.js';
import { ListGamesUseCase } from '../application/use-cases/list-games.use-case.js';
import { UpdateGameUseCase } from '../application/use-cases/update-game.use-case.js';
import { PublishGameUseCase } from '../application/use-cases/publish-game.use-case.js';
import { UnpublishGameUseCase } from '../application/use-cases/unpublish-game.use-case.js';
import { DeleteGameUseCase } from '../application/use-cases/delete-game.use-case.js';
import { GameController } from './http/controllers/game.controller.js';

@Module({
  imports: [UserModule],
  controllers: [GameController],
  providers: [
    JwtAuthGuard,
    MongoService,
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    MemoryMatchContentValidator,
    ContentValidatorRegistry,
    RequesterAdminResolver,
    CreateGameUseCase,
    GetGameByIdUseCase,
    GetGameBySlugUseCase,
    ListGamesUseCase,
    UpdateGameUseCase,
    PublishGameUseCase,
    UnpublishGameUseCase,
    DeleteGameUseCase,
  ],
})
export class GameModule {}
