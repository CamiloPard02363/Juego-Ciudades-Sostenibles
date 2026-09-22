import type { ClassEntity } from '../../domain/entities/class.entity.js';

export type ClassDto = {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  organizationId: string | null;
  /** Nombre de la organización dueña de la clase (issue #133, CA-D1). `null` si no tiene o no se resolvió. */
  organizationName: string | null;
  inviteCode: string;
  createdAt: string;
  /** Soft-delete de la clase (issue #133, Frente E). */
  isActive: boolean;
};

export function toClassDto(classEntity: ClassEntity, organizationName: string | null = null): ClassDto {
  return {
    id: classEntity.id,
    name: classEntity.name,
    description: classEntity.description,
    teacherUserId: classEntity.teacherUserId,
    organizationId: classEntity.organizationId,
    organizationName,
    inviteCode: classEntity.inviteCode,
    createdAt: classEntity.createdAt.toISOString(),
    isActive: classEntity.isActive,
  };
}
