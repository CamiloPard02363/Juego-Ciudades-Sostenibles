// Prueba integrada: gateway Nest/Socket.IO real con repositorios de prueba.
// Primero: npm run build --workspace=server
// Iniciar Vite en :5181 con VITE_API_URL=http://127.0.0.1:3109.
// PLAYWRIGHT_MODULE permite usar una instalaciÃ³n de Playwright fuera del proyecto.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { io } from 'socket.io-client';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { RoomsGateway } from '../dist/infrastructure/rooms/rooms.gateway.js';
import { GAME_REPOSITORY } from '../dist/domain/ports/game.repository.port.js';
import { USER_REPOSITORY } from '../dist/domain/ports/user.repository.port.js';
import { ROOM_STORE } from '../dist/domain/ports/room-store.port.js';
import { TOURNAMENT_STORE } from '../dist/domain/ports/tournament-store.port.js';
import { DOMINO_ROOM_STORE } from '../dist/domain/ports/domino-room-store.port.js';
import { SNAKES_LADDERS_ROOM_STORE } from '../dist/domain/ports/snakes-ladders-room-store.port.js';
import { DUAL_QUEST_ROOM_STORE } from '../dist/domain/ports/dual-quest-room-store.port.js';
import { InMemoryRoomStore } from '../dist/infrastructure/rooms/in-memory-room.store.js';
import { InMemoryTournamentStore } from '../dist/infrastructure/rooms/in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from '../dist/infrastructure/rooms/in-memory-domino-room.store.js';
import { InMemorySnakesLaddersRoomStore } from '../dist/infrastructure/rooms/in-memory-snakes-ladders-room.store.js';
import { InMemoryDualQuestRoomStore } from '../dist/infrastructure/rooms/in-memory-dual-quest-room.store.js';
import { AnalyticsTrackerService } from '../dist/application/services/analytics-tracker.service.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LOBBY_TEST_URL || 'http://127.0.0.1:5181';
const api = 'http://127.0.0.1:3109';

const modes = [
  ['room', 'GUESS_WHO', ROOM_STORE],
  ['tournament', 'GUESS_WHO', TOURNAMENT_STORE],
  ['domino', 'DOMINO', DOMINO_ROOM_STORE],
  [
    'snakes-ladders',
    'SNAKES_LADDERS',
    SNAKES_LADDERS_ROOM_STORE,
  ],
  [
    'dual-quest',
    'DUAL_QUEST',
    DUAL_QUEST_ROOM_STORE,
  ],
];
function game(type) {
  return {
    id: type,
    title: `Prueba ${type}`,
    gameType: { getName: () => type },
    config: {
      turnDurationSeconds: 120,
      handSize: 7,
      boardSize: 30,
      ladders: [],
      snakes: [],
      coreQuestion: 'Pregunta',
      gridCols: 8,
      gridRows: 6,
      grid: Array.from({ length: 6 }, () => Array(8).fill(0)),
      fireStart: { row: 0, col: 0 },
      waterStart: { row: 0, col: 1 },
      corePosition: { row: 5, col: 7 },
      gates: [],
      triggers: [],
    },
    content:
      type === 'GUESS_WHO'
        ? Array.from({ length: 6 }, (_, i) => ({
            cardId: `c${i}`,
            label: `Carta ${i + 1}`,
            imageUrl:
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="orange"/></svg>',
            audioUrl: null,
          }))
        : type === 'DOMINO'
          ? Array.from({ length: 6 }, (_, i) => ({
              conceptId: `c${i}`,
              label: `Concepto ${i + 1}`,
              icon: 'Sun',
              color: '#7c3aed',
            }))
          : [],
  };
}
class TestModule {}
Module({
  providers: [
    RoomsGateway,
    {
      provide: JwtService,
      useValue: { verifyAsync: async (token) => ({ sub: token }) },
    },
    {
      provide: GAME_REPOSITORY,
      useValue: { findById: async (id) => game(id) },
    },
    {
      provide: USER_REPOSITORY,
      useValue: {
        findById: async (id) => ({ name: { getFullName: () => id } }),
      },
    },
    { provide: AnalyticsTrackerService, useValue: { track: async () => {} } },
    { provide: ROOM_STORE, useClass: InMemoryRoomStore },
    { provide: TOURNAMENT_STORE, useClass: InMemoryTournamentStore },
    { provide: DOMINO_ROOM_STORE, useClass: InMemoryDominoRoomStore },
    {
      provide: SNAKES_LADDERS_ROOM_STORE,
      useClass: InMemorySnakesLaddersRoomStore,
    },
    { provide: DUAL_QUEST_ROOM_STORE, useClass: InMemoryDualQuestRoomStore },
  ],
})(TestModule);

