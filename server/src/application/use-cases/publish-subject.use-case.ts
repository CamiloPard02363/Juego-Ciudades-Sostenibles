import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectNotFoundError } from '../errors/application.errors.js';
import { toSubjectDto, type SubjectDto } from '../dtos/subject-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface PublishSubjectInput {
  subjectId: string;
  requestingUserId: string;
}

/**
 * Publicar es irreversible (ver `Subject.publish()`): una vez pública, otros
 * usuarios pueden colgar juegos bajo esta materia, así que no hay `unpublish`
 * ni `delete` posterior. Solo el creador de la sub-materia o un admin pueden
 * publicarla.
 */
@Injectable()
export class PublishSubjectUseCase implements UseCase<PublishSubjectInput, SubjectDto> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: PublishSubjectInput): Promise<SubjectDto> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new SubjectNotFoundError(input.subjectId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!subject.canBePublishedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('publicar esta materia');
    }

    subject.publish();
    await this.subjectRepository.save(subject);

    return toSubjectDto(subject);
  }
}
