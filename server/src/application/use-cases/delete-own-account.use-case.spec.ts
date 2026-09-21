import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token.repository.port.js';
import { InvalidCredentialsError, UserNotFoundError } from '../errors/application.errors.js';
import { DeleteOwnAccountUseCase } from './delete-own-account.use-case.js';

function setup(options: { userExists: boolean; passwordMatches: boolean }) {
  const user = { id: 'u1', password: { getHashedValue: () => 'hash' } };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => (options.userExists ? (user as never) : null)),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const passwordHasher: PasswordHasher = {
    hash: vi.fn(),
    compare: vi.fn(async () => options.passwordMatches),
  };

  const refreshTokenRepository: RefreshTokenRepository = {
    save: vi.fn(),
    findByTokenHash: vi.fn(),
    revokeAllForUser: vi.fn(),
  };

  const useCase = new DeleteOwnAccountUseCase(userRepository, passwordHasher, refreshTokenRepository);

  return { useCase, userRepository, passwordHasher, refreshTokenRepository };
}

describe('DeleteOwnAccountUseCase', () => {
  it('lanza UserNotFoundError si el usuario no existe', async () => {
    const { useCase } = setup({ userExists: false, passwordMatches: false });

    await expect(
      useCase.execute({ userId: 'missing', currentPlainPassword: 'whatever' }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('lanza InvalidCredentialsError si la contraseña no coincide, sin borrar nada', async () => {
    const { useCase, userRepository, refreshTokenRepository } = setup({
      userExists: true,
      passwordMatches: false,
    });

    await expect(
      useCase.execute({ userId: 'u1', currentPlainPassword: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(userRepository.delete).not.toHaveBeenCalled();
    expect(refreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('revoca las sesiones y borra la cuenta cuando la contraseña coincide', async () => {
    const { useCase, userRepository, refreshTokenRepository } = setup({
      userExists: true,
      passwordMatches: true,
    });

    await useCase.execute({ userId: 'u1', currentPlainPassword: 'correct' });

    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('u1');
    expect(userRepository.delete).toHaveBeenCalledWith('u1');
  });
});
