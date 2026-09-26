// Prueba integrada: gateway Nest/Socket.IO real con repositorios de prueba.
// Primero: npm run build --workspace=server
// Iniciar Vite en :5174 con VITE_API_URL=http://127.0.0.1:3107.
// PLAYWRIGHT_MODULE permite usar una instalación de Playwright fuera del proyecto.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { io } from 'socket.io-client';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
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
const base = process.env.LOBBY_TEST_URL || 'http://127.0.0.1:5174';
const api = 'http://127.0.0.1:3107';
const instructionExamples = new Map();
const modes = [
  ['room', 'GUESS_WHO', ROOM_STORE, (code) => `/?sala=${code}`],
  ['tournament', 'GUESS_WHO', TOURNAMENT_STORE, (code) => `/?sala=${code}`],
  ['domino', 'DOMINO', DOMINO_ROOM_STORE, (code) => `/domino/sala/${code}`],
  [
    'snakes-ladders',
    'SNAKES_LADDERS',
    SNAKES_LADDERS_ROOM_STORE,
    (code) => `/escaleras-serpientes/sala/${code}`,
  ],
  [
    'dual-quest',
    'DUAL_QUEST',
    DUAL_QUEST_ROOM_STORE,
    (code) => `/dual-quest/sala/${code}`,
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
async function until(predicate, label) {
  const deadline = Date.now() + 12000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timeout: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const app = await NestFactory.create(TestModule, { logger: false });
const sockets = [],
  pages = [];
let browser;
try {
  app.enableCors({ origin: base, credentials: true });
  await app.listen(3107, '127.0.0.1');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  mkdirSync('.scratch', { recursive: true });
  for (const [prefix, type, storeToken, path] of modes) {
    const creator = io(`${api}/rooms`, {
      auth: { token: 'Ana' },
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
    const store = app.get(storeToken),
      room = store.get(state.code);
    const players = () => room.participants ?? room.players;
    const pair = [];
    const errors = [];
    for (const [id, role] of [
      ['Ana', 'TEACHER'],
      ['Luis', 'STUDENT'],
    ]) {
      const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
        reducedMotion: 'reduce',
      });
      page.setDefaultTimeout(12000);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('nexusplay-theme', 'dark');
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (text) => {
              if (window.failClipboard) throw new Error('clipboard denied');
              window.copiedLobbyText = text;
            },
          },
        });
      });
      pages.push(page);
      pair.push(page);
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        const json = (data) => route.fulfill({ json: data });
        if (url.pathname.endsWith('/auth/refresh'))
          return json({ accessToken: id });
        if (url.pathname.endsWith('/users/me'))
          return json({
            id,
            role,
            displayName: id,
            email: `${id}@example.test`,
            avatarUrl: null,
          });
        if (url.pathname.endsWith('/subjects')) return json([]);
        if (url.pathname.endsWith('/games'))
          return json({ items: [], total: 0 });
        if (url.pathname.includes('/organizations/')) return json([]);
        if (url.pathname.endsWith('/analytics/events')) return json({});
        if (url.origin === base || url.origin === api) return route.continue();
        return route.abort();
      });
      await page.goto(base + path(room.code));
      await page.getByRole('heading', { name: 'Cómo jugar', exact: true }).waitFor();
      if (id === 'Ana') {
        const signature = await page.locator('[data-game-instructions] svg').evaluateAll(elements => JSON.stringify(elements.slice(0, 4).map(el => el.innerHTML)));
        assert.ok(![...instructionExamples.values()].includes(signature), 'Iconos propios para cada mecánica');
        instructionExamples.set(prefix, signature);
        await page.screenshot({ path: `.scratch/instructions-${prefix}-desktop.png` });
      }
      assert.equal(await page.locator('[data-lobby="shared"]').count(), 0);
      const beforeInstructions = players().map((player) => player.socketId);
      await page.waitForTimeout(500);
      assert.deepEqual(players().map((player) => player.socketId), beforeInstructions);
      await page.getByRole('button', { name: 'Entendido, continuar' }).click();
      await page
        .getByRole('region', { name: 'Confirmación de jugadores' })
        .waitFor();
    }
    creator.disconnect(); // Los navegadores ya reemplazaron su conexión.
    await until(() => players().length === 2, 'dos participantes');
    const [host, guest] = pair;
    const readyPanel = (page) =>
      page.getByRole('region', { name: 'Confirmación de jugadores' });
    const lobby = (page) =>
      page.getByRole('dialog', { name: 'Sala de espera', exact: true });
    await lobby(host)
      .getByRole('heading', { name: room.gameTitle, exact: true })
      .waitFor();
    for (const label of [
      'Chat',
      'Salir',
      'Copiar código',
      'Copiar enlace',
      'Listo para jugar',
    ]) {
      assert.equal(
        await lobby(host)
          .getByRole('button', { name: label, exact: true })
          .count(),
        1,
      );
    }
    await lobby(host)
      .getByRole('button', { name: 'Copiar código', exact: true })
      .click();
    await lobby(host).getByText('Código copiado', { exact: true }).waitFor();
    assert.equal(await host.evaluate(() => window.copiedLobbyText), room.code);
    await lobby(host)
      .getByRole('button', { name: 'Copiar enlace', exact: true })
      .click();
    await lobby(host).getByText('Enlace copiado', { exact: true }).waitFor();
    const sharedLink = await host.evaluate(() => window.copiedLobbyText);
    assert.equal(sharedLink, base + path(room.code));
    await host.evaluate(() => {
      window.failClipboard = true;
    });
    await lobby(host)
      .getByRole('button', { name: 'Copiar código', exact: true })
      .click();
    await lobby(host)
      .getByText('No se pudo copiar. Inténtalo de nuevo.')
      .waitFor();
    await host.evaluate(() => {
      window.failClipboard = false;
    });
    // Salir y volver con el enlace compartido debe recuperar la actividad correcta.
    await lobby(guest)
      .getByRole('button', { name: 'Salir', exact: true })
      .click();
    await until(() => players().length === 1, 'salida del invitado');
    await guest.goto(sharedLink);
    await guest.getByRole('button', { name: 'Entendido, continuar' }).click();
    await lobby(guest).waitFor();
    await until(() => players().length === 2, 'entrada desde enlace');
    await lobby(host)
      .getByRole('button', { name: 'Chat', exact: true })
      .click();
    await host
      .getByRole('textbox', { name: 'Mensaje', exact: true })
      .fill(`Hola ${prefix}`);
    await host
      .getByRole('button', { name: 'Enviar mensaje', exact: true })
      .click();
    await lobby(guest).getByRole('button', { name: 'Chat' }).click();
    await guest
      .getByRole('log')
      .getByText(`Hola ${prefix}`, { exact: true })
      .waitFor();
    await guest
      .getByRole('textbox', { name: 'Mensaje', exact: true })
      .fill('Recibido');
    await guest
      .getByRole('button', { name: 'Enviar mensaje', exact: true })
      .click();
    await host
      .getByRole('log')
      .getByText('Recibido', { exact: true })
      .waitFor();
    await host.keyboard.press('Escape');
    await guest.keyboard.press('Escape');
    await host
      .getByRole('dialog', { name: 'Chat de la sala' })
      .waitFor({ state: 'hidden' });
    await lobby(host).waitFor(); // Escape del chat no abandona la sala.
    if (prefix !== 'dual-quest') {
      await readyPanel(guest)
        .getByRole('button', { name: 'Listo para jugar' })
        .click();
      await until(
        () => players().find((p) => p.userId === 'Luis').ready,
        'voto previo a configuración',
      );
      await lobby(host)
        .getByRole('spinbutton', { name: 'Segundos por turno' })
        .fill('45');
      await until(
        () =>
          room.turnDurationSeconds === 45 && players().every((p) => !p.ready),
        'configuración compartida',
      );
      await lobby(guest).getByText('45', { exact: true }).waitFor();
      assert.equal(await lobby(guest).getByRole('spinbutton').count(), 0);
    } else {
      await lobby(host)
        .getByText('Juego simultáneo', { exact: true })
        .waitFor();
      assert.equal(await lobby(host).getByRole('spinbutton').count(), 0);
      assert.match(await lobby(host).innerText(), /🔥.*Ana/);
      assert.match(await lobby(host).innerText(), /💧.*Luis/);
    }
    await host.setViewportSize({ width: 390, height: 844 });
    await host.screenshot({
      path: `.scratch/shared-lobby-${prefix}-mobile.png`,
    });
    const mobileBounds = await lobby(host).boundingBox();
    assert.ok(
      mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 391,
    );
    assert.equal(
      await lobby(host).evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await readyPanel(host)
      .getByRole('button', { name: 'Listo para jugar' })
      .focus();
    await host.keyboard.press('Tab');
    assert.equal(
      await lobby(host)
        .getByRole('button', { name: 'Chat', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await host.setViewportSize({ width: 1280, height: 900 });
    await host.screenshot({
      path: `.scratch/shared-lobby-${prefix}-desktop.png`,
    });
    await readyPanel(host)
      .getByRole('button', { name: 'Listo para jugar' })
      .click();
    await readyPanel(guest).getByText('Ana: Listo', { exact: true }).waitFor();
    assert.equal(room.phase, 'WAITING', `${prefix}: un jugador no inicia`);
    await host.screenshot({ path: `.scratch/ready-${prefix}.png` });
    await readyPanel(host)
      .getByRole('button', { name: 'Cancelar mi confirmación' })
      .click();
    await until(
      () => players().every((player) => !player.ready),
      'cancelación',
    );
    // Cortar la conexión real del invitado: el hook debe volver al mismo lobby sin voto.
    const oldSocket = players().find(
      (player) => player.userId === 'Luis',
    ).socketId;
    app.get(RoomsGateway).server.sockets.get(oldSocket).conn.close();
    await until(
      () =>
        players().some(
          (player) => player.userId === 'Luis' && player.socketId !== oldSocket,
        ),
      'reconexión',
    );
    await readyPanel(guest)
      .getByRole('button', { name: 'Listo para jugar' })
      .waitFor();
    assert.equal(
      players().find((player) => player.userId === 'Luis').ready,
      false,
    );
    await readyPanel(host)
      .getByRole('button', { name: 'Listo para jugar' })
      .click();
    await readyPanel(guest)
      .getByRole('button', { name: 'Listo para jugar' })
      .click();
    await until(
      () => room.phase === (prefix === 'tournament' ? 'RUNNING' : 'PLAYING'),
      'inicio automático',
    );
    await readyPanel(host).waitFor({ state: 'hidden' });
    await readyPanel(guest).waitFor({ state: 'hidden' });
    assert.deepEqual(errors, [], 'sin errores de render');
    console.log(
      `PASS ${prefix}: lobby compartido, enlaces, chat, permisos, configuración, móvil, teclado, reconexión e inicio por unanimidad`,
    );
    for (const page of pair) await page.close();
  }
} catch (error) {
  for (const [index, page] of pages.entries())
    if (!page.isClosed()) {
      await page
        .screenshot({ path: `.scratch/ready-failure-${index}.png` })
        .catch(() => {});
      console.error((await page.locator('body').innerText()).slice(-2500));
    }
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const socket of sockets) socket.disconnect();
  await browser?.close();
  const gateway = app.get(RoomsGateway);
  for (const mapName of [
    'dealTimers',
    'turnTimers',
    'dominoTurnTimers',
    'tournamentTurnTimers',
    'snakesLaddersTurnTimers',
    'dualQuestMovementTicks',
  ]) {
    for (const timer of gateway[mapName].values()) clearTimeout(timer);
    gateway[mapName].clear();
  }
  await app.close();
}
