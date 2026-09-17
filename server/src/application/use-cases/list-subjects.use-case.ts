import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import {
  GAME_REPOSITORY,
  type GameRepository,
} from '../../domain/ports/game.repository.port.js';
import { toSubjectDto, type SubjectWithGameCountDto } from '../dtos/subject-response.dto.js';

export interface ListSubjectsInput {
  requestingUserId: string;
}

/**
 * Devuelve todas las materias PUBLIC del catálogo más las PRIVATE del propio
 * usuario (ver `SubjectRepository.findVisibleTo`) — no expone materias
 * privadas de otros usuarios.
 */
@Injectable()
export class ListSubjectsUseCase {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(input: ListSubjectsInput): Promise<SubjectWithGameCountDto[]> {
    const [subjects, counts] = await Promise.all([
      this.subjectRepository.findVisibleTo(input.requestingUserId),
      this.gameRepository.countPublishedByCategory(),
    ]);

    return subjects.map((subject) => ({
      ...toSubjectDto(subject),
      gameCount: counts.get(subject.id) ?? 0,
    }));
  }
}
