import { Inject, Injectable } from '@nestjs/common';
import { Subject } from '../../domain/entities/subject.entity.js';
import { subjectSlugFromName } from '../../domain/value-objects/subject-slug.vo.js';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import {
  ParentSubjectNotFoundError,
  SubjectSlugAlreadyTakenError,
} from '../errors/application.errors.js';
import { toSubjectDto, type SubjectDto } from '../dtos/subject-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';

export interface CreateSubSubjectInput {
  name: string;
  parentSubjectId: string;
  requestingUserId: string;
}

/**
 * Sub-materia: cualquier usuario autenticado (profesor o admin) puede crearla
 * bajo una materia raíz existente. Nace PRIVATE — solo su creador la ve hasta
 * que decida publicarla (ver `PublishSubjectUseCase`).
 */
@Injectable()
export class CreateSubSubjectUseCase implements UseCase<CreateSubSubjectInput, SubjectDto> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateSubSubjectInput): Promise<SubjectDto> {
    const parent = await this.subjectRepository.findById(input.parentSubjectId);
    if (!parent) {
      throw new ParentSubjectNotFoundError(input.parentSubjectId);
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
      parentSubjectId: parent.id,
      creatorUserId: input.requestingUserId,
    });
    await this.subjectRepository.save(subject);

    return toSubjectDto(subject);
  }
}
