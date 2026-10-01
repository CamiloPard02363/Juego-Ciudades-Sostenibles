import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_PLAY_RESULT_REPOSITORY,
  type GamePlayResultRepository,
} from '../../domain/ports/game-play-result.repository.port.js';
import {
  toGameMetricDto,
  toScoreOverTimePointDto,
  toSubjectMetricDto,
  type StudentMetricsDto,
} from '../dtos/metrics-response.dto.js';

const SCORE_OVER_TIME_WINDOW_DAYS = 90;

/**
 * Única responsabilidad: construir el dashboard de métricas propias de un
 * estudiante (issue #226) — desglose por juego, por materia y evolución en el
 * tiempo. Separado de `ClassRankingService` porque agrega sobre una dimensión
 * distinta (todo el historial del estudiante, no una clase puntual) y tiene
 * su propio consumidor (la vista de métricas del estudiante, no el Home de
 * clase del profesor/admin).
 */
@Injectable()
export class StudentMetricsService {
  constructor(
    @Inject(GAME_PLAY_RESULT_REPOSITORY)
    private readonly gamePlayResultRepository: GamePlayResultRepository,
  ) {}

  async buildMetrics(studentUserId: string): Promise<StudentMetricsDto> {
    const since = new Date();
    since.setDate(since.getDate() - SCORE_OVER_TIME_WINDOW_DAYS);

    const [byGame, bySubject, scoreOverTime] = await Promise.all([
      this.gamePlayResultRepository.aggregateByGameForStudent(studentUserId),
      this.gamePlayResultRepository.aggregateBySubjectForStudent(studentUserId),
      this.gamePlayResultRepository.aggregateScoreOverTimeForStudent(studentUserId, since),
    ]);

    return {
      studentUserId,
      byGame: byGame.map(toGameMetricDto),
      bySubject: bySubject.map(toSubjectMetricDto),
      scoreOverTime: scoreOverTime.map(toScoreOverTimePointDto),
    };
  }
}
