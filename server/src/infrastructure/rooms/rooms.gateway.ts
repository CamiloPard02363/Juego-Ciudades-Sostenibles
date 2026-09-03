import { Inject, Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { GAME_REPOSITORY, type GameRepository } from '../../domain/ports/game.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { ROOM_STORE, type RoomStore, type RoomState } from '../../domain/ports/room-store.port.js';
import type { GuessWhoCard } from '../../application/content-validators/guess-who.content-validator.js';
import { WsExceptionFilter } from './ws-exception.filter.js';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    displayName: string;
  };
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Vista pública de la sala que se envía a un jugador dado: oculta la carta secreta ajena. */
function toClientView(room: RoomState, forSocketId: string) {
  return {
    code: room.code,
    gameTitle: room.gameTitle,
    cards: room.cards,
    maxAccusationCount: room.maxAccusationCount,
    phase: room.phase,
    winnerUserId: room.winnerUserId,
    players: room.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      discardedCardIds: player.discardedCardIds,
      // La carta secreta propia sí se revela al dueño (para que sepa qué le preguntan);
      // la del rival nunca viaja a este socket.
      secretCardId: player.socketId === forSocketId ? player.secretCardId : null,
      isSelf: player.socketId === forSocketId,
    })),
  };
}

/**
 * Salas efímeras en memoria para "¿Quién Es?" (GUESS_WHO): dos jugadores se
 * unen por código, cada uno recibe al azar una carta secreta del mismo set
 * que ve el rival, y van descartando cartas de su propio tablero hasta que
 * quedan pocas y pueden acusar. No hay persistencia — si el server reinicia,
 * las salas activas se pierden (aceptado: es una partida en vivo entre 2
 * personas, no algo que deba sobrevivir un despliegue).
 */
@WebSocketGateway({
  namespace: '/rooms',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
    credentials: true,
  },
})
@UseFilters(WsExceptionFilter)
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ROOM_STORE) private readonly roomStore: RoomStore,
  ) {}

  async handleConnection(socket: AuthenticatedSocket) {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.disconnect();
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        socket.disconnect();
        return;
      }
      socket.data.userId = payload.sub;
      socket.data.displayName = user.name.getFullName();
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room) return;

    room.players = room.players.filter((player) => player.socketId !== socket.id);

    if (room.players.length === 0) {
      this.roomStore.delete(room.code);
      return;
    }

    room.phase = room.phase === 'FINISHED' ? room.phase : 'WAITING';
    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:create')
  async handleCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { gameId: string },
  ) {
    const game = await this.gameRepository.findById(body.gameId);
    if (!game || game.gameType.getName() !== 'GUESS_WHO') {
      throw new Error('Juego no encontrado o no es de tipo "¿Quién Es?".');
    }

    let code = generateRoomCode();
    while (this.roomStore.get(code)) {
      code = generateRoomCode();
    }

    const room: RoomState = {
      code,
      gameId: game.id,
      gameTitle: game.title,
      cards: game.content as GuessWhoCard[],
      maxAccusationCount: (game.config.maxAccusationCount as number | undefined) ?? 6,
      phase: 'WAITING',
      players: [
        {
          socketId: socket.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          secretCardId: null,
          discardedCardIds: [],
        },
      ],
      winnerUserId: null,
      createdAt: Date.now(),
    };

    this.roomStore.create(room);
    socket.join(code);
    socket.emit('room:state', toClientView(room, socket.id));
  }

  @SubscribeMessage('room:join')
  handleJoin(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    const room = this.roomStore.get(code);

    if (!room) {
      throw new Error('No existe una sala con ese código.');
    }
    if (room.players.length >= 2 && !room.players.some((p) => p.userId === socket.data.userId)) {
      throw new Error('La sala ya está llena.');
    }

    const existing = room.players.find((player) => player.userId === socket.data.userId);
    if (existing) {
      existing.socketId = socket.id;
    } else {
      room.players.push({
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        secretCardId: null,
        discardedCardIds: [],
      });
    }

    this.roomStore.set(room);
    socket.join(code);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:start')
  handleStart(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.players.length !== 2) throw new Error('Se necesitan 2 jugadores para iniciar.');

    const shuffled = shuffle(room.cards);
    room.players[0].secretCardId = shuffled[0].cardId;
    room.players[1].secretCardId = shuffled[1].cardId;
    room.players.forEach((player) => (player.discardedCardIds = []));
    room.phase = 'PLAYING';
    room.winnerUserId = null;

    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:discard')
  handleDiscard(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { cardId: string },
  ) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');

    if (!player.discardedCardIds.includes(body.cardId)) {
      player.discardedCardIds.push(body.cardId);
    }

    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:accuse')
  handleAccuse(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { cardId: string },
  ) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const accuser = room.players.find((p) => p.socketId === socket.id);
    const opponent = room.players.find((p) => p.socketId !== socket.id);
    if (!accuser || !opponent) throw new Error('Falta el rival para acusar.');

    const remaining = room.cards.length - accuser.discardedCardIds.length;
    if (remaining > room.maxAccusationCount) {
      throw new Error(`Solo puedes acusar con ${room.maxAccusationCount} cartas o menos en el tablero.`);
    }

    room.phase = 'FINISHED';
    room.winnerUserId = body.cardId === opponent.secretCardId ? accuser.userId : opponent.userId;

    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:leave')
  handleLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    this.handleDisconnect(socket);
    socket.disconnect();
  }

  private broadcastState(room: RoomState) {
    for (const player of room.players) {
      this.server.to(player.socketId).emit('room:state', toClientView(room, player.socketId));
    }
  }
}
