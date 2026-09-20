import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import type { Server } from 'socket.io';
import type { GameRepository } from '../../domain/ports/game.repository.port.js';
import type { UserRepository } from '../../domain/ports/user.repository.port.js';
import type { AnalyticsTrackerService } from '../../application/services/analytics-tracker.service.js';
import { RoomsGateway } from './rooms.gateway.js';
import { InMemoryRoomStore } from './in-memory-room.store.js';
import { InMemoryTournamentStore } from './in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from './in-memory-domino-room.store.js';
import { InMemorySnakesLaddersRoomStore } from './in-memory-snakes-ladders-room.store.js';
import { InMemoryDualQuestRoomStore } from './in-memory-dual-quest-room.store.js';

type Client = Parameters<RoomsGateway['handleStart']>[0];
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

const modes = [
  {
    name: 'room',
    type: 'GUESS_WHO',
    create: 'handleCreate',
    join: 'handleJoin',
    ready: 'handleReady',
    start: 'handleStart',
    store: 'room',
    delay: true,
  },
  {
    name: 'domino',
    type: 'DOMINO',
    create: 'handleDominoCreate',
    join: 'handleDominoJoin',
    ready: 'handleDominoReady',
    start: 'handleDominoStart',
    store: 'domino',
    delay: true,
  },
  {
    name: 'snakes-ladders',
    type: 'SNAKES_LADDERS',
    create: 'handleSnakesLaddersCreate',
    join: 'handleSnakesLaddersJoin',
    ready: 'handleSnakesLaddersReady',
    start: 'handleSnakesLaddersStart',
    store: 'snakes',
    delay: false,
  },
  {
    name: 'dual-quest',
    type: 'DUAL_QUEST',
    create: 'handleDualQuestCreate',
    join: 'handleDualQuestJoin',
    ready: 'handleDualQuestReady',
    start: 'handleDualQuestStart',
    store: 'dual',
    delay: false,
  },
  {
    name: 'tournament',
    type: 'GUESS_WHO',
    create: 'handleTournamentCreate',
    join: 'handleTournamentJoin',
    ready: 'handleTournamentReady',
    start: 'handleTournamentStart',
    store: 'tournament',
    delay: false,
  },
] as const;
type Mode = (typeof modes)[number];

