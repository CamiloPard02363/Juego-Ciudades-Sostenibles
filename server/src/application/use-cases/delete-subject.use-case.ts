import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectNotFoundError } from '../errors/application.errors.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface DeleteSubjectInput {
  subjectId: string;
  requestingUserId: string;
}

/**
 * Soft-delete, y solo mientras la materia sigue PRIVATE (ver
 * `Subject.canBeDeletedBy`): una vez pública no se puede eliminar, para no
 * dejar huérfanos a otros usuarios que ya hayan publicado juegos bajo ella.
 */
@Injectable()
export class DeleteSubjectUseCase implements UseCase<DeleteSubjectInput, void> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: DeleteSubjectInput): Promise<void> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new SubjectNotFoundError(input.subjectId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!subject.canBeDeletedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('eliminar esta materia');
    }

    await this.subjectRepository.softDelete(input.subjectId);
  }
}
