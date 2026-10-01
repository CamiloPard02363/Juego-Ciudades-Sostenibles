import type { GamePlayResultModel } from '../../../generated/prisma/client.js';
import { GamePlayResultEntity } from '../../../domain/entities/game-play-result.entity.js';

export class GamePlayResultMapper {
  static toDomain(record: GamePlayResultModel): GamePlayResultEntity {
    return GamePlayResultEntity.fromPersistence({
      id: record.id,
      studentUserId: record.studentUserId,
      classId: record.classId,
      gameId: record.gameId,
      gameTitle: record.gameTitle,
      subjectId: record.subjectId,
      subjectName: record.subjectName,
      score: record.score,
      correctCount: record.correctCount,
      incorrectCount: record.incorrectCount,
      timePlayedMs: record.timePlayedMs,
      playedAt: record.playedAt,
    });
  }

  static toPersistence(result: GamePlayResultEntity) {
    const props = result.toPersistence();

    return {
      id: props.id,
      studentUserId: props.studentUserId,
      classId: props.classId,
      gameId: props.gameId,
      gameTitle: props.gameTitle,
      subjectId: props.subjectId,
      subjectName: props.subjectName,
      score: props.score,
      correctCount: props.correctCount,
      incorrectCount: props.incorrectCount,
      timePlayedMs: props.timePlayedMs,
      playedAt: props.playedAt,
    };
  }
}
