import { Injectable } from '@nestjs/common';
import type {
  GameAggregate,
  GamePlayResultRepository,
  ScoreOverTimeBucket,
  StudentScoreAggregate,
  SubjectAggregate,
} from '../../../domain/ports/game-play-result.repository.port.js';
import type { GamePlayResultEntity } from '../../../domain/entities/game-play-result.entity.js';
import { PrismaService } from './prisma.service.js';
import { GamePlayResultMapper } from './game-play-result.mapper.js';

@Injectable()
export class PrismaGamePlayResultRepository implements GamePlayResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(result: GamePlayResultEntity): Promise<void> {
    const data = GamePlayResultMapper.toPersistence(result);
    await this.prisma.gamePlayResultModel.create({ data });
  }

  async aggregateScoreByStudentForClass(classId: string): Promise<StudentScoreAggregate[]> {
    const grouped = await this.prisma.gamePlayResultModel.groupBy({
      by: ['studentUserId'],
      where: { classId },
      _sum: { score: true },
      _count: { _all: true },
    });

    return grouped.map((row) => ({
      studentUserId: row.studentUserId,
      totalScore: row._sum.score ?? 0,
      gamesPlayed: row._count._all,
    }));
  }

  async aggregateByGameForStudent(studentUserId: string): Promise<GameAggregate[]> {
    const records = await this.prisma.gamePlayResultModel.findMany({
      where: { studentUserId },
      orderBy: { playedAt: 'asc' },
      select: {
        gameId: true,
        gameTitle: true,
        score: true,
        correctCount: true,
        incorrectCount: true,
        timePlayedMs: true,
        playedAt: true,
      },
    });

    const byGame = new Map<string, GameAggregate>();
    for (const record of records) {
      const existing = byGame.get(record.gameId);
      if (!existing) {
        byGame.set(record.gameId, {
          gameId: record.gameId,
          gameTitle: record.gameTitle,
          totalScore: record.score,
          correctCount: record.correctCount,
          incorrectCount: record.incorrectCount,
          timePlayedMs: record.timePlayedMs,
          attempts: 1,
          lastPlayedAt: record.playedAt,
        });
        continue;
      }

      existing.totalScore += record.score;
      existing.correctCount += record.correctCount;
      existing.incorrectCount += record.incorrectCount;
      existing.timePlayedMs += record.timePlayedMs;
      existing.attempts += 1;
      existing.lastPlayedAt = record.playedAt;
    }

    return [...byGame.values()];
  }

  async aggregateBySubjectForStudent(studentUserId: string): Promise<SubjectAggregate[]> {
    const records = await this.prisma.gamePlayResultModel.findMany({
      where: { studentUserId, subjectId: { not: null } },
      select: {
        subjectId: true,
        subjectName: true,
        score: true,
        correctCount: true,
        incorrectCount: true,
        timePlayedMs: true,
      },
    });

    const bySubject = new Map<string, SubjectAggregate>();
    for (const record of records) {
      const subjectId = record.subjectId as string;
      const subjectName = record.subjectName ?? 'Sin materia';
      const existing = bySubject.get(subjectId);
      if (!existing) {
        bySubject.set(subjectId, {
          subjectId,
          subjectName,
          totalScore: record.score,
          correctCount: record.correctCount,
          incorrectCount: record.incorrectCount,
          timePlayedMs: record.timePlayedMs,
          attempts: 1,
        });
        continue;
      }

      existing.totalScore += record.score;
      existing.correctCount += record.correctCount;
      existing.incorrectCount += record.incorrectCount;
      existing.timePlayedMs += record.timePlayedMs;
      existing.attempts += 1;
    }

    return [...bySubject.values()];
  }

  async aggregateScoreOverTimeForStudent(
    studentUserId: string,
    sinceDate: Date,
  ): Promise<ScoreOverTimeBucket[]> {
    const records = await this.prisma.gamePlayResultModel.findMany({
      where: { studentUserId, playedAt: { gte: sinceDate } },
      orderBy: { playedAt: 'asc' },
      select: { score: true, playedAt: true },
    });

    const byDay = new Map<string, ScoreOverTimeBucket>();
    for (const record of records) {
      const dayKey = record.playedAt.toISOString().slice(0, 10);
      const existing = byDay.get(dayKey);
      if (!existing) {
        byDay.set(dayKey, {
          bucketStart: new Date(`${dayKey}T00:00:00.000Z`),
          totalScore: record.score,
          attempts: 1,
        });
        continue;
      }
      existing.totalScore += record.score;
      existing.attempts += 1;
    }

    return [...byDay.values()].sort(
      (a, b) => a.bucketStart.getTime() - b.bucketStart.getTime(),
    );
  }
}
