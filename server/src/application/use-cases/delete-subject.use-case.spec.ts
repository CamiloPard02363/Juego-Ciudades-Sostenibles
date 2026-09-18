import { describe, expect, it, vi } from 'vitest';
import type { SubjectRepository } from '../../domain/ports/subject.repository.port.js';
import type { GameRepository, PaginatedGames } from '../../domain/ports/game.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { SubjectHasGamesError } from '../../domain/errors/subject.errors.js';
import { Subject } from '../../domain/entities/subject.entity.js';
import { SubjectNotFoundError } from '../errors/application.errors.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import { DeleteSubjectUseCase } from './delete-subject.use-case.js';

function createRoot(id = 'root-1'): Subject {
  return Subject.create({ id, name: 'Matemáticas', slug: `root-${id}`, creatorUserId: 'admin-1' });
}

function createSub(id: string, parentSubjectId: string, creatorUserId: string): Subject {
  return Subject.create({ id, name: `Sub ${id}`, slug: `sub-${id}`, parentSubjectId, creatorUserId });
}

function emptyPage(total: number): PaginatedGames {
  return { items: [], total, page: 1, pageSize: 1 };
}

interface Setup {
  useCase: DeleteSubjectUseCase;
  subjectRepository: SubjectRepository;
  gameRepository: GameRepository;
  userRepository: UserRepository;
}

function setup(options: {
  subjects: Map<string, Subject>;
  childrenByParentId: Map<string, Subject[]>;
  gamesCountByCategoryId: Map<string, number>;
  isAdmin: boolean;
}): Setup {
  const subjectRepository: SubjectRepository = {
    save: vi.fn(),
    findById: vi.fn(async (id: string) => options.subjects.get(id) ?? null),
    findBySlug: vi.fn(),
    existsBySlug: vi.fn(),
    findVisibleTo: vi.fn(),
    findByParentId: vi.fn(async (parentId: string) => options.childrenByParentId.get(parentId) ?? []),
    softDelete: vi.fn(),
  };

  const gameRepository: GameRepository = {
    save: vi.fn(),
    bulkInsert: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    findBySlug: vi.fn(),
    existsBySlug: vi.fn(),
    findAll: vi.fn(async ({ categoryId }) =>
      emptyPage(options.gamesCountByCategoryId.get(categoryId ?? '') ?? 0),
    ),
    delete: vi.fn(),
    countPublishedByCategory: vi.fn(),
    publishAllDraftsByCategory: vi.fn(),
  };

  const userRepository: UserRepository = {
    save: vi.fn(),
    findById: vi.fn(async () => ({ isAdmin: () => options.isAdmin }) as never),
    findByIds: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
  };

  const requesterAdminResolver = new RequesterAdminResolver(userRepository);
  const useCase = new DeleteSubjectUseCase(subjectRepository, gameRepository, requesterAdminResolver);

  return { useCase, subjectRepository, gameRepository, userRepository };
}

describe('DeleteSubjectUseCase', () => {
  it('lanza SubjectNotFoundError si la materia no existe', async () => {
    const { useCase } = setup({
      subjects: new Map(),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: false,
    });

    await expect(useCase.execute({ subjectId: 'missing', requestingUserId: 'u1' })).rejects.toThrow(
      SubjectNotFoundError,
    );
  });

  it('sub-materia PRIVATE sin juegos, borrada por su creador: soft-delete exitoso', async () => {
    const sub = createSub('sub-1', 'root-1', 'owner-1');
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['sub-1', sub]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: false,
    });

    await useCase.execute({ subjectId: 'sub-1', requestingUserId: 'owner-1' });

    expect(subjectRepository.softDelete).toHaveBeenCalledWith('sub-1');
  });

  it('sub-materia PRIVATE sin juegos, borrada por un admin que no es el creador: soft-delete exitoso', async () => {
    const sub = createSub('sub-1', 'root-1', 'owner-1');
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['sub-1', sub]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: true,
    });

    await useCase.execute({ subjectId: 'sub-1', requestingUserId: 'admin-2' });

    expect(subjectRepository.softDelete).toHaveBeenCalledWith('sub-1');
  });

  it('sub-materia PUBLIC sin juegos en su árbol, borrada por su creador: soft-delete exitoso', async () => {
    const sub = createSub('sub-1', 'root-1', 'owner-1');
    sub.publish();
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['sub-1', sub]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: false,
    });

    await useCase.execute({ subjectId: 'sub-1', requestingUserId: 'owner-1' });

    expect(subjectRepository.softDelete).toHaveBeenCalledWith('sub-1');
  });

  it('sub-materia PUBLIC con un juego asociado directamente: falla con SubjectHasGamesError', async () => {
    const sub = createSub('sub-1', 'root-1', 'owner-1');
    sub.publish();
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['sub-1', sub]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map([['sub-1', 1]]),
      isAdmin: false,
    });

    await expect(useCase.execute({ subjectId: 'sub-1', requestingUserId: 'owner-1' })).rejects.toThrow(
      SubjectHasGamesError,
    );
    expect(subjectRepository.softDelete).not.toHaveBeenCalled();
  });

  it('sub-materia PUBLIC sin juegos propios pero con una descendiente con juegos: falla con SubjectHasGamesError (recursividad)', async () => {
    const sub = createSub('sub-1', 'root-1', 'owner-1');
    sub.publish();
    const grandchild = createSub('sub-2', 'sub-1', 'owner-1');

    const { useCase, subjectRepository } = setup({
      subjects: new Map([['sub-1', sub]]),
      childrenByParentId: new Map([['sub-1', [grandchild]]]),
      gamesCountByCategoryId: new Map([['sub-2', 1]]),
      isAdmin: false,
    });

    await expect(useCase.execute({ subjectId: 'sub-1', requestingUserId: 'owner-1' })).rejects.toThrow(
      SubjectHasGamesError,
    );
    expect(subjectRepository.softDelete).not.toHaveBeenCalled();
  });

  it('materia raíz sin juegos en todo su árbol, borrada por un ADMIN: soft-delete exitoso (bug resuelto)', async () => {
    const root = createRoot('root-1');
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['root-1', root]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: true,
    });

    await useCase.execute({ subjectId: 'root-1', requestingUserId: 'admin-1' });

    expect(subjectRepository.softDelete).toHaveBeenCalledWith('root-1');
  });

  it('materia raíz sin juegos, borrada por un usuario NO admin: falla con ForbiddenActionError', async () => {
    const root = createRoot('root-1');
    const { useCase, subjectRepository } = setup({
      subjects: new Map([['root-1', root]]),
      childrenByParentId: new Map(),
      gamesCountByCategoryId: new Map(),
      isAdmin: false,
    });

    await expect(useCase.execute({ subjectId: 'root-1', requestingUserId: 'someone' })).rejects.toThrow(
      ForbiddenActionError,
    );
    expect(subjectRepository.softDelete).not.toHaveBeenCalled();
  });

  it('materia raíz con una descendiente con juegos, borrada por ADMIN: falla con SubjectHasGamesError', async () => {
    const root = createRoot('root-1');
    const child = createSub('sub-1', 'root-1', 'owner-1');

    const { useCase, subjectRepository } = setup({
      subjects: new Map([['root-1', root]]),
      childrenByParentId: new Map([['root-1', [child]]]),
      gamesCountByCategoryId: new Map([['sub-1', 1]]),
      isAdmin: true,
    });

    await expect(useCase.execute({ subjectId: 'root-1', requestingUserId: 'admin-1' })).rejects.toThrow(
      SubjectHasGamesError,
    );
    expect(subjectRepository.softDelete).not.toHaveBeenCalled();
  });
});
