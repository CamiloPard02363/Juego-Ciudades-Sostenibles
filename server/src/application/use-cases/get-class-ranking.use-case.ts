import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';
import { ClassRankingService } from '../services/class-ranking.service.js';
import type { ClassRankingDto } from '../dtos/metrics-response.dto.js';

export interface GetClassRankingInput {
  classId: string;
  requestingUserId: string;
}

/**
 * `GET /classes/:id/metrics/ranking` (issue #226, Home de clase): orquesta
 * autorización + delega el cálculo en `ClassRankingService`. El use-case no
 * sabe cómo se arma un ranking, solo quién puede pedirlo.
 */
@Injectable()
export class GetClassRankingUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly classAccessResolver: ClassAccessResolver,
    private readonly classRankingService: ClassRankingService,
  ) {}

  async execute(input: GetClassRankingInput): Promise<ClassRankingDto> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenActionError('ver el ranking de esta clase');
    }

    return this.classRankingService.buildRanking(input.classId);
  }
}
