import { describe, expect, it, vi } from 'vitest';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Organization } from '../../domain/entities/organization.entity.js';
import { OrganizationRole } from '../../domain/value-objects/organization-role.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { OrganizationNotFoundError } from '../errors/application.errors.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { RemoveOrganizationMemberUseCase } from './remove-organization-member.use-case.js';

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

function membership(orgRoleName: 'STUDENT' | 'TEACHER' | 'ADMIN', organizationId = 'org-1') {
  return {
    organizationId,
    userId: 'requester-1',
    orgRole: OrganizationRole.create(orgRoleName),
    joinedAt: new Date(),
    isAdmin: () => orgRoleName === 'ADMIN',
  } as OrganizationMembership;
}

function setup(options: {
  organization: Organization | null;
  requestingMembership?: OrganizationMembership | null;
  requestingUserIsPlatformAdmin?: boolean;
}) {
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
    findMembership: vi.fn(async (organizationId: string) =>
      options.requestingMembership?.organizationId === organizationId
        ? options.requestingMembership
        : null,
    ),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => ({ isAdmin: () => options.requestingUserIsPlatformAdmin ?? false }) as never),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const requesterAdminResolver = new RequesterAdminResolver(userRepository);
  const useCase = new RemoveOrganizationMemberUseCase(organizationRepository, requesterAdminResolver);

  return { useCase, organizationRepository };
}

describe('RemoveOrganizationMemberUseCase', () => {
  it('lanza OrganizationNotFoundError si la organización no existe', async () => {
    const { useCase } = setup({ organization: null });

    await expect(
      useCase.execute({ organizationId: 'missing', userId: 'u1', requestingUserId: 'admin-1' }),
    ).rejects.toThrow(OrganizationNotFoundError);
  });

  it('un OrganizationRole.ADMIN de esa organización puede remover un miembro (CA3.1)', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      requestingMembership: membership('ADMIN'),
    });

    await useCase.execute({ organizationId: 'org-1', userId: 'u1', requestingUserId: 'requester-1' });

    expect(organizationRepository.removeMembership).toHaveBeenCalledWith('org-1', 'u1');
  });

  it('un ADMIN global de plataforma puede remover un miembro aunque no tenga membresía propia', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      requestingMembership: null,
      requestingUserIsPlatformAdmin: true,
    });

    await useCase.execute({ organizationId: 'org-1', userId: 'u1', requestingUserId: 'platform-admin' });

    expect(organizationRepository.removeMembership).toHaveBeenCalledWith('org-1', 'u1');
  });

  it('un OrganizationRole.ADMIN de OTRA organización recibe 403 (no escala a esta organización)', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org('org-1'),
      requestingMembership: membership('ADMIN', 'org-2'),
    });

    await expect(
      useCase.execute({ organizationId: 'org-1', userId: 'u1', requestingUserId: 'requester-1' }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(organizationRepository.removeMembership).not.toHaveBeenCalled();
  });

  it('un TEACHER/STUDENT de la organización (sin ADMIN) recibe 403', async () => {
    const { useCase, organizationRepository } = setup({
      organization: org(),
      requestingMembership: membership('TEACHER'),
    });

    await expect(
      useCase.execute({ organizationId: 'org-1', userId: 'u1', requestingUserId: 'requester-1' }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(organizationRepository.removeMembership).not.toHaveBeenCalled();
  });
});
