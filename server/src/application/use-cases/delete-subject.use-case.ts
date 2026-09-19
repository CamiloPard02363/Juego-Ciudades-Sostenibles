import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectHasGamesError } from '../../domain/errors/subject.errors.js';
import { SubjectNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface DeleteSubjectInput {
  subjectId: string;
  requestingUserId: string;
}

/**
 * Soft-delete (ver `Subject.canBeDeletedBy` para la matriz completa de
 * reglas por rol/estado). Antes de invocar el guard de dominio, este
 * use-case calcula `isEmpty` recorriendo recursivamente el árbol (la propia
 * materia y todas sus sub-materias descendientes, sin importar su estado)
 * contra el repositorio de Game en Mongo por `categoryId` — no hay FK real
 * entre Subject y Game, así que la verificación se hace a mano.
 */
@Injectable()
export class DeleteSubjectUseCase implements UseCase<DeleteSubjectInput, void> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DeleteSubjectInput): Promise<void> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new SubjectNotFoundError(input.subjectId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    const isEmpty = await this.isTreeEmpty(input.subjectId);

    if (!subject.canBeDeletedBy(input.requestingUserId, isAdmin, isEmpty)) {
      if (!isEmpty) {
        throw new SubjectHasGamesError();
      }
      throw new ForbiddenActionError('eliminar esta materia');
    }

    await this.subjectRepository.softDelete(input.subjectId);
  }

  /**
   * Recorrido en anchura del árbol completo (la materia + todas sus
   * descendientes directas e indirectas, en cualquier estado). Corta apenas
   * encuentra un juego, sin seguir recorriendo el resto del árbol.
   */
  private async isTreeEmpty(rootSubjectId: string): Promise<boolean> {
    const pendingIds = [rootSubjectId];

    while (pendingIds.length > 0) {
      const currentId = pendingIds.shift()!;

      const { total } = await this.gameRepository.findAll({
        categoryId: currentId,
        page: 1,
        pageSize: 1,
      });
      if (total > 0) {
        return false;
      }

      const children = await this.subjectRepository.findByParentId(currentId);
      pendingIds.push(...children.map((child) => child.id));
    }

    return true;
  }
}
