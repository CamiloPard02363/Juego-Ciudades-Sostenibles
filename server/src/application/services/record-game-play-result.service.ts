import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  GAME_PLAY_RESULT_REPOSITORY,
  type GamePlayResultRepository,
} from '../../domain/ports/game-play-result.repository.port.js';
import { GamePlayResultEntity } from '../../domain/entities/game-play-result.entity.js';

export interface RecordGamePlayResultInput {
  studentUserId: string;
  classId?: string | null;
  gameId: string;
  gameTitle: string;
  subjectId?: string | null;
  subjectName?: string | null;
  score: number;
  correctCount: number;
  incorrectCount: number;
  timePlayedMs: number;
}

/**
 * Única responsabilidad: crear y persistir el hecho atómico de una partida
 * jugada. Separado de los servicios de agregación (SRP): registrar un hecho y
 * leer agregaciones sobre muchos hechos son operaciones con razones de
 * cambio distintas (ej. validar el payload de una partida vs. cambiar cómo se
 * calcula un ranking).
 */
@Injectable()
export class RecordGamePlayResultService {
  constructor(
    @Inject(GAME_PLAY_RESULT_REPOSITORY)
    private readonly gamePlayResultRepository: GamePlayResultRepository,
  ) {}

  async record(input: RecordGamePlayResultInput): Promise<void> {
    const result = GamePlayResultEntity.create({
      id: randomUUID(),
      ...input,
    });

    await this.gamePlayResultRepository.save(result);
  }
}
