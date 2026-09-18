import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { CLASS_REPOSITORY } from '../domain/ports/class.repository.port.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaClassRepository } from './persistence/prisma/prisma-class.repository.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../application/use-cases/list-my-classes.use-case.js';
import { AddGameToClassUseCase } from '../application/use-cases/add-game-to-class.use-case.js';
import { RemoveGameFromClassUseCase } from '../application/use-cases/remove-game-from-class.use-case.js';
import { ListClassGamesUseCase } from '../application/use-cases/list-class-games.use-case.js';
import { ClassController } from './http/controllers/class.controller.js';

@Module({
  imports: [UserModule],
  controllers: [ClassController],
  providers: [
    PrismaService,
    MongoService,
    { provide: CLASS_REPOSITORY, useClass: PrismaClassRepository },
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    CreateClassUseCase,
    ListMyClassesUseCase,
    AddGameToClassUseCase,
    RemoveGameFromClassUseCase,
    ListClassGamesUseCase,
  ],
})
export class ClassModule {}
