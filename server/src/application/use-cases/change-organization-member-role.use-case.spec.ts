import { describe, expect, it, vi } from 'vitest';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Organization } from '../../domain/entities/organization.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import {
  CannotChangeOwnOrganizationRoleError,
  OrganizationNotFoundError,
  TargetUserNotMemberOfOrganizationError,
} from '../errors/application.errors.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { ChangeOrganizationMemberRoleUseCase } from './change-organization-member-role.use-case.js';

function org(id = 'org-1') {
  return Organization.fromPersistence({
    id,
    name: 'Colegio',
    domain: null,
    createdByUserId: 'creator-1',
    createdAt: new Date(),
    isActive: true,
    inviteCode: 'ORGABC',
  });
}

function membership(userId: string, orgRoleName: 'STUDENT' | 'TEACHER' | 'ADMIN'): OrganizationMembership {
  return {
    organizationId: 'org-1',
    userId,
    orgRole: OrganizationRole.create(orgRoleName),
    joinedAt: new Date(),
    isAdmin: () => orgRoleName === 'ADMIN',
    changeRole: vi.fn(),
  } as unknown as OrganizationMembership;
}

function setup(options: {
  organization: Organization | null;
  membershipsByUserId?: Record<string, OrganizationMembership | null>;
  requestingUserIsPlatformAdmin?: boolean;
}) {
  const membershipsByUserId = options.membershipsByUserId ?? {};

  const organizationRepository: OrganizationRepository = {
    createWithOwner: vi.fn(),
    save: vi.fn(),
    findById: vi.fn(async () => options.organization),
    findByDomain: vi.fn(),
    findByInviteCode: vi.fn(),
    findAll: vi.fn(),
    findAllByUserId: vi.fn(),
    saveMembership: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(async (_organizationId: string, userId: string) =>
      membershipsByUserId[userId] ?? null,
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

  const requesterAdminResolver = new RequesterAdminResolver(userRepository);
  const useCase = new ChangeOrganizationMemberRoleUseCase(
    organizationRepository,
    requesterAdminResolver,
  );

  return { useCase, organizationRepository };
}

describe('ChangeOrganizationMemberRoleUseCase', () => {
  it('CA-F2: un ADMIN de la organización que intenta cambiar su propio rol recibe 403, incluso antes de resolver la organización', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      membershipsByUserId: { 'admin-1': membership('admin-1', 'ADMIN') },
    });

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'admin-1',
        requestingUserId: 'admin-1',
        orgRole: 'TEACHER',
      }),
    ).rejects.toThrow(CannotChangeOwnOrganizationRoleError);
    expect(organizationRepository.saveMembership).not.toHaveBeenCalled();
  });

  it('caso positivo: un ADMIN de la organización cambia el rol de otro miembro exitosamente', async () => {
    const targetMembership = membership('user-2', 'STUDENT');
    const { useCase, organizationRepository } = setup({
      organization: org(),
      membershipsByUserId: {
        'admin-1': membership('admin-1', 'ADMIN'),
        'user-2': targetMembership,
      },
    });

    const dto = await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-2',
      requestingUserId: 'admin-1',
      orgRole: 'TEACHER',
    });

    expect(targetMembership.changeRole).toHaveBeenCalledWith(OrganizationRole.create('TEACHER'));
    expect(organizationRepository.saveMembership).toHaveBeenCalledWith(targetMembership);
    expect(dto.userId).toBe('user-2');
  });

  it('un ADMIN global de plataforma puede cambiar el rol de un miembro sin membresía propia', async () => {
    const targetMembership = membership('user-2', 'STUDENT');
    const { useCase, organizationRepository } = setup({
      organization: org(),
      membershipsByUserId: { 'user-2': targetMembership },
      requestingUserIsPlatformAdmin: true,
    });

    await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-2',
      requestingUserId: 'platform-admin',
      orgRole: 'ADMIN',
    });

    expect(organizationRepository.saveMembership).toHaveBeenCalledWith(targetMembership);
  });

  it('un TEACHER/STUDENT de la organización (sin ADMIN) recibe 403', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      membershipsByUserId: {
        'requester-1': membership('requester-1', 'TEACHER'),
        'user-2': membership('user-2', 'STUDENT'),
      },
    });

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'user-2',
        requestingUserId: 'requester-1',
        orgRole: 'ADMIN',
      }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(organizationRepository.saveMembership).not.toHaveBeenCalled();
  });

  it('lanza OrganizationNotFoundError si la organización no existe', async () => {
    const { useCase } = setup({ organization: null });

    await expect(
      useCase.execute({
        organizationId: 'missing',
        userId: 'user-2',
        requestingUserId: 'admin-1',
        orgRole: 'ADMIN',
      }),
    ).rejects.toThrow(OrganizationNotFoundError);
  });

  it('lanza TargetUserNotMemberOfOrganizationError si el usuario objetivo no es miembro', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      membershipsByUserId: { 'admin-1': membership('admin-1', 'ADMIN') },
    });

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        userId: 'non-member',
        requestingUserId: 'admin-1',
        orgRole: 'ADMIN',
      }),
    ).rejects.toThrow(TargetUserNotMemberOfOrganizationError);
    expect(organizationRepository.saveMembership).not.toHaveBeenCalled();
  });
});
