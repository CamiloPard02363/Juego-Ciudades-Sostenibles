import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { GameRepository } from '../../domain/ports/game.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { AnalyticsTrackerService } from '../../application/services/analytics-tracker.service.js';
import { RoomsGateway } from './rooms.gateway.js';
import { InMemoryRoomStore } from './in-memory-room.store.js';
import { InMemoryTournamentStore } from './in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from './in-memory-domino-room.store.js';
import { InMemorySnakesLaddersRoomStore } from './in-memory-snakes-ladders-room.store.js';
import { InMemoryDualQuestRoomStore } from './in-memory-dual-quest-room.store.js';

type Client = Parameters<RoomsGateway['handleCreate']>[0];
function client(id: string): Client {
  return {
    id,
    data: { userId: id, displayName: id },
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as Client;
}

/**
 * `handleResolveCode` (usado por el botón agnóstico "Unirme con código" del
 * home, y por el campo de código de cada juego) tenía 5 chequeos
 * hand-escritos, uno por store — ahora es un solo loop sobre
 * `roomRegistry`. Este spec confirma que sigue reconociendo los 5 tipos de
 * sala existentes (room, tournament, domino, snakes-ladders, dual-quest) y
 * que un código inexistente sigue rechazándose igual que antes.
 */
describe('RoomsGateway room code registry', () => {
  function buildGateway() {
    const stores = {
      room: new InMemoryRoomStore(),
      tournament: new InMemoryTournamentStore(),
      domino: new InMemoryDominoRoomStore(),
      snakes: new InMemorySnakesLaddersRoomStore(),
      dual: new InMemoryDualQuestRoomStore(),
    };
    const gameByType: Record<string, unknown> = {
      GUESS_WHO: {
        id: 'game-guess-who',
        title: 'Quién Es Demo',
        gameType: { getName: () => 'GUESS_WHO' },
        config: {},
        content: Array.from({ length: 6 }, (_, i) => ({
          cardId: `c${i}`,
          label: `C${i}`,
          imageUrl: '',
          audioUrl: null,
        })),
      },
      DOMINO: {
        id: 'game-domino',
        title: 'Dominó Demo',
        gameType: { getName: () => 'DOMINO' },
        config: {},
        content: [],
      },
      SNAKES_LADDERS: {
        id: 'game-snakes',
        title: 'Escaleras Demo',
        gameType: { getName: () => 'SNAKES_LADDERS' },
        config: { boardSize: 30, ladders: [], snakes: [] },
        content: [],
      },
      DUAL_QUEST: {
        id: 'game-dual-quest',
        title: 'Dúo Lógico Demo',
        gameType: { getName: () => 'DUAL_QUEST' },
        config: {
          gridCols: 3,
          gridRows: 3,
          grid: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          fireStart: { row: 0, col: 0 },
          waterStart: { row: 0, col: 1 },
          corePosition: { row: 2, col: 2 },
          gates: [],
          triggers: [],
          coreQuestion: 'Pregunta',
        },
        content: [],
      },
    };

    const gameRepository = {
      findById: vi.fn((id: string) => {
        const game = Object.values(gameByType).find((g) => (g as { id: string }).id === id);
        return Promise.resolve(game ?? null);
      }),
    } as unknown as GameRepository;

    const gateway = new RoomsGateway(
      new JwtService(),
      gameRepository,
      {} as UserRepository,
      stores.room,
      stores.tournament,
      stores.domino,
      stores.snakes,
      stores.dual,
      { track: vi.fn().mockResolvedValue(undefined) } as unknown as AnalyticsTrackerService,
    );
    gateway.server = { to: () => ({ emit: vi.fn() }) } as never;

    return { gateway, gameByType };
  }

  it('resuelve una sala 1v1 de "¿Quién Es?" con kind "room"', async () => {
    const { gateway, gameByType } = buildGateway();
    const socket = client('u1');
    await gateway.handleCreate(socket, { gameId: (gameByType.GUESS_WHO as { id: string }).id });
    const code = (socket.emit as ReturnType<typeof vi.fn>).mock.calls[0][1].code as string;

    const resolved = gateway.handleResolveCode({ code });

    expect(resolved).toEqual({ kind: 'room', gameId: 'game-guess-who', gameTitle: 'Quién Es Demo' });
  });

  it('resuelve una sala de Dominó con kind "domino"', async () => {
    const { gateway, gameByType } = buildGateway();
    const socket = client('u1');
    await gateway.handleDominoCreate(socket, { gameId: (gameByType.DOMINO as { id: string }).id });
    const code = (socket.emit as ReturnType<typeof vi.fn>).mock.calls[0][1].code as string;

    const resolved = gateway.handleResolveCode({ code });

    expect(resolved).toEqual({ kind: 'domino', gameId: 'game-domino', gameTitle: 'Dominó Demo' });
  });

  it('resuelve una sala de Escaleras y Serpientes con kind "snakes-ladders"', async () => {
    const { gateway, gameByType } = buildGateway();
    const socket = client('u1');
    await gateway.handleSnakesLaddersCreate(socket, {
      gameId: (gameByType.SNAKES_LADDERS as { id: string }).id,
    });
    const code = (socket.emit as ReturnType<typeof vi.fn>).mock.calls[0][1].code as string;

    const resolved = gateway.handleResolveCode({ code });

    expect(resolved).toEqual({ kind: 'snakes-ladders', gameId: 'game-snakes', gameTitle: 'Escaleras Demo' });
  });

  it('resuelve una sala de Dúo Lógico con kind "dual-quest"', async () => {
    const { gateway, gameByType } = buildGateway();
    const socket = client('u1');
    await gateway.handleDualQuestCreate(socket, { gameId: (gameByType.DUAL_QUEST as { id: string }).id });
    const code = (socket.emit as ReturnType<typeof vi.fn>).mock.calls[0][1].code as string;

    const resolved = gateway.handleResolveCode({ code });

    expect(resolved).toEqual({ kind: 'dual-quest', gameId: 'game-dual-quest', gameTitle: 'Dúo Lógico Demo' });
  });

  it('resuelve un torneo con kind "tournament"', async () => {
    const { gateway, gameByType } = buildGateway();
    const socket = client('u1');
    await gateway.handleTournamentCreate(socket, {
      gameId: (gameByType.GUESS_WHO as { id: string }).id,
      maxParticipants: 4,
    });
    const code = (socket.emit as ReturnType<typeof vi.fn>).mock.calls[0][1].code as string;

    const resolved = gateway.handleResolveCode({ code });

    expect(resolved).toEqual({ kind: 'tournament', gameId: 'game-guess-who', gameTitle: 'Quién Es Demo' });
  });

  it('rechaza un código que no existe en ninguna sala', () => {
    const { gateway } = buildGateway();

    expect(() => gateway.handleResolveCode({ code: 'ZZZZZZ' })).toThrow(
      'No existe ninguna sala con ese código.',
    );
  });

  it('rechaza un código vacío', () => {
    const { gateway } = buildGateway();

    expect(() => gateway.handleResolveCode({ code: '' })).toThrow('Ingresa un código.');
  });
});
