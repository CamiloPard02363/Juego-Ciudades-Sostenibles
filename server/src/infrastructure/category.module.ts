import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { CATEGORY_REPOSITORY } from '../domain/ports/category.repository.port.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoCategoryRepository } from './persistence/mongo/mongo-category.repository.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case.js';
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case.js';
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case.js';
import { RequesterAdminResolver } from '../application/services/requester-admin-resolver.service.js';
import { CategoryController } from './http/controllers/category.controller.js';

@Module({
  imports: [UserModule],
  controllers: [CategoryController],
  providers: [
    MongoService,
    { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    RequesterAdminResolver,
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    DeleteCategoryUseCase,
  ],
})
export class CategoryModule {}