const app = await NestFactory.create(TestModule, { logger: false });
const sockets = [];
let browser;
async function loginPage(path, failFirst = false) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (error) => console.error(error.message));
  page.setDefaultTimeout(15000);
  let authenticated = false;
  const user = {
    id: 'Guest',
    role: 'STUDENT',
    displayName: 'Guest',
    email: 'guest@example.test',
    avatarUrl: null,
  };
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    const json = (data) => route.fulfill({ json: data });
    if (url.pathname.endsWith('/auth/refresh'))
      return authenticated
        ? json({ accessToken: 'Guest' })
        : route.fulfill({ status: 401, json: { message: 'Sin sesión' } });
    if (url.pathname.endsWith('/auth/login')) {
      if (failFirst) {
        failFirst = false;
        return route.fulfill({
          status: 401,
          json: { message: 'Credenciales incorrectas' },
        });
      }
      authenticated = true;
      return json({ accessToken: 'Guest', user });
    }
    if (url.pathname.endsWith('/users/me')) return json(user);
    if (url.pathname.endsWith('/auth/register')) return json(user);
    if (url.pathname.endsWith('/subjects')) return json([]);
    if (url.pathname.endsWith('/games')) return json({ items: [], total: 0 });
    if (url.pathname.includes('/organizations/')) return json([]);
    if (url.pathname.endsWith('/analytics/events')) return json({});
    if (url.origin === base || url.origin === api) return route.continue();
    return route.abort();
  });
  await page.goto(base + path);
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .waitFor();
  return page;
}
async function submit(page) {
  await page
    .getByLabel('Correo electrónico', { exact: true })
    .fill('guest@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('Example123!');
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .press('Enter');
}
try {
  app.enableCors({ origin: base, credentials: true });
  await app.listen(3109, '127.0.0.1');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [prefix, type, storeToken] of modes) {
    const creator = io(`${api}/rooms`, {
      auth: { token: 'Host' },
      transports: ['websocket'],
      autoConnect: false,
    });
    sockets.push(creator);
    await new Promise((resolve, reject) => {
      creator.once('connect', resolve);
      creator.once('connect_error', reject);
      creator.connect();
    });
    const created = new Promise((resolve) =>
      creator.once(`${prefix}:state`, resolve),
    );
    creator.emit(`${prefix}:create`, { gameId: type, maxParticipants: 4 });
    const state = await created;
    const room = app.get(storeToken).get(state.code);
    const route =
      {
        room: '/quien-es/sala/',
        tournament: '/quien-es/torneo/',
        domino: '/domino/sala/',
        'snakes-ladders': '/escaleras-serpientes/sala/',
        'dual-quest': '/dual-quest/sala/',
      }[prefix] + state.code;
    for (const path of [route, `/?sala=${state.code}`]) {
      const page = await loginPage(path, prefix === 'room');
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), path);
      await page.reload();
      await page
        .getByRole('button', { name: 'Iniciar sesión', exact: true })
        .waitFor();
      await page.waitForTimeout(500);
      await page
        .getByRole('button', { name: 'Regístrate', exact: true })
        .press('Enter');
      await page.waitForURL((url) => url.pathname === '/register');
      assert.equal(new URL(page.url()).searchParams.get('returnTo'), path);
      await page
        .getByRole('button', { name: 'Inicia sesión', exact: true })
        .press('Enter');
      await submit(page);
      if (prefix === 'room') {
        await page
          .getByText('Credenciales incorrectas', { exact: true })
          .waitFor();
        assert.equal(new URL(page.url()).searchParams.get('returnTo'), path);
        await submit(page);
      }
      await page.waitForURL((url) => url.pathname === route);
      await page
        .getByRole('heading', { name: 'Cómo jugar', exact: true })
        .waitFor();
      assert.equal(await page.locator('[data-lobby="shared"]').count(), 0);
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page
        .getByRole('dialog', { name: 'Sala de espera', exact: true })
        .waitFor();
      assert.ok(
        (room.participants ?? room.players).some(
          (player) => player.userId === 'Guest',
        ),
      );
      console.log(`PASS ${prefix}: ${path} → login → sala original`);
      await page.close();
    }
    if (prefix === 'domino') {
      const page = await loginPage(route);
      await page
        .getByRole('button', { name: 'Regístrate', exact: true })
        .press('Enter');
      await page.getByLabel('Nombre', { exact: true }).fill('Guest');
      await page.getByLabel('Apellido', { exact: true }).fill('Test');
      await page
        .getByLabel('Fecha de nacimiento', { exact: true })
        .fill('2000-01-01');
      await page
        .getByRole('button', { name: 'Continuar', exact: true })
        .press('Enter');
      await page
        .getByLabel('Correo electrónico', { exact: true })
        .fill('guest@example.test');
      await page.getByLabel('Contraseña', { exact: true }).fill('Example123!');
      await page
        .getByRole('button', { name: 'Crear cuenta', exact: true })
        .press('Enter');
      await page.waitForURL((url) => url.pathname === route);
      await page
        .getByRole('heading', { name: 'Cómo jugar', exact: true })
        .waitFor();
      console.log('PASS registro nuevo → invitación original');
      await page.close();
    }
  }
  for (const path of [
    '/login',
    '/login?returnTo=https://example.test',
    '/login?returnTo=/juegos/crear',
  ]) {
    const page = await loginPage(path);
    await submit(page);
    await page.waitForURL(
      (url) => url.origin === base && url.pathname === '/' && !url.search,
    );
    console.log(`PASS acceso normal/destino inválido: ${path} → home`);
    await page.close();
  }
} finally {
  await browser?.close();
  sockets.forEach((socket) => socket.disconnect());
  const gateway = app.get(RoomsGateway);
  for (const value of Object.values(gateway))
    if (value instanceof Map)
      for (const entry of value.values())
        if (
          entry &&
          typeof entry === 'object' &&
          typeof entry.hasRef === 'function'
        )
          clearTimeout(entry);
  await app.close();
}
