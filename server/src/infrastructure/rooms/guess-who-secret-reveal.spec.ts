import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { RoomState } from '../../domain/ports/room-store.port.js';
import { toClientView } from './rooms.gateway.js';

function room(phase: RoomState['phase']): RoomState {
  return {
    code: 'ABC123',
    gameId: 'g',
    gameTitle: 'Banderas',
    cards: [],
    hostUserId: 'ana',
    maxAccusationCount: 6,
    turnDurationSeconds: 15,
    phase,
    players: [
      { socketId: 's-ana', userId: 'ana', displayName: 'Ana', secretCardId: 'card-ana', discardedCardIds: [] },
      { socketId: 's-beto', userId: 'beto', displayName: 'Beto', secretCardId: 'card-beto', discardedCardIds: [] },
    ],
    winnerUserId: phase === 'FINISHED' ? 'ana' : null,
    createdAt: 0,
    rematchVotes: {},
  } as unknown as RoomState;
}

const secretOf = (view: ReturnType<typeof toClientView>, userId: string) =>
  view.players.find((player) => player.userId === userId)?.secretCardId;

describe('¿Quién Es? — tarjeta secreta en la vista de cada jugador', () => {
  it('durante la partida, cada jugador ve SOLO su propia tarjeta', () => {
    const view = toClientView(room('PLAYING'), 's-ana');
    expect(secretOf(view, 'ana')).toBe('card-ana');
    expect(secretOf(view, 'beto')).toBeNull();
  });

  it('en la sala de espera tampoco viaja la del rival', () => {
    expect(secretOf(toClientView(room('WAITING'), 's-beto'), 'ana')).toBeNull();
  });

  it('al terminar, se revela la del rival para mostrar "Tarjeta de …"', () => {
    const view = toClientView(room('FINISHED'), 's-ana');
    expect(secretOf(view, 'ana')).toBe('card-ana');
    expect(secretOf(view, 'beto')).toBe('card-beto');
  });
});
