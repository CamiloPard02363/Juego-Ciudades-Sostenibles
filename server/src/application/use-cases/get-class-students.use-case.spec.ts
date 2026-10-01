import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { ClassEnrollment } from '../../domain/entities/class-enrollment.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { GetClassStudentsUseCase } from './get-class-students.use-case.js';

function createClass(overrides: { organizationId?: string | null; teacherUserId?: string } = {}) {
  return ClassEntity.fromPersistence({
    id: 'class-1',
    name: 'Ciudades sostenibles',
    description: '',
    teacherUserId: overrides.teacherUserId ?? 'teacher-1',
    organizationId:
      overrides.organizationId === undefined ? 'org-1' : overrides.organizationId,
    inviteCode: 'ABC123',
    createdAt: new Date(),
    isActive: true,
  });
}

function enrollment(userId: string) {
  return ClassEnrollment.fromPersistence({
    id: `enr-${userId}`,
    classId: 'class-1',
    userId,
    enrolledAt: new Date(),
  });
}

function membership(orgRoleName: 'STUDENT' | 'TEACHER' | 'ADMIN'): OrganizationMembership {
  return {
    organizationId: 'org-1',
    userId: 'requester-1',
    orgRole: OrganizationRole.create(orgRoleName),
    joinedAt: new Date(),
    isAdmin: () => orgRoleName === 'ADMIN',
  } as OrganizationMembership;
}

function setup(options: {
  classEntity: ClassEntity | null;
  enrollments?: ClassEnrollment[];
  requestingMembership?: OrganizationMembership | null;
  isPlatformAdmin?: boolean;
}) {
  const classRepository: ClassRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => options.classEntity),
    findByInviteCode: vi.fn(),
    findAllByTeacherUserId: vi.fn(),
    findAll: vi.fn(),
    findAllByOrganizationId: vi.fn(),
    addGame: vi.fn(),
    removeGame: vi.fn(),
    findGameIdsByClassId: vi.fn(),
    findClassGamesByClassId: vi.fn(),
    findClassGame: vi.fn(),
    setClassGameArchived: vi.fn(),
    findClassIdsContainingGame: vi.fn(),
    enroll: vi.fn(),
    unenroll: vi.fn(),
    findEnrollment: vi.fn(),
    findClassIdsEnrolledByUserId: vi.fn(),
    findAllClassesEnrolledByUserId: vi.fn(),
    findEnrollmentsByClassIds: vi.fn(async () => options.enrollments ?? []),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(async () => []),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const organizationRepository: OrganizationRepository = {
    createWithOwner: vi.fn(),
    save: vi.fn(),
    findById: vi.fn(),
    findByDomain: vi.fn(),
    findByInviteCode: vi.fn(),
    findAll: vi.fn(),
    findAllByUserId: vi.fn(),
    saveMembership: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(async () => options.requestingMembership ?? null),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const requesterAdminResolver = {
    resolve: vi.fn(async () => options.isPlatformAdmin ?? false),
  } as unknown as RequesterAdminResolver;

  const classAccessResolver = new ClassAccessResolver(organizationRepository, requesterAdminResolver);

  const useCase = new GetClassStudentsUseCase(classRepository, userRepository, classAccessResolver);

  return { useCase, classRepository };
}

describe('GetClassStudentsUseCase', () => {
  it('lanza ClassNotFoundError si la clase no existe', async () => {
    const { useCase } = setup({ classEntity: null });

    await expect(useCase.execute({ classId: 'missing', requestingUserId: 'teacher-1' })).rejects.toThrow(
      ClassNotFoundError,
    );
  });

  it('el profesor dueño de la clase puede ver sus estudiantes', async () => {
    const classEntity = createClass();
    const { useCase } = setup({ classEntity, enrollments: [enrollment('s1')] });

    const result = await useCase.execute({ classId: 'class-1', requestingUserId: 'teacher-1' });

    expect(result).toHaveLength(1);
  });

  it('un admin de la institución dueña de la clase puede ver los estudiantes (issue #226)', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase } = setup({
      classEntity,
      enrollments: [enrollment('s1')],
      requestingMembership: membership('ADMIN'),
    });

    const result = await useCase.execute({ classId: 'class-1', requestingUserId: 'requester-1' });

    expect(result).toHaveLength(1);
  });

  it('el admin global de la plataforma puede ver los estudiantes de cualquier clase', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase } = setup({
      classEntity,
      enrollments: [enrollment('s1')],
      isPlatformAdmin: true,
    });

    const result = await useCase.execute({ classId: 'class-1', requestingUserId: 'platform-admin-1' });

    expect(result).toHaveLength(1);
  });

  it('un usuario sin relación con la clase recibe 403', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase } = setup({ classEntity, requestingMembership: null });

    await expect(
      useCase.execute({ classId: 'class-1', requestingUserId: 'stranger' }),
    ).rejects.toThrow(ForbiddenActionError);
  });
});
