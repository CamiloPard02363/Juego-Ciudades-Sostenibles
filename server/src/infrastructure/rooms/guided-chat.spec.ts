import 'reflect-metadata';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'socket.io';
import type { GameRepository } from '../../domain/ports/game.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { AnalyticsTrackerService } from '../../application/services/analytics-tracker.service.js';
import { questionsFor } from '../../domain/services/guided-questions.js';
import { RoomsGateway } from './rooms.gateway.js';
import { InMemoryRoomStore } from './in-memory-room.store.js';
import { InMemoryTournamentStore } from './in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from './in-memory-domino-room.store.js';
import { InMemorySnakesLaddersRoomStore } from './in-memory-snakes-ladders-room.store.js';
import { InMemoryDualQuestRoomStore } from './in-memory-dual-quest-room.store.js';

type Client = Parameters<RoomsGateway['handleQuestion']>[0];
const client = (id: string) => ({ id, data: { userId: id, displayName: id }, join: vi.fn(), leave: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }) as unknown as Client;
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
function setup() {
  const rooms = new InMemoryRoomStore(), tournaments = new InMemoryTournamentStore();
  const game = { id: 'test', title: 'Test', gameType: { getName: () => 'GUESS_WHO' }, config: { turnDurationSeconds: 30 }, content: Array.from({ length: 6 }, (_, i) => ({ cardId: String(i), label: `Tarjeta ${i}`, imageUrl: '', audioUrl: null, info: null })) };
  const gateway = new RoomsGateway(new JwtService(), { findById: async () => game } as unknown as GameRepository, {} as UserRepository, rooms, tournaments, new InMemoryDominoRoomStore(), new InMemorySnakesLaddersRoomStore(), new InMemoryDualQuestRoomStore(), { track: async () => {} } as unknown as AnalyticsTrackerService);
  const events: { target: string; payload: unknown }[] = [];
  gateway.server = { to: (target: string) => ({ emit: (_event: string, payload: unknown) => events.push({ target, payload: structuredClone(payload) }) }) } as unknown as Server;
  return { gateway, rooms, tournaments, events };
}

it('aísla preguntas, respuestas y mensajes entre dos enfrentamientos del torneo', async () => {
  const { gateway, tournaments, events } = setup();
  const clients = ['a', 'b', 'c', 'd'].map(client);
  await gateway.handleTournamentCreate(clients[0], { gameId: 'test', maxParticipants: 4 });
  const tournament = tournaments.findBySocketId('a')!;
  for (const c of clients.slice(1)) gateway.handleTournamentJoin(c, { code: tournament.code });
  for (const c of clients) gateway.handleTournamentReady(c, { ready: true });
  const match = tournament.matches[0], other = tournament.matches[1];
  const asker = clients.find(c => c.data.userId === match.activePlayerUserId)!;
  const responder = clients.find(c => match.playerUserIds.includes(c.data.userId) && c !== asker)!;
  const outsider = clients.find(c => other.playerUserIds.includes(c.data.userId))!;
  events.length = 0;
  gateway.handleMatchQuestion(asker, { questionId: questionsFor(match, asker.data.userId).at(-1)!.id });
  const q = match.pendingQuestion!;
  expect(events.every(e => match.playerUserIds.includes(e.target))).toBe(true);
  expect(() => gateway.handleMatchAnswer(outsider, { requestId: q.requestId, answer: true })).toThrow();
  expect(other.players.every(p => p.discardedCardIds.length === 0)).toBe(true);
  const answer = q.cardIds.includes(match.players.find(p => p.userId === responder.data.userId)!.secretCardId!);
  gateway.handleMatchAnswer(responder, { requestId: q.requestId, answer });
  expect(match.players.find(p => p.userId === asker.data.userId)!.discardedCardIds).toHaveLength(3);
  expect(events.every(e => match.playerUserIds.includes(e.target))).toBe(true);
  events.length = 0;
  gateway.handleMatchChat(asker, { text: 'Solo mi rival' });
  expect(events).toHaveLength(2);
  expect(events.every(e => match.playerUserIds.includes(e.target))).toBe(true);
  for (const e of events) {
    const view = e.payload as { players: { userId: string; secretCardId: string | null }[] };
    expect(view.players.find(p => p.userId !== e.target)?.secretCardId).toBeNull();
  }
});

it('invalida una pregunta al pasar turno y limpia el chat al repartir revancha', async () => {
  const { gateway, rooms } = setup(), a = client('a'), b = client('b');
  await gateway.handleCreate(a, { gameId: 'test' });
  const room = rooms.findBySocketId('a')!;
  gateway.handleJoin(b, { code: room.code });
  gateway.handleReady(a, { ready: true }); gateway.handleReady(b, { ready: true }); vi.advanceTimersByTime(3000);
  const asker = room.activePlayerUserId === 'a' ? a : b, rival = asker === a ? b : a;
  gateway.handleQuestion(asker, { questionId: questionsFor(room, asker.data.userId).at(-1)!.id });
  const id = room.pendingQuestion!.requestId;
  gateway.handlePassTurn(asker); gateway.handlePassTurn(rival);
  expect(room.pendingQuestion).toBeNull();
  expect(() => gateway.handleAnswer(rival, { requestId: id, answer: true })).toThrow();
  gateway.handleChat(asker, { text: 'hola' });
  expect(room.guidedChat!.length).toBeGreaterThan(0);
  room.phase = 'FINISHED';
  gateway.handleRematchVote(a, { accept: true }); gateway.handleRematchVote(b, { accept: true }); vi.advanceTimersByTime(3000);
  expect(room.guidedChat).toEqual([]); expect(room.pendingQuestion).toBeNull();
});
