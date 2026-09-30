import { describe, expect, it, vi } from 'vitest';
import type { AiProviderAttemptRepository } from '../../domain/ports/ai-provider-attempt.repository.port.js';
import { AiProviderAttempt } from '../../domain/entities/ai-provider-attempt.entity.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import type { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { ListAiProviderAttemptsUseCase } from './list-ai-provider-attempts.use-case.js';

function fakeResolver(isAdmin: boolean): RequesterAdminResolver {
  return { resolve: vi.fn().mockResolvedValue(isAdmin) } as unknown as RequesterAdminResolver;
}

describe('ListAiProviderAttemptsUseCase', () => {
  it('rechaza a un requester que no es ADMIN', async () => {
    const repository: AiProviderAttemptRepository = {
      save: vi.fn(),
      findRecent: vi.fn(),
    };
    const useCase = new ListAiProviderAttemptsUseCase(repository, fakeResolver(false));

    await expect(useCase.execute({ requestingUserId: 'user-1' })).rejects.toBeInstanceOf(ForbiddenActionError);
    expect(repository.findRecent).not.toHaveBeenCalled();
  });

  it('delega en el repositorio con la paginación por defecto y mapea a DTO', async () => {
    const attempt = AiProviderAttempt.create({
      provider: 'groq',
      operation: 'generateGameDraft',
      succeeded: true,
      usedFallback: true,
      errorMessage: null,
      latencyMs: 120,
    });
    const repository: AiProviderAttemptRepository = {
      save: vi.fn(),
      findRecent: vi.fn().mockResolvedValue({ items: [attempt], total: 1 }),
    };
    const useCase = new ListAiProviderAttemptsUseCase(repository, fakeResolver(true));

    const result = await useCase.execute({ requestingUserId: 'admin-1' });

    expect(repository.findRecent).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(result).toEqual({
      items: [
        {
          id: attempt.id,
          provider: 'groq',
          operation: 'generateGameDraft',
          succeeded: true,
          usedFallback: true,
          errorMessage: null,
          latencyMs: 120,
          createdAt: attempt.createdAt.toISOString(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('respeta page/pageSize explícitos', async () => {
    const repository: AiProviderAttemptRepository = {
      save: vi.fn(),
      findRecent: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    const useCase = new ListAiProviderAttemptsUseCase(repository, fakeResolver(true));

    await useCase.execute({ requestingUserId: 'admin-1', page: 3, pageSize: 5 });

    expect(repository.findRecent).toHaveBeenCalledWith({ page: 3, pageSize: 5 });
  });
});
