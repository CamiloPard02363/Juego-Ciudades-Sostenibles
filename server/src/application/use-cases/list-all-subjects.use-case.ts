import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { toSubjectDto, type SubjectDto } from '../dtos/subject-response.dto.js';

/**
 * Query sin filtro de pertenencia: devuelve TODAS las Subject vigentes de la
 * plataforma, PUBLIC y PRIVATE de cualquier usuario (issue #101, punto 4).
 * Solo listado — sin auditoría histórica de acciones, eso queda fuera de
 * alcance. La autorización de ADMIN global la aplica `RolesGuard`
 * (`@Roles('ADMIN')`) sobre el endpoint HTTP, no este use-case.
 */
@Injectable()
export class ListAllSubjectsUseCase {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
  ) {}

  async execute(): Promise<SubjectDto[]> {
    const subjects = await this.subjectRepository.findAll();
    return subjects.map(toSubjectDto);
  }
}
