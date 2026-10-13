import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'socket.io';
import type { GameRepository } from '../../domain/ports/game.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { AnalyticsTrackerService } from '../../application/services/analytics-tracker.service.js';
import type { DominoRoomState } from '../../domain/ports/domino-room-store.port.js';
import { RoomsGateway } from './rooms.gateway.js';
import { InMemoryRoomStore } from './in-memory-room.store.js';
import { InMemoryTournamentStore } from './in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from './in-memory-domino-room.store.js';
import { InMemorySnakesLaddersRoomStore } from './in-memory-snakes-ladders-room.store.js';
import { InMemoryDualQuestRoomStore } from './in-memory-dual-quest-room.store.js';

type Client = Parameters<RoomsGateway['handleDominoPlay']>[0];

function client(id: string, userId = id): Client {
  return {
    id,
    data: { userId, displayName: userId },
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as Client;
}

function makeRoom(): DominoRoomState {
  return {
    code: 'DOMINO',
    gameId: 'game',
    gameTitle: 'Dominexo',
    concepts: [],
    handSize: 2,
    hostUserId: 'p1',
    turnDurationSeconds: 20,
    phase: 'PLAYING',
    players: [
      { socketId: 's1', userId: 'p1', displayName: 'P1', hand: [{ id: 'opening', a: 0, b: 1 }, { id: 'left', a: 2, b: 0 }] },
      { socketId: 's2', userId: 'p2', displayName: 'P2', hand: [{ id: 'right', a: 1, b: 3 }, { id: 'extra', a: 4, b: 5 }] },
    ],
    boneyard: [],
    board: [],
    openingTileId: null,
    activePlayerUserId: 'p1',
    turnDeadline: null,
    winnerUserId: null,
    endedByBlock: false,
    createdAt: Date.now(),
    rematchVotes: {},
    consecutivePasses: 0,
  };
}

function setup() {
  const domino = new InMemoryDominoRoomStore();
  const gateway = new RoomsGateway(
    new JwtService(),
    {} as GameRepository,
    {} as UserRepository,
    new InMemoryRoomStore(),
    new InMemoryTournamentStore(),
    domino,
    new InMemorySnakesLaddersRoomStore(),
    new InMemoryDualQuestRoomStore(),
    { track: vi.fn().mockResolvedValue(undefined) } as unknown as AnalyticsTrackerService,
  );
  const events: Array<{ target: string; event: string; payload: unknown }> = [];
  gateway.server = {
    to: (target: string) => ({ emit: (event: string, payload: unknown) => events.push({ target, event, payload: structuredClone(payload) }) }),
  } as unknown as Server;
  const room = makeRoom();
  domino.create(room);
  return { gateway, domino, room, events, p1: client('s1'), p2: client('s2') };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('openingTileId de Dominexo', () => {
  it('se registra solo en la primera jugada, se sincroniza y se reinicia en una partida nueva', () => {
    const h = setup();
    expect(h.room.openingTileId).toBeNull();

    h.gateway.handleDominoPlay(h.p1, { tileId: 'opening', side: 'right' });
    expect(h.room.openingTileId).toBe('opening');
    const openingStates = h.events.filter((event) => event.event === 'domino:state').slice(-2);
    expect(openingStates.map((event) => (event.payload as { openingTileId: string | null }).openingTileId)).toEqual(['opening', 'opening']);

    h.room.activePlayerUserId = 'p2';
    h.gateway.handleDominoPlay(h.p2, { tileId: 'right', side: 'right' });
    expect(h.room.openingTileId).toBe('opening');

    h.room.activePlayerUserId = 'p1';
    h.gateway.handleDominoPlay(h.p1, { tileId: 'left', side: 'left' });
    expect(h.room.openingTileId).toBe('opening');

    const reconnected = client('s1-reconnected', 'p1');
    h.gateway.handleDominoJoin(reconnected, { code: h.room.code });
    expect(h.domino.findBySocketId('s1-reconnected')?.openingTileId).toBe('opening');
    expect(h.events.at(-1)?.payload).toMatchObject({ openingTileId: 'opening' });

    (h.gateway as unknown as { dealNewDominoGame: (room: DominoRoomState) => void }).dealNewDominoGame(h.room);
    expect(h.room.openingTileId).toBeNull();
  });

  it('no inventa un origen para una sala antigua que no tenía el metadato', () => {
    const h = setup();
    h.room.board = [{ id: 'legacy-opening', left: 0, right: 1, isDouble: false, placedByUserId: 'p1' }];
    delete h.room.openingTileId;
    h.room.players[0].hand = [{ id: 'legacy-next', a: 1, b: 2 }, { id: 'extra', a: 4, b: 5 }];

    h.gateway.handleDominoPlay(h.p1, { tileId: 'legacy-next', side: 'right' });

    expect(h.room.openingTileId).toBeUndefined();
    const state = h.events.at(-1)?.payload as { openingTileId: string | null };
    expect(state.openingTileId).toBeNull();
  });
});
