import { InvalidGamePlayResultError } from '../errors/game-play-result.errors.js';

export interface GamePlayResultProps {
  id: string;
  studentUserId: string;
  classId: string | null;
  gameId: string;
  gameTitle: string;
  subjectId: string | null;
  subjectName: string | null;
  score: number;
  correctCount: number;
  incorrectCount: number;
  timePlayedMs: number;
  playedAt: Date;
}

export interface RecordGamePlayResultProps {
  id: string;
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
 * Hecho atómico de una partida jugada por un estudiante (issue #226). Única
 * responsabilidad: garantizar que un resultado individual sea válido antes de
 * persistirlo. Toda agregación (ranking, desglose por materia, evolución en
 * el tiempo) vive en servicios de aplicación que leen muchas instancias de
 * esta entidad — no en la entidad misma (SRP).
 */
export class GamePlayResultEntity {
  private constructor(private readonly props: GamePlayResultProps) {}

  static create(props: RecordGamePlayResultProps): GamePlayResultEntity {
    if (props.score < 0) {
      throw new InvalidGamePlayResultError('el puntaje no puede ser negativo.');
    }
    if (props.correctCount < 0 || props.incorrectCount < 0) {
      throw new InvalidGamePlayResultError('los conteos de aciertos/errores no pueden ser negativos.');
    }
    if (props.timePlayedMs < 0) {
      throw new InvalidGamePlayResultError('el tiempo jugado no puede ser negativo.');
    }

    return new GamePlayResultEntity({
      id: props.id,
      studentUserId: props.studentUserId,
      classId: props.classId ?? null,
      gameId: props.gameId,
      gameTitle: props.gameTitle,
      subjectId: props.subjectId ?? null,
      subjectName: props.subjectName ?? null,
      score: props.score,
      correctCount: props.correctCount,
      incorrectCount: props.incorrectCount,
      timePlayedMs: props.timePlayedMs,
      playedAt: new Date(),
    });
  }

  static fromPersistence(props: GamePlayResultProps): GamePlayResultEntity {
    return new GamePlayResultEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get studentUserId(): string {
    return this.props.studentUserId;
  }
  get classId(): string | null {
    return this.props.classId;
  }
  get gameId(): string {
    return this.props.gameId;
  }
  get gameTitle(): string {
    return this.props.gameTitle;
  }
  get subjectId(): string | null {
    return this.props.subjectId;
  }
  get subjectName(): string | null {
    return this.props.subjectName;
  }
  get score(): number {
    return this.props.score;
  }
  get correctCount(): number {
    return this.props.correctCount;
  }
  get incorrectCount(): number {
    return this.props.incorrectCount;
  }
  get timePlayedMs(): number {
    return this.props.timePlayedMs;
  }
  get playedAt(): Date {
    return this.props.playedAt;
  }

  toPersistence(): GamePlayResultProps {
    return { ...this.props };
  }
}
