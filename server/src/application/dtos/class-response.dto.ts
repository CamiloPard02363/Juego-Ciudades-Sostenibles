import type { ClassEntity } from '../../domain/entities/class.entity.js';

export type ClassDto = {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  organizationId: string | null;
  inviteCode: string;
  createdAt: string;
};

export function toClassDto(classEntity: ClassEntity): ClassDto {
  return {
    id: classEntity.id,
    name: classEntity.name,
    description: classEntity.description,
    teacherUserId: classEntity.teacherUserId,
    organizationId: classEntity.organizationId,
    inviteCode: classEntity.inviteCode,
    createdAt: classEntity.createdAt.toISOString(),
  };
}
