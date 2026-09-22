import type { ClassEntity } from '../../domain/entities/class.entity.js';
import type { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import type { User } from '../../domain/entities/user.entity.js';

export interface EnrolledStudentDto {
  userId: string;
  displayName: string | null;
  email: string | null;
  enrolledAt: string;
}

export interface ClassDetailDto {
  id: string;
  name: string;
  description: string;
  teacherUserId: string;
  organizationId: string | null;
  inviteCode: string;
  createdAt: string;
  /** Soft-delete de la clase (issue #133, Frente E). */
  isActive: boolean;
  students: EnrolledStudentDto[];
}

/**
 * Vista consolidada "mis clases + matriculados" del profesor (issue #106,
 * CA1.2). `usersById` resuelve `displayName`/`email` de cada matrícula; si un
 * usuario no aparece (borrado, dato inconsistente), se devuelve `null` en vez
 * de romper el listado completo.
 */
export function toClassDetailDto(
  classEntity: ClassEntity,
  enrollments: ClassEnrollment[],
  usersById: Map<string, User>,
): ClassDetailDto {
  return {
    id: classEntity.id,
    name: classEntity.name,
    description: classEntity.description,
    teacherUserId: classEntity.teacherUserId,
    organizationId: classEntity.organizationId,
    inviteCode: classEntity.inviteCode,
    createdAt: classEntity.createdAt.toISOString(),
    isActive: classEntity.isActive,
    students: enrollments.map((enrollment) => {
      const user = usersById.get(enrollment.userId);
      return {
        userId: enrollment.userId,
        displayName: user?.displayName ?? null,
        email: user?.email.getValue() ?? null,
        enrolledAt: enrollment.enrolledAt.toISOString(),
      };
    }),
  };
}
