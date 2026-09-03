import { Inject, Injectable } from '@nestjs/common';
import {
  CATEGORY_REPOSITORY,
  type CategoryRepository,
} from '../../domain/ports/category.repository.port.js';
import { CategoryNotFoundError } from '../errors/application.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface DeleteCategoryInput {
  categoryId: string;
  requestingUserId: string;
}

/**
 * Borrado físico (a diferencia de los juegos, que se marcan REMOVED): una
 * categoría es solo una etiqueta de organización, no contenido con historial
 * que auditar. Los juegos que la referenciaban quedan con un categoryId
 * huérfano, pero no dejan de existir ni de aparecer en el catálogo general.
 */
@Injectable()
export class DeleteCategoryUseCase implements UseCase<DeleteCategoryInput, void> {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepository: CategoryRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categoryRepository.findById(input.categoryId);

    if (!category) {
      throw new CategoryNotFoundError(input.categoryId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!category.canBeManagedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('eliminar esta materia');
    }

    await this.categoryRepository.delete(input.categoryId);
  }
}
