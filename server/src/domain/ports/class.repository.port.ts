import { ClassEntity } from '../entities/class.entity.js';

export const CLASS_REPOSITORY = Symbol('CLASS_REPOSITORY');

export interface ClassRepository {
  save(classEntity: ClassEntity): Promise<void>;
  findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]>;
}
