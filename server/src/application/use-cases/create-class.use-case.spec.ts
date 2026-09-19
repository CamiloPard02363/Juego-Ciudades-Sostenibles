import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ClassRepository } from '../../domain/ports/class.repository.port.js';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Role } from '../../domain/value-objects/role.vo.js';
import { TeacherPersonalOrganizationService } from '../services/teacher-personal-organization.service.js';
import { CreateClassUseCase } from './create-class.use-case.js';

function teacherUser(id = 'teacher-1') {
  return {
    id,
    displayName: 'Profe Uno',
    role: Role.teacher(),
  } as never;
}

function setup(options: { hasMembership: boolean; personalOrgId?: string }) {
  const classRepository: ClassRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByInviteCode: vi.fn(async () => null),
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
    findAll: vi.fn(),
    findAllByUserId: vi.fn(async () => []),
    saveMembership: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(async () =>
      options.hasMembership ? ({} as OrganizationMembership) : null,
    ),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => teacherUser()),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const idGenerator = { generate: vi.fn(() => 'class-generated-id') };
  const inviteCodeGenerator = { generate: vi.fn(() => 'ABC123') };

  const teacherPersonalOrganization = new TeacherPersonalOrganizationService(
    organizationRepository,
    idGenerator,
  );
  vi.spyOn(teacherPersonalOrganization, 'ensurePersonalOrganization').mockResolvedValue(
    options.personalOrgId ?? 'personal-org-1',
  );

  const useCase = new CreateClassUseCase(
    classRepository,
    idGenerator,
    inviteCodeGenerator,
    userRepository,
    organizationRepository,
    teacherPersonalOrganization,
  );

  return { useCase, classRepository, organizationRepository, teacherPersonalOrganization };
}

describe('CreateClassUseCase', () => {
  it('sin organizationId: usa la organización personal auto-creada (comportamiento previo, sin regresión)', async () => {
    const { useCase, classRepository, teacherPersonalOrganization } = setup({
      hasMembership: false,
    });

    const dto = await useCase.execute({ teacherUserId: 'teacher-1', name: 'Ciudades' });

    expect(teacherPersonalOrganization.ensurePersonalOrganization).toHaveBeenCalled();
    expect(dto.organizationId).toBe('personal-org-1');
    expect(classRepository.save).toHaveBeenCalled();
  });

  it('con organizationId y el profesor es miembro: crea la clase asociada a esa organización (CA1.1)', async () => {
    const { useCase, organizationRepository } = setup({ hasMembership: true });

    const dto = await useCase.execute({
      teacherUserId: 'teacher-1',
      name: 'Ciudades',
      organizationId: 'org-escuela',
    });

    expect(organizationRepository.findMembership).toHaveBeenCalledWith(
      'org-escuela',
      'teacher-1',
    );
    expect(dto.organizationId).toBe('org-escuela');
  });

  it('con organizationId pero el profesor NO pertenece a esa organización: 403 (CA1.1)', async () => {
    const { useCase, classRepository } = setup({ hasMembership: false });

    await expect(
      useCase.execute({
        teacherUserId: 'teacher-1',
        name: 'Ciudades',
        organizationId: 'org-ajena',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(classRepository.save).not.toHaveBeenCalled();
  });
});
