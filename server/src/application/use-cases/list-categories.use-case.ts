import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../../domain/ports/category.repository.port.js';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { toCategoryDto, type CategoryWithGameCountDto } from '../dtos/category-response.dto.js';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(): Promise<CategoryWithGameCountDto[]> {
    const [categories, counts] = await Promise.all([
      this.categoryRepository.findAll(),
      this.gameRepository.countPublishedByCategory(),
    ]);

    return categories.map((category) => ({
      ...toCategoryDto(category),
      gameCount: counts.get(category.id) ?? 0,
    }));
  }
}
