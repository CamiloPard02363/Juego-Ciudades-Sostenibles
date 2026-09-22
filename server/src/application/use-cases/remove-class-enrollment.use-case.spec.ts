import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { RemoveClassEnrollmentUseCase } from './remove-class-enrollment.use-case.js';

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
    findMembership: vi.fn(async () => options.requestingMembership ?? null),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const useCase = new RemoveClassEnrollmentUseCase(classRepository, organizationRepository);

  return { useCase, classRepository, organizationRepository };
}

describe('RemoveClassEnrollmentUseCase', () => {
  it('lanza ClassNotFoundError si la clase no existe', async () => {
    const { useCase } = setup({ classEntity: null });

    await expect(
      useCase.execute({ classId: 'missing', studentUserId: 's1', requestingUserId: 'teacher-1' }),
    ).rejects.toThrow(ClassNotFoundError);
  });

  it('el profesor dueño de la clase puede expulsar a un estudiante', async () => {
    const classEntity = createClass();
    const { useCase, classRepository } = setup({ classEntity });

    await useCase.execute({ classId: 'class-1', studentUserId: 's1', requestingUserId: 'teacher-1' });

    expect(classRepository.unenroll).toHaveBeenCalledWith('class-1', 's1');
  });

  it('un OrganizationRole.ADMIN de la organización dueña de la clase puede expulsar (CA3.2)', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase, classRepository } = setup({
      classEntity,
      requestingMembership: membership('ADMIN'),
    });

    await useCase.execute({
      classId: 'class-1',
      studentUserId: 's1',
      requestingUserId: 'requester-1',
    });

    expect(classRepository.unenroll).toHaveBeenCalledWith('class-1', 's1');
  });

  it('un OrganizationRole.TEACHER (no ADMIN) de la organización NO puede expulsar', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase, classRepository } = setup({
      classEntity,
      requestingMembership: membership('TEACHER'),
    });

    await expect(
      useCase.execute({ classId: 'class-1', studentUserId: 's1', requestingUserId: 'requester-1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(classRepository.unenroll).not.toHaveBeenCalled();
  });

  it('un usuario sin membresía en la organización de la clase recibe 403', async () => {
    const classEntity = createClass({ organizationId: 'org-1' });
    const { useCase, classRepository } = setup({ classEntity, requestingMembership: null });

    await expect(
      useCase.execute({ classId: 'class-1', studentUserId: 's1', requestingUserId: 'stranger' }),
    ).rejects.toThrow(ForbiddenException);
    expect(classRepository.unenroll).not.toHaveBeenCalled();
  });

  it('clase sin organizationId (profesor particular): solo el profesor dueño puede expulsar, sin lanzar error de organización', async () => {
    const classEntity = createClass({ organizationId: null });
    const { useCase, classRepository, organizationRepository } = setup({ classEntity });

    await expect(
      useCase.execute({ classId: 'class-1', studentUserId: 's1', requestingUserId: 'someone-else' }),
    ).rejects.toThrow(ForbiddenException);
    expect(organizationRepository.findMembership).not.toHaveBeenCalled();
    expect(classRepository.unenroll).not.toHaveBeenCalled();
  });

  it('clase sin organizationId: el profesor dueño sí puede expulsar', async () => {
    const classEntity = createClass({ organizationId: null, teacherUserId: 'teacher-1' });
    const { useCase, classRepository } = setup({ classEntity });

    await useCase.execute({ classId: 'class-1', studentUserId: 's1', requestingUserId: 'teacher-1' });

    expect(classRepository.unenroll).toHaveBeenCalledWith('class-1', 's1');
  });
});