async function setup(mode: Mode, count = 2) {
  const stores = {
    room: new InMemoryRoomStore(),
    domino: new InMemoryDominoRoomStore(),
    snakes: new InMemorySnakesLaddersRoomStore(),
    dual: new InMemoryDualQuestRoomStore(),
    tournament: new InMemoryTournamentStore(),
  };
  const game = {
    id: 'game',
    title: 'Demo',
    gameType: { getName: () => mode.type },
    config: {
      turnDurationSeconds: 30,
      boardSize: 30,
      ladders: [],
      snakes: [],
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
    content: Array.from({ length: 6 }, (_, i) => ({
      cardId: `c${i}`,
      label: `C${i}`,
      imageUrl: '',
      audioUrl: null,
    })),
  };
  const gateway = new RoomsGateway(
    new JwtService(),
    { findById: vi.fn().mockResolvedValue(game) } as unknown as GameRepository,
    {} as UserRepository,
    stores.room,
    stores.tournament,
    stores.domino,
    stores.snakes,
    stores.dual,
    {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsTrackerService,
  );
  const events: { target: string; event: string; payload: unknown }[] = [];
  gateway.server = {
    to: (target: string) => ({
      emit: (event: string, payload: unknown) => {
        events.push({ target, event, payload: structuredClone(payload) });
      },
    }),
  } as unknown as Server;
  const sockets = Array.from({ length: count }, (_, i) => client(`p${i}`));
  await gateway[mode.create](sockets[0], {
    gameId: 'game',
    maxParticipants: 10,
  });
  const room = stores[mode.store].findBySocketId('p0')!;
  for (const socket of sockets.slice(1))
    gateway[mode.join](socket, { code: room.code });
  const players = () =>
    'participants' in room ? room.participants : room.players;
  const ready = (index: number, value = true) =>
    gateway[mode.ready](sockets[index], { ready: value });
  return { gateway, room, sockets, stores, players, ready, events };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe.each(modes)('$name: consenso en el servidor', (mode) => {
  it('no inicia con uno, publica estados y arranca con la última confirmación', async () => {
    const h = await setup(mode);
    expect(h.players().every((p) => p.ready === false)).toBe(true);
    h.ready(0);
    vi.advanceTimersByTime(3500);
    expect(h.room.phase).toBe('WAITING');
    expect(h.players()[1].ready).toBe(false);
    const states = h.events.filter((e) => e.event === `${mode.name}:state`);
    expect(states.length).toBeGreaterThan(0);
    const view = states.at(-1)!.payload as {
      players?: { ready: boolean }[];
      participants?: { ready: boolean }[];
    };
    expect((view.players ?? view.participants)!.map((p) => p.ready)).toEqual([
      true,
      false,
    ]);
    h.ready(1);
    if (mode.delay) {
      expect(h.room.phase).toBe('WAITING');
      h.ready(1); // Retransmisión: no crea otra cuenta regresiva.
      expect(
        h.events.filter((e) => e.event === `${mode.name}:dealing`),
      ).toHaveLength(1);
      vi.advanceTimersByTime(3000);
    }
    expect(h.room.phase).toBe(
      mode.name === 'tournament' ? 'RUNNING' : 'PLAYING',
    );
    expect(() => h.ready(1)).not.toThrow();
    expect(() => h.ready(0, false)).toThrow();
  });

  it('el antiguo evento Iniciar tampoco omite la confirmación del otro jugador', async () => {
    const h = await setup(mode);
    h.gateway[mode.start](h.sockets[0]);
    vi.advanceTimersByTime(3500);
    expect(h.room.phase).toBe('WAITING');
    expect(h.players().map((p) => p.ready)).toEqual([true, false]);
  });

  it('permite cancelar, rechaza payloads inválidos y no permite confirmar a otros', async () => {
    const h = await setup(mode);
    expect(() =>
      h.gateway[mode.ready](client('intruso'), { ready: true }),
    ).toThrow();
    expect(() =>
      h.gateway[mode.ready](h.sockets[0], {
        ready: 'true' as unknown as boolean,
      }),
    ).toThrow();
    const forged = client('p0');
    forged.data.userId = 'p1';
    expect(() => h.gateway[mode.ready](forged, { ready: true })).toThrow();
    h.ready(0);
    h.ready(0, false);
    h.ready(1);
    vi.advanceTimersByTime(3500);
    expect(h.room.phase).toBe('WAITING');
    expect(h.players().map((p) => p.ready)).toEqual([false, true]);
  });

  it('no inicia en solitario y las entradas nuevas necesitan confirmar', async () => {
    const h = await setup(mode, 1);
    h.ready(0);
    vi.advanceTimersByTime(3500);
    expect(h.room.phase).toBe('WAITING');
    h.gateway[mode.join](client('p1'), { code: h.room.code });
    expect(h.players().map((p) => p.ready)).toEqual([true, false]);
    expect(h.room.phase).toBe('WAITING');
  });

  it('reanudar con otra conexión invalida la confirmación y rechaza al socket anterior', async () => {
    const h = await setup(mode);
    h.ready(0);
    const next = client('new-socket');
    next.data.userId = 'p0';
    h.gateway[mode.join](next, { code: h.room.code });
    expect(h.players()[0].ready).toBe(false);
    expect(() => h.ready(0)).toThrow();
    h.gateway.handleDisconnect(h.sockets[0]); // Socket viejo no elimina la conexión nueva.
    expect(h.players()).toHaveLength(2);
    h.ready(1);
    vi.advanceTimersByTime(3500);
    expect(h.room.phase).toBe('WAITING');
  });

  it('desconectar al anfitrión no deja votos ni privilegios huérfanos', async () => {
    const h = await setup(mode);
    h.ready(0);
    h.gateway.handleDisconnect(h.sockets[0]);
    expect(h.players()).toHaveLength(1);
    expect(
      'creatorUserId' in h.room ? h.room.creatorUserId : h.room.hostUserId,
    ).toBe('p1');
    h.gateway[mode.join](h.sockets[0], { code: h.room.code });
    expect(h.players().every((p) => p.ready === false)).toBe(true);
  });
});

describe.each(modes.filter((m) => m.delay))(
  '$name: cuenta regresiva',
  (mode) => {
    it('cancelar o sustituir a un jugador impide repartir con consentimientos viejos', async () => {
      const h = await setup(mode);
      h.ready(0);
      h.ready(1);
      h.ready(1, false);
      vi.advanceTimersByTime(3000);
      expect(h.room.phase).toBe('WAITING');
      h.ready(1);
      h.gateway.handleDisconnect(h.sockets[1]);
      h.gateway[mode.join](client('p2'), { code: h.room.code });
      vi.advanceTimersByTime(3500);
      expect(h.room.phase).toBe('WAITING');
      expect(h.players().find((p) => p.userId === 'p2')?.ready).toBe(false);
    });
  },
);

describe('salas de varios participantes', () => {
  it('Escaleras espera a los 4; salir el único pendiente inicia con los 3 activos', async () => {
    const h = await setup(modes[2], 4);
    h.ready(0);
    h.ready(1);
    h.ready(2);
    expect(h.room.phase).toBe('WAITING');
    h.gateway.handleDisconnect(h.sockets[3]);
    expect(h.room.phase).toBe('PLAYING');
  });
  it('el torneo exige cantidad par además de unanimidad y reevalúa al salir', async () => {
    const h = await setup(modes[4], 3);
    h.ready(0);
    h.ready(1);
    h.ready(2);
    expect(h.room.phase).toBe('WAITING');
    h.gateway.handleTournamentLeave(h.sockets[2]);
    expect(h.room.phase).toBe('RUNNING');
  });
  it('el torneo de 4 no inicia hasta la cuarta confirmación', async () => {
    const h = await setup(modes[4], 4);
    h.ready(1);
    h.ready(2);
    h.ready(3);
    expect(h.room.phase).toBe('WAITING');
    h.ready(0);
    expect(h.room.phase).toBe('RUNNING');
  });
});

describe.each([modes[0], modes[1], modes[2], modes[4]])(
  '$name: configuración',
  (mode) => {
    it('cambiar el turno exige que todos vuelvan a confirmar', async () => {
      const h = await setup(mode);
      h.ready(0);
      const update =
        mode.name === 'room'
          ? h.gateway.handleUpdateTurnDuration
          : mode.name === 'domino'
            ? h.gateway.handleDominoUpdateTurnDuration
            : mode.name === 'snakes-ladders'
              ? h.gateway.handleSnakesLaddersUpdateTurnDuration
              : h.gateway.handleTournamentUpdateTurnDuration;
      update.call(h.gateway, h.sockets[0], { turnDurationSeconds: 40 });
      expect(h.players().every((p) => p.ready === false)).toBe(true);
      h.ready(1);
      vi.advanceTimersByTime(3500);
      expect(h.room.phase).toBe('WAITING');
    });
  },
);

it('Dúo reinicia en lobby y requiere confirmación de ambos', async () => {
  const h = await setup(modes[3]);
  h.room.phase = 'FINISHED';
  h.gateway.handleDualQuestRestart(h.sockets[0]);
  expect(h.room.phase).toBe('WAITING');
  h.ready(0);
  expect(h.room.phase).toBe('WAITING');
  h.ready(1);
  expect(h.room.phase).toBe('PLAYING');
});

describe.each(modes.slice(0, 3))(
  '$name: conserva la revancha por unanimidad',
  (mode) => {
    it('espera todos los votos antes de reiniciar la partida', async () => {
      const h = await setup(mode);
      h.room.phase = 'FINISHED';
      const vote =
        mode.name === 'room'
          ? h.gateway.handleRematchVote
          : mode.name === 'domino'
            ? h.gateway.handleDominoRematchVote
            : h.gateway.handleSnakesLaddersRematchVote;
      vote.call(h.gateway, h.sockets[0], { accept: true });
      vi.advanceTimersByTime(3500);
      expect(h.room.phase).toBe('FINISHED');
      vote.call(h.gateway, h.sockets[1], { accept: true });
      vi.advanceTimersByTime(3000);
      expect(h.room.phase).toBe('PLAYING');
    });
  },
);

const chatHandlers = {
  room: 'handleChat',
  domino: 'handleDominoChat',
  tournament: 'handleTournamentChat',
  'snakes-ladders': 'handleSnakesLaddersChat',
  'dual-quest': 'handleDualQuestChat',
} as const;
describe.each(modes)('$name: chat compartido', (mode) => {
  it('entrega texto solo a los participantes actuales con identidad del servidor', async () => {
    const h = await setup(mode);
    h.events.length = 0;
    h.gateway[chatHandlers[mode.name]](h.sockets[0], { text: ' Hola equipo ' });
    expect(h.events).toHaveLength(2);
    expect(h.events.map((e) => e.target)).toEqual(['p0', 'p1']);
    for (const event of h.events) {
      expect(event.event).toBe(`${mode.name}:chat-message`);
      expect(event.payload).toMatchObject({
        userId: 'p0',
        displayName: 'p0',
        text: 'Hola equipo',
      });
    }
  });
  it('rechaza intrusos, datos inválidos y al socket reemplazado', async () => {
    const h = await setup(mode);
    const chat = (socket: Client, text: string) =>
      h.gateway[chatHandlers[mode.name]](socket, { text });
    expect(() => chat(client('intruso'), 'hola')).toThrow();
    expect(() => chat(h.sockets[0], 42 as unknown as string)).toThrow();
    const forged = client('p0');
    forged.data.userId = 'p1';
    expect(() => chat(forged, 'hola')).toThrow();
    const replacement = client('p1-new');
    replacement.data.userId = 'p1';
    h.gateway[mode.join](replacement, { code: h.room.code });
    expect(() => chat(h.sockets[1], 'hola')).toThrow();
    h.events.length = 0;
    chat(h.sockets[0], 'hola');
    expect(h.events.map((e) => e.target)).toEqual(['p0', 'p1-new']);
  });
  it('ignora mensajes vacíos y limita su tamaño a 500 caracteres', async () => {
    const h = await setup(mode);
    h.events.length = 0;
    h.gateway[chatHandlers[mode.name]](h.sockets[0], { text: '  ' });
    expect(h.events).toHaveLength(0);
    h.gateway[chatHandlers[mode.name]](h.sockets[0], { text: 'a'.repeat(600) });
    expect(h.events[0].payload).toMatchObject({ text: 'a'.repeat(500) });
  });
});
it('Escaleras solo deja configurar al anfitrión, en espera y dentro de límites', async () => {
  const h = await setup(modes[2]);
  const update = (index: number, value: number) =>
    h.gateway.handleSnakesLaddersUpdateTurnDuration(h.sockets[index], {
      turnDurationSeconds: value,
    });
  expect(() => update(1, 60)).toThrow();
  for (const value of [14, 181, 30.5, NaN])
    expect(() => update(0, value)).toThrow();
  update(0, 15);
  update(0, 180);
  expect(h.room).toHaveProperty('turnDurationSeconds', 180);
  h.ready(0);
  h.ready(1);
  expect(() => update(0, 60)).toThrow();
});
