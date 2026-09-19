import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import { ListMyClassesDetailUseCase } from './list-my-classes-detail.use-case.js';

function classEntity(id: string) {
  return ClassEntity.fromPersistence({
    id,
    name: `Clase ${id}`,
    description: '',
    teacherUserId: 'teacher-1',
    organizationId: 'org-1',
    inviteCode: `CODE-${id}`,
    createdAt: new Date(),
  });
}

function enrollment(classId: string, userId: string) {
  return ClassEnrollment.fromPersistence({
    id: `enr-${classId}-${userId}`,
    classId,
    userId,
    enrolledAt: new Date(),
  });
}

function studentUser(id: string) {
  return {
    id,
    displayName: `Estudiante ${id}`,
    email: { getValue: () => `${id}@test.com` },
  } as never;
}

function setup(options: {
  isTeacher: boolean;
  classes: ClassEntity[];
  enrollments: ClassEnrollment[];
  students: ReturnType<typeof studentUser>[];
}) {
  const classRepository: ClassRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByInviteCode: vi.fn(),
    findAllByTeacherUserId: vi.fn(async () => options.classes),
    findAll: vi.fn(),
    addGame: vi.fn(),
    removeGame: vi.fn(),
    findGameIdsByClassId: vi.fn(),
    findClassIdsContainingGame: vi.fn(),
    enroll: vi.fn(),
    unenroll: vi.fn(),
    findEnrollment: vi.fn(),
    findClassIdsEnrolledByUserId: vi.fn(),
    findAllClassesEnrolledByUserId: vi.fn(),
    findEnrollmentsByClassIds: vi.fn(async () => options.enrollments),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => ({
      role: options.isTeacher ? Role.teacher() : Role.student(),
    }) as never),
    findByIds: vi.fn(async () => options.students),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new ListMyClassesDetailUseCase(classRepository, userRepository);

  return { useCase, classRepository };
}

describe('ListMyClassesDetailUseCase', () => {
  it('un usuario que no es TEACHER recibe 403', async () => {
    const { useCase } = setup({ isTeacher: false, classes: [], enrollments: [], students: [] });

    await expect(useCase.execute('user-1')).rejects.toThrow(ForbiddenException);
  });

  it('sin clases propias: devuelve lista vacía sin consultar matrículas', async () => {
    const { useCase, classRepository } = setup({
      isTeacher: true,
      classes: [],
      enrollments: [],
      students: [],
    });

    const result = await useCase.execute('teacher-1');

    expect(result).toEqual([]);
    expect(classRepository.findEnrollmentsByClassIds).not.toHaveBeenCalled();
  });

  it('devuelve cada clase propia con su código de invitación y sus estudiantes matriculados (CA1.2)', async () => {
    const classA = classEntity('a');
    const classB = classEntity('b');
    const { useCase } = setup({
      isTeacher: true,
      classes: [classA, classB],
      enrollments: [enrollment('a', 's1'), enrollment('a', 's2')],
      students: [studentUser('s1'), studentUser('s2')],
    });

    const result = await useCase.execute('teacher-1');

    expect(result).toHaveLength(2);
    const detailA = result.find((c) => c.id === 'a')!;
    const detailB = result.find((c) => c.id === 'b')!;

    expect(detailA.inviteCode).toBe('CODE-a');
    expect(detailA.students).toHaveLength(2);
    expect(detailA.students.map((s) => s.userId).sort()).toEqual(['s1', 's2']);
    // No expone miembros de la organización que no estén matriculados en sus clases.
    expect(detailB.students).toHaveLength(0);
  });
});
