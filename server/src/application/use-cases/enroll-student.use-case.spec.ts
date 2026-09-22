import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  ClassHasNoOrganizationError,
  ClassInactiveError,
  ClassNotFoundError,
  NotAnOrganizationMemberError,
} from '../errors/application.errors.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { EnrollStudentUseCase } from './enroll-student.use-case.js';

function createClass(overrides: {
  organizationId?: string | null;
  isActive?: boolean;
  teacherUserId?: string;
} = {}) {
  return ClassEntity.fromPersistence({
    id: 'class-1',
    name: 'Ciudades sostenibles',
    description: '',
    teacherUserId: overrides.teacherUserId ?? 'teacher-1',
    organizationId: overrides.organizationId === undefined ? 'org-1' : overrides.organizationId,
    inviteCode: 'ABC123',
    createdAt: new Date(),
    isActive: overrides.isActive ?? true,
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
  requestingMembership?: OrganizationMembership | null;
  targetMembership?: OrganizationMembership | null;
  requestingUserIsPlatformAdmin?: boolean;
}) {
  const classRepository: ClassRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => options.classEntity),
    findByInviteCode: vi.fn(),
    findAllByTeacherUserId: vi.fn(),
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
    findEnrollmentsByClassIds: vi.fn(),
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
    findMembership: vi.fn(async (_organizationId: string, userId: string) =>
      userId === 'student-1' ? (options.targetMembership ?? null) : (options.requestingMembership ?? null),
    ),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(
      async () => ({ isAdmin: () => options.requestingUserIsPlatformAdmin ?? false }) as never,
    ),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const idGenerator = { generate: vi.fn(() => 'enrollment-1') };
  const requesterAdminResolver = new RequesterAdminResolver(userRepository);

  const useCase = new EnrollStudentUseCase(
    classRepository,
    organizationRepository,
    idGenerator,
    requesterAdminResolver,
  );

  return { useCase, classRepository, organizationRepository };
}

describe('EnrollStudentUseCase', () => {
  it('lanza ClassNotFoundError si la clase no existe', async () => {
    const { useCase } = setup({ classEntity: null });

    await expect(
      useCase.execute({ classId: 'missing', userId: 'student-1', requestingUserId: 'teacher-1' }),
    ).rejects.toThrow(ClassNotFoundError);
  });

  it('CA-C2: lanza ClassHasNoOrganizationError si la clase no tiene organización', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass({ organizationId: null }),
    });

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'student-1', requestingUserId: 'teacher-1' }),
    ).rejects.toThrow(ClassHasNoOrganizationError);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('el profesor dueño de la clase puede matricular directo', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      targetMembership: {} as OrganizationMembership,
    });

    const dto = await useCase.execute({
      classId: 'class-1',
      userId: 'student-1',
      requestingUserId: 'teacher-1',
    });

    expect(classRepository.enroll).toHaveBeenCalled();
    expect(dto.id).toBe('class-1');
  });

  it('un profesor que NO es dueño de la clase ni ADMIN recibe 403', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      requestingMembership: membership('TEACHER'),
      targetMembership: {} as OrganizationMembership,
    });

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'student-1', requestingUserId: 'requester-1' }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('un OrganizationRole.ADMIN de la organización dueña puede matricular', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      requestingMembership: membership('ADMIN'),
      targetMembership: {} as OrganizationMembership,
    });

    const dto = await useCase.execute({
      classId: 'class-1',
      userId: 'student-1',
      requestingUserId: 'requester-1',
    });

    expect(classRepository.enroll).toHaveBeenCalled();
    expect(dto.id).toBe('class-1');
  });

  it('CA-B2: rechaza matricular a un usuario que NO es miembro de la organización, aunque el profesor sea dueño', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      targetMembership: null,
    });

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'student-1', requestingUserId: 'teacher-1' }),
    ).rejects.toThrow(NotAnOrganizationMemberError);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('CA-E5: rechaza matricular si la clase está desactivada', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass({ isActive: false }),
      targetMembership: {} as OrganizationMembership,
    });

    await expect(
      useCase.execute({ classId: 'class-1', userId: 'student-1', requestingUserId: 'teacher-1' }),
    ).rejects.toThrow(ClassInactiveError);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });
});
