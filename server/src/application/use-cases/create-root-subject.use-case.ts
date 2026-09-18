import { Inject, Injectable } from '@nestjs/common';
import { Subject } from '../../domain/entities/subject.entity.js';
import { subjectSlugFromName } from '../../domain/value-objects/subject-slug.vo.js';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectSlugAlreadyTakenError } from '../errors/application.errors.js';
import { toSubjectDto, type SubjectDto } from '../dtos/subject-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface CreateRootSubjectInput {
  name: string;
  requestingUserId: string;
}

/**
 * Materia raíz (parentSubjectId null): solo un ADMIN global puede crearla —
 * es el esqueleto fijo del catálogo, no contenido que cualquier profesor
 * agregue al vuelo (eso es lo que sí puede hacer con una sub-materia, ver
 * `CreateSubSubjectUseCase`).
 */
@Injectable()
export class CreateRootSubjectUseCase implements UseCase<CreateRootSubjectInput, SubjectDto> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: CreateRootSubjectInput): Promise<SubjectDto> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isAdmin) {
      throw new ForbiddenActionError('crear una materia raíz del catálogo');
    }

    const id = this.idGenerator.generate();
    const slug = subjectSlugFromName(input.name, id);

    const slugTaken = await this.subjectRepository.existsBySlug(slug);
    if (slugTaken) {
      throw new SubjectSlugAlreadyTakenError(slug);
    }

    const subject = Subject.create({
      id,
      name: input.name,
      slug,
      parentSubjectId: null,
      creatorUserId: input.requestingUserId,
    });
    await this.subjectRepository.save(subject);

    return toSubjectDto(subject);
  }
}
