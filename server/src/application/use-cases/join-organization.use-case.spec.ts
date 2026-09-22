import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { OrganizationRepository } from '../../domain/ports/organization.repository.port.js';
import type { OrganizationMembership } from '../../domain/entities/organization-membership.entity.js';
import { Organization } from '../../domain/entities/organization.entity.js';
import { OrganizationNotFoundByInviteCodeError } from '../errors/application.errors.js';
import { JoinOrganizationUseCase } from './join-organization.use-case.js';

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
  organization: Organization | null;
  existingMembership?: OrganizationMembership | null;
}) {
  const organizationRepository: OrganizationRepository = {
    createWithOwner: vi.fn(),
    save: vi.fn(),
    findById: vi.fn(),
    findByDomain: vi.fn(),
    findByInviteCode: vi.fn(async () => options.organization),
    findAll: vi.fn(),
    findAllByUserId: vi.fn(),
    saveMembership: vi.fn(),
    createMembership: vi.fn(),
    findMembership: vi.fn(async () => options.existingMembership ?? null),
    findMembershipsByOrganizationId: vi.fn(),
    findMembershipsByUserId: vi.fn(),
    removeMembership: vi.fn(),
  };

  const useCase = new JoinOrganizationUseCase(organizationRepository);

  return { useCase, organizationRepository };
}

describe('JoinOrganizationUseCase', () => {
  it('CA-A2: lanza OrganizationNotFoundByInviteCodeError si el código no resuelve ninguna organización', async () => {
    const { useCase } = setup({ organization: null });

    await expect(
      useCase.execute({ inviteCode: 'NOPE12', requestingUserId: 'student-1' }),
    ).rejects.toThrow(OrganizationNotFoundByInviteCodeError);
  });

  it('rechaza si la organización está desactivada (mismo criterio que JoinClassUseCase)', async () => {
    const { useCase, organizationRepository } = setup({ organization: org(false) });

    await expect(
      useCase.execute({ inviteCode: 'ORGABC', requestingUserId: 'student-1' }),
    ).rejects.toThrow(ForbiddenException);
    expect(organizationRepository.createMembership).not.toHaveBeenCalled();
  });

  it('matricula al usuario autenticado como STUDENT vía createMembership', async () => {
    const { useCase, organizationRepository } = setup({ organization: org(true) });

    const dto = await useCase.execute({ inviteCode: 'orgabc', requestingUserId: 'student-1' });

    expect(organizationRepository.createMembership).toHaveBeenCalled();
    expect(dto.myOrgRole).toBe('STUDENT');
    expect(dto.id).toBe('org-1');
  });

  it('idempotente: si ya es miembro, no falla y devuelve la organización con el rol actual', async () => {
    const existingMembership = {
      organizationId: 'org-1',
      userId: 'student-1',
      orgRole: { getName: () => 'TEACHER' },
      joinedAt: new Date(),
      isAdmin: () => false,
    } as unknown as OrganizationMembership;

    const { useCase, organizationRepository } = setup({
      organization: org(true),
      existingMembership,
    });

    const dto = await useCase.execute({ inviteCode: 'ORGABC', requestingUserId: 'student-1' });

    expect(organizationRepository.createMembership).not.toHaveBeenCalled();
    expect(dto.myOrgRole).toBe('TEACHER');
  });
});
