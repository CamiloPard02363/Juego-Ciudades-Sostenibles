import type {
  GameAggregate,
  ScoreOverTimeBucket,
  StudentScoreAggregate,
  SubjectAggregate,
} from '../../domain/ports/game-play-result.repository.port.js';

export interface ClassRankingEntryDto {
  studentUserId: string;
  displayName: string | null;
  totalScore: number;
  gamesPlayed: number;
  rank: number;
}

export interface ClassRankingDto {
  classId: string;
  entries: ClassRankingEntryDto[];
  /** Top N (por default 5) para alimentar el gráfico de pie de mejores estudiantes. */
  topForPieChart: ClassRankingEntryDto[];
}

export function toClassRankingDto(
  classId: string,
  aggregates: StudentScoreAggregate[],
  displayNameByStudentId: Map<string, string | null>,
  pieChartSize = 5,
): ClassRankingDto {
  const entries = [...aggregates]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((aggregate, index) => ({
      studentUserId: aggregate.studentUserId,
      displayName: displayNameByStudentId.get(aggregate.studentUserId) ?? null,
      totalScore: aggregate.totalScore,
      gamesPlayed: aggregate.gamesPlayed,
      rank: index + 1,
    }));

  return {
    classId,
    entries,
    topForPieChart: entries.slice(0, pieChartSize),
  };
}

export interface GameMetricDto {
  gameId: string;
  gameTitle: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  timePlayedMs: number;
  attempts: number;
  lastPlayedAt: string;
}

export interface SubjectMetricDto {
  subjectId: string;
  subjectName: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  timePlayedMs: number;
  attempts: number;
}

export interface ScoreOverTimePointDto {
  date: string;
  totalScore: number;
  attempts: number;
}

export interface StudentMetricsDto {
  studentUserId: string;
  byGame: GameMetricDto[];
  bySubject: SubjectMetricDto[];
  scoreOverTime: ScoreOverTimePointDto[];
}

function accuracyOf(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

export function toGameMetricDto(aggregate: GameAggregate): GameMetricDto {
  return {
    gameId: aggregate.gameId,
    gameTitle: aggregate.gameTitle,
    totalScore: aggregate.totalScore,
    correctCount: aggregate.correctCount,
    incorrectCount: aggregate.incorrectCount,
    accuracy: accuracyOf(aggregate.correctCount, aggregate.incorrectCount),
    timePlayedMs: aggregate.timePlayedMs,
    attempts: aggregate.attempts,
    lastPlayedAt: aggregate.lastPlayedAt.toISOString(),
  };
}

export function toSubjectMetricDto(aggregate: SubjectAggregate): SubjectMetricDto {
  return {
    subjectId: aggregate.subjectId,
    subjectName: aggregate.subjectName,
    totalScore: aggregate.totalScore,
    correctCount: aggregate.correctCount,
    incorrectCount: aggregate.incorrectCount,
    accuracy: accuracyOf(aggregate.correctCount, aggregate.incorrectCount),
    timePlayedMs: aggregate.timePlayedMs,
    attempts: aggregate.attempts,
  };
}

export function toScoreOverTimePointDto(bucket: ScoreOverTimeBucket): ScoreOverTimePointDto {
  return {
    date: bucket.bucketStart.toISOString().slice(0, 10),
    totalScore: bucket.totalScore,
    attempts: bucket.attempts,
  };
}
