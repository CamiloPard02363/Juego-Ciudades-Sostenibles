import { Inject, Injectable } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity.js';
import { categorySlugFromName } from '../../domain/value-objects/category-slug.vo.js';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../../domain/ports/category.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { CategorySlugAlreadyTakenError } from '../errors/application.errors.js';
import { toCategoryDto, type CategoryDto } from '../dtos/category-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface CreateCategoryInput {
  name: string;
}

/**
 * Cualquier usuario autenticado puede crear una categoría al vuelo, igual que
 * con los juegos (ver ADR en homeworks/pendientes.md): no es una lista fija
 * de materias administrada aparte, sino datos que crecen con el uso.
 */
@Injectable()
export class CreateCategoryUseCase implements UseCase<CreateCategoryInput, CategoryDto> {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateCategoryInput): Promise<CategoryDto> {
    const id = this.idGenerator.generate();
    const slug = categorySlugFromName(input.name, id);

    const slugTaken = await this.categoryRepository.existsBySlug(slug);
    if (slugTaken) {
      throw new CategorySlugAlreadyTakenError(slug);
    }

    const category = Category.create({ id, name: input.name, slug });
    await this.categoryRepository.save(category);

    return toCategoryDto(category);
  }
}
