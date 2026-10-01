import { Injectable } from '@nestjs/common';
import {
  RecordGamePlayResultService,
  type RecordGamePlayResultInput,
} from '../services/record-game-play-result.service.js';

export interface RecordGamePlayResultCommand {
  gameId: string;
  gameTitle: string;
  classId?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  score: number;
  correctCount: number;
  incorrectCount: number;
  timePlayedMs: number;
  requestingUserId: string;
}

/**
 * `POST /me/game-results` (issue #226): el estudiante autenticado registra el
 * resultado de una partida que acaba de jugar. No hay otro usuario cuyo
 * acceso validar (análogo a `GetMyMetricsUseCase`) — el único dato de negocio
 * es la forma del resultado, que valida `GamePlayResultEntity.create`.
 */
@Injectable()
export class RecordGamePlayResultUseCase {
  constructor(private readonly recordGamePlayResultService: RecordGamePlayResultService) {}

  async execute(command: RecordGamePlayResultCommand): Promise<void> {
    const input: RecordGamePlayResultInput = {
      studentUserId: command.requestingUserId,
      classId: command.classId,
      gameId: command.gameId,
      gameTitle: command.gameTitle,
      subjectId: command.subjectId,
      subjectName: command.subjectName,
      score: command.score,
      correctCount: command.correctCount,
      incorrectCount: command.incorrectCount,
      timePlayedMs: command.timePlayedMs,
    };

    await this.recordGamePlayResultService.record(input);
  }
}
