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

/** Cuenta regresiva antes de repartir cartas (3-2-1), igual para el inicio y cada revancha. */
const DEAL_COUNTDOWN_MS = 3_000;

/** Vista pública de la sala que se envía a un jugador dado: oculta la carta secreta ajena. */
function toClientView(room: RoomState, forSocketId: string) {
  return {
    code: room.code,
    gameTitle: room.gameTitle,
    cards: room.cards,
    maxAccusationCount: room.maxAccusationCount,
    turnDurationSeconds: room.turnDurationSeconds,
    phase: room.phase,
    winnerUserId: room.winnerUserId,
    activePlayerUserId: room.activePlayerUserId,
    turnDeadline: room.turnDeadline,
    players: room.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      discardedCardIds: player.discardedCardIds,
      // La carta secreta propia sí se revela al dueño (para que sepa qué le preguntan);
      // la del rival nunca viaja a este socket.
      secretCardId: player.socketId === forSocketId ? player.secretCardId : null,
      isSelf: player.socketId === forSocketId,
      hasVotedRematch: room.rematchVotes[player.userId] !== undefined,
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

  /**
   * Timers de turno en memoria, uno por sala activa (código -> handle de
   * setTimeout). No viven en RoomState porque un NodeJS.Timeout no es un
   * dato serializable de la sala, es un efecto colateral de este gateway.
   * El servidor es quien manda: si nadie actúa a tiempo, este timer pasa el
   * turno igual que si el jugador hubiera pulsado "Pasar turno".
   */
  private readonly turnTimers = new Map<string, NodeJS.Timeout>();

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

    this.clearTurnTimer(room.code);
    room.players = room.players.filter((player) => player.socketId !== socket.id);

    if (room.players.length === 0) {
      this.roomStore.delete(room.code);
      return;
    }

    room.phase = room.phase === 'FINISHED' ? room.phase : 'WAITING';
    room.activePlayerUserId = null;
    room.turnDeadline = null;
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
      turnDurationSeconds: (game.config.turnDurationSeconds as number | undefined) ?? 15,
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
      rematchVotes: {},
      activePlayerUserId: null,
      turnDeadline: null,
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
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (room.players.length !== 2) throw new Error('Se necesitan 2 jugadores para iniciar.');

    this.startDealCountdown(room);
  }

  /**
   * Voto de revancha tras terminar una partida (fase FINISHED). Ambos
   * jugadores deben votar "sí" para reiniciar; si uno vota "no", el otro es
   * expulsado con un aviso en vez de quedarse esperando indefinidamente.
   */
  @SubscribeMessage('room:rematch-vote')
  handleRematchVote(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { accept: boolean },
  ) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'FINISHED') throw new Error('No hay una partida terminada para votar revancha.');

    const voter = room.players.find((p) => p.socketId === socket.id);
    if (!voter) throw new Error('No estás en esta sala.');

    room.rematchVotes[voter.userId] = body.accept;

    if (body.accept === false) {
      const opponent = room.players.find((p) => p.userId !== voter.userId);
      if (opponent) {
        this.server.to(opponent.socketId).emit('room:rematch-rejected', {
          message: `${voter.displayName} no quiso seguir jugando.`,
        });
      }
      this.roomStore.delete(room.code);
      return;
    }

    const allAccepted =
      room.players.length === 2 && room.players.every((p) => room.rematchVotes[p.userId] === true);

    if (allAccepted) {
      this.startDealCountdown(room);
      return;
    }

    this.roomStore.set(room);
    this.broadcastState(room);
  }

  /**
   * Cuenta regresiva de 3-2-1 antes de repartir (mismo aviso para el primer
   * inicio y cada revancha): se avisa a los clientes vía `room:dealing` para
   * que muestren la animación de barajado, y solo al final se reparten
   * cartas y arranca el turno.
   */
  private startDealCountdown(room: RoomState) {
    this.server.to(room.code).emit('room:dealing', { countdownMs: DEAL_COUNTDOWN_MS });
    setTimeout(() => {
      // La sala pudo cerrarse (alguien se desconectó) durante la cuenta regresiva.
      const current = this.roomStore.get(room.code);
      if (!current || current.players.length !== 2) return;
      this.dealNewGame(current);
    }, DEAL_COUNTDOWN_MS);
  }

  /** Baraja cartas nuevas, reparte, elige turno al azar y pasa la sala a PLAYING. */
  private dealNewGame(room: RoomState) {
    const shuffled = shuffle(room.cards);
    room.players[0].secretCardId = shuffled[0].cardId;
    room.players[1].secretCardId = shuffled[1].cardId;
    room.players.forEach((player) => (player.discardedCardIds = []));
    room.phase = 'PLAYING';
    room.winnerUserId = null;
    room.rematchVotes = {};

    const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    this.setActiveTurn(room, firstPlayer.userId);
  }

  /**
   * Pasar el turno manualmente (botón "Pasar turno"). Solo el jugador activo
   * puede hacerlo — no tiene sentido que el rival ceda un turno que no es
   * suyo.
   */
  @SubscribeMessage('room:pass-turn')
  handlePassTurn(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');

    this.advanceTurn(room);
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
    if (player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');

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
    if (accuser.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');

    const remaining = room.cards.length - accuser.discardedCardIds.length;
    if (remaining > room.maxAccusationCount) {
      throw new Error(`Solo puedes acusar con ${room.maxAccusationCount} cartas o menos en el tablero.`);
    }

    this.clearTurnTimer(room.code);
    room.phase = 'FINISHED';
    room.winnerUserId = body.cardId === opponent.secretCardId ? accuser.userId : opponent.userId;
    room.rematchVotes = {};
    room.activePlayerUserId = null;
    room.turnDeadline = null;

    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:leave')
  handleLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    this.handleDisconnect(socket);
    socket.disconnect();
  }

  /** Fija el turno activo, arranca su deadline y programa el auto-pase server-side. */
  private setActiveTurn(room: RoomState, userId: string) {
    room.activePlayerUserId = userId;
    room.turnDeadline = Date.now() + room.turnDurationSeconds * 1000;

    this.roomStore.set(room);
    this.broadcastState(room);

    this.clearTurnTimer(room.code);
    const timer = setTimeout(() => {
      const current = this.roomStore.get(room.code);
      if (!current || current.phase !== 'PLAYING' || current.activePlayerUserId !== userId) return;
      this.advanceTurn(current);
    }, room.turnDurationSeconds * 1000);
    this.turnTimers.set(room.code, timer);
  }

  /** Pasa el turno al otro jugador (usada tanto por "Pasar turno" como por el vencimiento del timer). */
  private advanceTurn(room: RoomState) {
    const next = room.players.find((p) => p.userId !== room.activePlayerUserId);
    if (!next) return;
    this.setActiveTurn(room, next.userId);
  }

  private clearTurnTimer(code: string) {
    const timer = this.turnTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(code);
    }
  }

  private broadcastState(room: RoomState) {
    for (const player of room.players) {
      this.server.to(player.socketId).emit('room:state', toClientView(room, player.socketId));
    }
  }
}
