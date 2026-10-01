import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_PLAY_RESULT_REPOSITORY,
  type GamePlayResultRepository,
} from '../../domain/ports/game-play-result.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { toClassRankingDto, type ClassRankingDto } from '../dtos/metrics-response.dto.js';

/**
 * Única responsabilidad: construir el ranking de una clase (Home de clase,
 * issue #226) a partir de los resultados crudos de partidas. No resuelve
 * autorización ni conoce HTTP — eso vive en el use-case que lo invoca.
 */
@Injectable()
export class ClassRankingService {
  constructor(
    @Inject(GAME_PLAY_RESULT_REPOSITORY)
    private readonly gamePlayResultRepository: GamePlayResultRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async buildRanking(classId: string): Promise<ClassRankingDto> {
    const aggregates = await this.gamePlayResultRepository.aggregateScoreByStudentForClass(
      classId,
    );

    const students = await this.userRepository.findByIds(
      aggregates.map((aggregate) => aggregate.studentUserId),
    );
    const displayNameByStudentId = new Map(
      students.map((student) => [student.id, student.displayName]),
    );

    return toClassRankingDto(classId, aggregates, displayNameByStudentId);
  }
}
