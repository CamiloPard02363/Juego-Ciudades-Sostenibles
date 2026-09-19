import { ClassEntity } from '../entities/class.entity.js';
import { ClassGame } from '../entities/class-game.entity.js';
import { ClassEnrollment } from '../entities/class-enrollment.entity.js';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');

export interface ClassRepository {
  save(classEntity: ClassEntity): Promise<void>;
  findById(id: string): Promise<ClassEntity | null>;
  findByInviteCode(inviteCode: string): Promise<ClassEntity | null>;
  findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]>;
  /** Query sin filtro de pertenencia — solo para ADMIN global de plataforma (issue #101). */
  findAll(): Promise<ClassEntity[]>;
  addGame(classGame: ClassGame): Promise<void>;
  removeGame(classId: string, gameId: string): Promise<void>;
  findGameIdsByClassId(classId: string): Promise<string[]>;
  /**
   * Ids de las Class que contienen este juego. Usado por la regla de
   * autorización de detalle de juego en DRAFT (issue #101, punto 2): un
   * estudiante matriculado en alguna de esas clases puede verlo.
   */
  findClassIdsContainingGame(gameId: string): Promise<string[]>;

  /**
   * Idempotente por diseño (`POST /classes/join` no debe fallar ni duplicar
   * fila si el estudiante ya está matriculado) — la implementación debe
   * hacer upsert sobre `(classId, userId)`.
   */
  enroll(enrollment: ClassEnrollment): Promise<void>;
  unenroll(classId: string, userId: string): Promise<void>;
  findEnrollment(classId: string, userId: string): Promise<ClassEnrollment | null>;
  findClassIdsEnrolledByUserId(userId: string): Promise<string[]>;
  findAllClassesEnrolledByUserId(userId: string): Promise<ClassEntity[]>;
  /**
   * Matrículas de varias clases a la vez (issue #106, CA1.2): evita N
   * consultas al armar la vista consolidada "mis clases + estudiantes" de un
   * profesor con varias clases.
   */
  findEnrollmentsByClassIds(classIds: string[]): Promise<ClassEnrollment[]>;
}
