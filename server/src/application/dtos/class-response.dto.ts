import type { ClassEntity } from '../../domain/entities/class.entity.js';

export type ClassDto = {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  createdAt: string;
};

export function toClassDto(classEntity: ClassEntity): ClassDto {
  return {
    id: classEntity.id,
    name: classEntity.name,
    description: classEntity.description,
    teacherUserId: classEntity.teacherUserId,
    createdAt: classEntity.createdAt.toISOString(),
  };
}
