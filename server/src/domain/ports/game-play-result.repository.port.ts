import { GamePlayResultEntity } from '../entities/game-play-result.entity.js';

export const GAME_PLAY_RESULT_REPOSITORY = Symbol('GAME_PLAY_RESULT_REPOSITORY');

/** Fila cruda agregada por estudiante, usada para armar el ranking de una clase. */
export interface StudentScoreAggregate {
  studentUserId: string;
  totalScore: number;
  gamesPlayed: number;
}

/** Fila cruda agregada por juego, para el desglose "por juego" del estudiante. */
export interface GameAggregate {
  gameId: string;
  gameTitle: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  timePlayedMs: number;
  attempts: number;
  lastPlayedAt: Date;
}

/** Fila cruda agregada por materia, para el desglose "por materia" del estudiante. */
export interface SubjectAggregate {
  subjectId: string;
  subjectName: string;
  totalScore: number;
  correctCount: number;
  incorrectCount: number;
  timePlayedMs: number;
  attempts: number;
}

/** Punto de la serie de tiempo de evolución del estudiante. */
export interface ScoreOverTimeBucket {
  bucketStart: Date;
  totalScore: number;
  attempts: number;
}

export interface GamePlayResultRepository {
  save(result: GamePlayResultEntity): Promise<void>;

  /** Puntaje total agregado por estudiante dentro de una clase (ranking de clase). */
  aggregateScoreByStudentForClass(classId: string): Promise<StudentScoreAggregate[]>;

  /** Desglose agregado por juego de un estudiante (todas sus clases/partidas). */
  aggregateByGameForStudent(studentUserId: string): Promise<GameAggregate[]>;

  /** Desglose agregado por materia de un estudiante. */
  aggregateBySubjectForStudent(studentUserId: string): Promise<SubjectAggregate[]>;

  /**
   * Evolución del puntaje de un estudiante agrupada por día, en una ventana de
   * tiempo. Pensada para graficar una serie temporal (no solo snapshot).
   */
  aggregateScoreOverTimeForStudent(
    studentUserId: string,
    sinceDate: Date,
  ): Promise<ScoreOverTimeBucket[]>;
}
