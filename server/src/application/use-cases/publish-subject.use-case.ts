import { Inject, Injectable } from '@nestjs/common';
import {
  SUBJECT_REPOSITORY,
  type SubjectRepository,
} from '../../domain/ports/subject.repository.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectNotFoundError } from '../errors/application.errors.js';
import { toSubjectDto, type SubjectDto } from '../dtos/subject-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface PublishSubjectInput {
  subjectId: string;
  requestingUserId: string;
}

export interface PublishSubjectOutput extends SubjectDto {
  /** Cuántos juegos DRAFT de esta materia pasaron a PUBLISHED como efecto de la cascada. */
  gamesPublished: number;
}

/**
 * Publicar es irreversible (ver `Subject.publish()`): una vez pública, otros
 * usuarios pueden colgar juegos bajo esta materia, así que no hay `unpublish`
 * ni `delete` posterior. Solo el creador de la sub-materia o un admin pueden
 * publicarla.
 *
 * Cascada: todo juego DRAFT de esta materia pasa a PUBLISHED (ver
 * `GameRepository.publishAllDraftsByCategory`) — es lo que hace que un juego
 * termine visible en Comunidad, que ya es solo un filtro por status. Subject
 * vive en Postgres y Game en MongoDB, sin transacción distribuida real entre
 * ambas, así que el orden importa: se publican primero los juegos y solo si
 * eso tiene éxito se marca la materia como pública. Al revés, un fallo a
 * mitad de camino dejaría la materia pública con juegos todavía en borrador
 * — una inconsistencia visible que el usuario no podría corregir reintentando
 * (publicar ya no es idempotente una vez la materia cambió de estado). En
 * este orden, un fallo en Mongo simplemente no publica nada y el profesor
 * puede reintentar sin efectos secundarios a medias.
 */
@Injectable()
export class PublishSubjectUseCase implements UseCase<PublishSubjectInput, PublishSubjectOutput> {
  constructor(
    @Inject(SUBJECT_REPOSITORY) private readonly subjectRepository: SubjectRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: PublishSubjectInput): Promise<PublishSubjectOutput> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new SubjectNotFoundError(input.subjectId);
    }

    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!subject.canBePublishedBy(input.requestingUserId, isAdmin)) {
      throw new ForbiddenActionError('publicar esta materia');
    }

    subject.publish();

    const gamesPublished = await this.gameRepository.publishAllDraftsByCategory(subject.id);
    await this.subjectRepository.save(subject);

    return { ...toSubjectDto(subject), gamesPublished };
  }
}
