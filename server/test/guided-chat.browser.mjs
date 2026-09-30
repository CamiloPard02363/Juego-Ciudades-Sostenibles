// Prueba integrada: gateway Nest/Socket.IO real con repositorios de prueba.
// Primero: npm run build --workspace=server
// Iniciar Vite en :5178 con VITE_API_URL=http://127.0.0.1:3108.
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
const base = process.env.LOBBY_TEST_URL || 'http://127.0.0.1:5178';
const api = 'http://127.0.0.1:3108';
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
  const deadline = Date.now() + 15000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timeout: ' + label);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}
const app = await NestFactory.create(TestModule, { logger: false });
const sockets = [], pages = [];
let browser;
try {
  await app.listen(3108, '127.0.0.1');
  browser = await chromium.launch({channel:'chrome',headless:true});
  mkdirSync('.scratch',{recursive:true});
  for (const mode of ['room','tournament']) {
    const creator = io(api+'/rooms',{auth:{token:'Ana'},transports:['websocket']}); sockets.push(creator);
    await new Promise(resolve=>creator.once('connect',resolve));
    const created = new Promise(resolve=>creator.once(mode+':state',resolve));
    creator.emit(mode+':create',{gameId:'GUESS_WHO',maxParticipants:4});
    const initial = await created;
    const store = app.get(mode==='room'?ROOM_STORE:TOURNAMENT_STORE), room = store.get(initial.code);
    const pair=[];
    for(const [id,role] of [['Ana','TEACHER'],['Luis','STUDENT']]) {
      const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}); pages.push(page); pair.push(page);
      page.setDefaultTimeout(15000);
      await page.addInitScript(()=>localStorage.setItem('nexusplay-theme','dark'));
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.pathname.endsWith('/auth/refresh'))return route.fulfill({json:{accessToken:id}});
        if(url.pathname.endsWith('/users/me'))return route.fulfill({json:{id,role,displayName:id,email:id+'@example.test',avatarUrl:null}});
        if(url.pathname.endsWith('/subjects'))return route.fulfill({json:[]});
        if(url.pathname.endsWith('/games'))return route.fulfill({json:{items:[],total:0}});
        if(url.pathname.includes('/organizations/'))return route.fulfill({json:[]});
        if(url.pathname.endsWith('/analytics/events'))return route.fulfill({json:{}});
        if(url.origin===base||url.origin===api)return route.continue();
        return route.abort();
      });
      await page.goto(base+`/quien-es/${mode==='room'?'sala':'torneo'}/${initial.code}`);
      await page.getByRole('heading',{name:'Cómo jugar',exact:true}).waitFor();
      await page.waitForTimeout(500); await page.keyboard.press('Escape');
      await page.getByRole('region',{name:'Confirmación de jugadores'}).waitFor();
    }
    creator.disconnect();
    for(const page of pair)await page.getByRole('button',{name:'Listo para jugar',exact:true}).click();
    await until(()=>mode==='room'?room.phase==='PLAYING':room.matches.some(m=>m.phase==='PLAYING'),'start');
    const match=mode==='room'?room:room.matches.find(m=>m.phase==='PLAYING');
    const activeIndex=match.activePlayerUserId==='Ana'?0:1;
    const asker=pair[activeIndex], responder=pair[1-activeIndex];
    const region=page=>page.getByRole('region',{name:'Chat de la sala',exact:true});
    await region(asker).waitFor(); await region(responder).waitFor();
    await asker.waitForTimeout(2000);
    assert.equal(await asker.getByRole('button',{name:'Chat',exact:true}).count(),0);
    await region(asker).getByRole('textbox',{name:'Mensaje',exact:true}).fill('grupo');
    await region(asker).getByRole('button',{name:'Preguntar: ¿Tu tarjeta está en este grupo?',exact:true}).click();
    await until(()=>!!match.pendingQuestion,'question');
    const q=structuredClone(match.pendingQuestion);
    const responderId=activeIndex===0?'Luis':'Ana';
    const secret=match.players.find(p=>p.userId===responderId).secretCardId;
    const correct=q.cardIds.includes(secret);
    await region(responder).getByRole('button',{name:correct?'No':'Sí',exact:true}).click();
    await region(responder).getByRole('alert').getByText(/Revisa tu tarjeta/).waitFor();
    assert.equal(match.players.find(p=>p.userId===q.askerId).discardedCardIds.length,0);
    await region(responder).getByRole('button',{name:correct?'Sí':'No',exact:true}).click();
    await until(()=>!match.pendingQuestion,'answer');
    const discarded=match.players.find(p=>p.userId===q.askerId).discardedCardIds;
    assert.equal(discarded.length,3); assert.ok(!discarded.includes(secret));
    assert.equal(match.players.find(p=>p.userId===responderId).discardedCardIds.length,0);
    await region(asker).getByRole('log').getByText(/3 tarjetas descartadas automáticamente/).waitFor();
    await region(responder).getByRole('log').getByText(/3 tarjetas descartadas automáticamente/).waitFor();
    assert.equal(await asker.getByRole('button',{name:'¡Creo que es esta!',exact:true}).isEnabled(),true);
    // Texto libre no modifica el tablero.
    await region(asker).getByRole('textbox',{name:'Mensaje',exact:true}).fill('Sí, estoy pensando');
    await region(asker).getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await region(responder).getByRole('log').getByText('Sí, estoy pensando',{exact:true}).waitFor();
    assert.equal(discarded.length,3);
    await asker.screenshot({path:'.scratch/guided-chat-'+mode+'-desktop.png'});
    // Pregunta pendiente se cancela al pasar de turno.
    await region(asker).getByRole('button',{name:'Preguntar: ¿Tu tarjeta está en este grupo?',exact:true}).click();
    await until(()=>!!match.pendingQuestion,'second question');
    await asker.getByRole('button',{name:'Pasar turno',exact:true}).click();
    await until(()=>match.activePlayerUserId===responderId,'turn');
    assert.equal(match.pendingQuestion,null);
    await region(responder).getByRole('button',{name:'Preguntar: ¿Tu tarjeta está en este grupo?',exact:true}).waitFor();
    for(const [width,height] of [[1440,900],[1024,768],[768,600],[390,844],[320,700]]){
      await responder.setViewportSize({width,height});
      await responder.waitForTimeout(150);
      assert.equal(await responder.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
      const box=await region(responder).boundingBox(); assert.ok(box.x>=0&&box.x+box.width<=width);
      const board=await responder.locator('.guess-who-play-board').boundingBox();
      assert.ok(box.x>=board.x+board.width,`chat al costado ${width}: ${JSON.stringify({box,board})}`);
      assert.ok(Math.abs(box.y-board.y)<2,'chat alineado con el tablero');
      assert.ok(box.y+box.height<=height+1,`chat completo dentro del viewport ${width}x${height}: ${JSON.stringify(box)}`);
      const input=await region(responder).getByRole('textbox',{name:'Mensaje',exact:true}).boundingBox();
      const send=await region(responder).getByRole('button',{name:'Enviar mensaje',exact:true}).boundingBox();
      assert.ok(input.y>=0&&input.y+input.height<=height,'campo visible sin scroll');
      assert.ok(send.y>=0&&send.y+send.height<=height,'enviar visible sin scroll');
      assert.equal(await responder.locator('.guess-who-play-shell').evaluate(el=>el.parentElement.scrollHeight<=el.parentElement.clientHeight),true);
      await responder.screenshot({path:'.scratch/guided-chat-'+mode+'-'+width+'.png'});
    }
    console.log('PASS '+mode+': panel visible, sugerencia, respuesta inválida, descarte sincronizado, chat libre, turno y móvil');
    for(const page of pair)await page.close();
  }
} catch(error) {
  console.error(error);
  for(let i=0;i<pages.length;i++) if(!pages[i].isClosed()) await pages[i].screenshot({path:'.scratch/guided-failure-'+i+'.png'}).catch(()=>{});
  throw error;
} finally {
  for(const socket of sockets)socket.disconnect();
  if(browser)await browser.close();
  const gateway = app.get(RoomsGateway);
  for (const value of Object.values(gateway)) if (value instanceof Map) {
    for (const entry of value.values()) if (entry && typeof entry === 'object' && typeof entry.hasRef === 'function') clearTimeout(entry);
  }
  await app.close();
}


