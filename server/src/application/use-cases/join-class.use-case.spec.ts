import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { ClassEntity } from '../../domain/entities/class.entity.js';
import { Organization } from '../../domain/entities/organization.entity.js';
import { ClassNotFoundError, NotAnOrganizationMemberError } from '../errors/application.errors.js';
import { ClassInactiveError } from '../errors/application.errors.js';
import { JoinClassUseCase } from './join-class.use-case.js';

function createClass(overrides: {
  organizationId?: string | null;
  isActive?: boolean;
} = {}) {
  return ClassEntity.fromPersistence({
    id: 'class-1',
    name: 'Ciudades sostenibles',
    description: '',
    teacherUserId: 'teacher-1',
    organizationId: overrides.organizationId === undefined ? 'org-1' : overrides.organizationId,
    inviteCode: 'ABC123',
    createdAt: new Date(),
    isActive: overrides.isActive ?? true,
  });
}

function org(isActive = true) {
  return Organization.fromPersistence({
    id: 'org-1',
    name: 'Colegio',
    domain: null,
    createdByUserId: 'creator-1',
    createdAt: new Date(),
    isActive,
    inviteCode: 'ORGABC',
  });
}

function setup(options: {
  classEntity: ClassEntity | null;
  organization?: Organization | null;
  membership?: OrganizationMembership | null;
}) {
  const classRepository: ClassRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByInviteCode: vi.fn(async () => options.classEntity),
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
    findById: vi.fn(async () => options.organization ?? null),
    findByDomain: vi.fn(),
    findByInviteCode: vi.fn(),
    findAll: vi.fn(),
    findAllByUserId: vi.fn(),
    saveMembership: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(async () => options.membership ?? null),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const idGenerator = { generate: vi.fn(() => 'enrollment-1') };

  const useCase = new JoinClassUseCase(classRepository, organizationRepository, idGenerator);

  return { useCase, classRepository, organizationRepository };
}

describe('JoinClassUseCase', () => {
  it('lanza ClassNotFoundError si el código no resuelve ninguna clase', async () => {
    const { useCase } = setup({ classEntity: null });

    await expect(
      useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' }),
    ).rejects.toThrow(ClassNotFoundError);
  });

  it('lanza ClassInactiveError si la clase está desactivada (CA-E5)', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass({ isActive: false }),
    });

    await expect(
      useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' }),
    ).rejects.toThrow(ClassInactiveError);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenException si la organización de la clase está desactivada (issue #106)', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      organization: org(false),
    });

    await expect(
      useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('CA-B1/CA-B3: estudiante NO miembro de la organización de la clase falla con NotAnOrganizationMemberError, sin crear enrollment', async () => {
    const { useCase, classRepository, organizationRepository } = setup({
      classEntity: createClass(),
      organization: org(true),
      membership: null,
    });

    await expect(
      useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' }),
    ).rejects.toThrow(NotAnOrganizationMemberError);
    expect(organizationRepository.findMembership).toHaveBeenCalledWith('org-1', 'student-1');
    expect(classRepository.enroll).not.toHaveBeenCalled();
  });

  it('CA-B1: estudiante miembro de la organización se matricula exitosamente', async () => {
    const { useCase, classRepository } = setup({
      classEntity: createClass(),
      organization: org(true),
      membership: {} as OrganizationMembership,
    });

    const dto = await useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' });

    expect(classRepository.enroll).toHaveBeenCalled();
    expect(dto.id).toBe('class-1');
  });

  it('clase sin organización (profesor particular): matricula sin exigir membresía (sin regresión)', async () => {
    const { useCase, classRepository, organizationRepository } = setup({
      classEntity: createClass({ organizationId: null }),
    });

    const dto = await useCase.execute({ inviteCode: 'ABC123', requestingUserId: 'student-1' });

    expect(organizationRepository.findMembership).not.toHaveBeenCalled();
    expect(classRepository.enroll).toHaveBeenCalled();
    expect(dto.id).toBe('class-1');
  });
});
