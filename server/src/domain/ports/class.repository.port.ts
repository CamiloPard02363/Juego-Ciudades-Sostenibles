import { ClassEntity } from '../entities/class.entity.js';
import { ClassGame } from '../entities/class-game.entity.js';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');

export interface ClassRepository {
  save(classEntity: ClassEntity): Promise<void>;
  findById(id: string): Promise<ClassEntity | null>;
  findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]>;
  addGame(classGame: ClassGame): Promise<void>;
  removeGame(classId: string, gameId: string): Promise<void>;
  findGameIdsByClassId(classId: string): Promise<string[]>;
}
