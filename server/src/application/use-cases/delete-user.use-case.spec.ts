import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { UserNotFoundError } from '../errors/application.errors.js';
import { DeleteUserUseCase } from './delete-user.use-case.js';

function makeUser(id: string, isAdmin: boolean) {
  return { id, canManageUsers: () => isAdmin };
}

function setup(usersById: Map<string, ReturnType<typeof makeUser>>) {
  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async (id: string) => (usersById.get(id) as never) ?? null),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const refreshTokenRepository: RefreshTokenRepository = {
    save: vi.fn(),
    findByTokenHash: vi.fn(),
    revokeAllForUser: vi.fn(),
  };

  const useCase = new DeleteUserUseCase(userRepository, refreshTokenRepository);

  return { useCase, userRepository, refreshTokenRepository };
}

describe('DeleteUserUseCase', () => {
  it('lanza UserNotFoundError si quien solicita no existe', async () => {
    const { useCase } = setup(new Map());

    await expect(
      useCase.execute({ requestingUserId: 'missing', userId: 'target' }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('lanza ForbiddenActionError si quien solicita no es ADMIN', async () => {
    const { useCase, userRepository } = setup(
      new Map([['teacher-1', makeUser('teacher-1', false)]]),
    );

    await expect(
      useCase.execute({ requestingUserId: 'teacher-1', userId: 'target' }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(userRepository.delete).not.toHaveBeenCalled();
  });

  it('lanza ForbiddenActionError si un ADMIN intenta borrarse a sí mismo por esta vía', async () => {
    const { useCase, userRepository } = setup(new Map([['admin-1', makeUser('admin-1', true)]]));

    await expect(
      useCase.execute({ requestingUserId: 'admin-1', userId: 'admin-1' }),
    ).rejects.toThrow(ForbiddenActionError);
    expect(userRepository.delete).not.toHaveBeenCalled();
  });

  it('lanza UserNotFoundError si la cuenta objetivo no existe', async () => {
    const { useCase } = setup(new Map([['admin-1', makeUser('admin-1', true)]]));

    await expect(
      useCase.execute({ requestingUserId: 'admin-1', userId: 'missing' }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('un ADMIN borra la cuenta de otro usuario y revoca sus sesiones', async () => {
    const { useCase, userRepository, refreshTokenRepository } = setup(
      new Map([
        ['admin-1', makeUser('admin-1', true)],
        ['student-1', makeUser('student-1', false)],
      ]),
    );

    await useCase.execute({ requestingUserId: 'admin-1', userId: 'student-1' });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('student-1');
    expect(userRepository.delete).toHaveBeenCalledWith('student-1');
  });
});
