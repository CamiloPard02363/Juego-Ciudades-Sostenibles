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
import {
  TOURNAMENT_STORE,
  type TournamentStore,
  type TournamentState,
  type TournamentMatch,
  type TournamentParticipant,
} from '../../domain/ports/tournament-store.port.js';
import type { GuessWhoCard } from '../../application/content-validators/guess-who.content-validator.js';
import { AnalyticsTrackerService } from '../../application/services/analytics-tracker.service.js';
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

/** Largo máximo de un mensaje de chat de sala; se recorta, no se rechaza. */
const MAX_CHAT_MESSAGE_LENGTH = 500;

/** Cupo máximo absoluto de una sala de torneo (modo grupo de "¿Quién Es?"). */
const TOURNAMENT_MAX_PARTICIPANTS = 10;

/** Vista pública del torneo que se envía a un participante dado. */
function toTournamentClientView(tournament: TournamentState, forUserId: string) {
  return {
    code: tournament.code,
    gameTitle: tournament.gameTitle,
    maxParticipants: tournament.maxParticipants,
    turnDurationSeconds: tournament.turnDurationSeconds,
    phase: tournament.phase,
    currentRound: tournament.currentRound,
    creatorUserId: tournament.creatorUserId,
    winnerUserId: tournament.winnerUserId,
    participants: tournament.participants.map((participant) => ({
      userId: participant.userId,
      displayName: participant.displayName,
      points: participant.points,
      eliminated: participant.eliminated,
      eliminatedAtRound: participant.eliminatedAtRound,
      isSelf: participant.userId === forUserId,
    })),
    // Rondas ya jugadas o en curso, para armar el ranking/progreso del
    // torneo en el cliente (pantalla de eliminado y pantalla de fin).
    rounds: buildRoundsSummary(tournament),
    // El match activo del participante que pide el estado (si tiene uno en
    // la ronda actual); null si fue eliminado, tuvo bye, o el torneo no
    // arrancó todavía.
    myMatch: findParticipantMatchView(tournament, forUserId),
  };
}

/** Resumen histórico de rondas: quién jugó contra quién y quién ganó, para el ranking del torneo. */
function buildRoundsSummary(tournament: TournamentState) {
  const rounds = new Map<number, TournamentMatch[]>();
  for (const match of tournament.matches) {
    const list = rounds.get(match.round) ?? [];
    list.push(match);
    rounds.set(match.round, list);
  }
  return [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, matches]) => ({
      round,
      matches: matches.map((match) => ({
        matchCode: match.matchCode,
        isBye: match.isBye,
        phase: match.phase,
        playerUserIds: match.playerUserIds,
        winnerUserId: match.winnerUserId,
      })),
    }));
}

/** Vista de sala 1v1 (mismo shape que toClientView) para el match activo de un participante del torneo. */
function findParticipantMatchView(tournament: TournamentState, forUserId: string) {
  const match = tournament.matches.find(
    (m) => m.round === tournament.currentRound && m.playerUserIds.includes(forUserId) && m.phase !== 'FINISHED',
  );
  if (!match) return null;
  return toMatchClientView(match, tournament, forUserId);
}

/** Vista pública de un match de torneo para un userId dado: oculta la carta secreta ajena. */
function toMatchClientView(match: TournamentMatch, tournament: TournamentState, forUserId: string) {
  return {
    matchCode: match.matchCode,
    round: match.round,
    isBye: match.isBye,
    gameTitle: tournament.gameTitle,
    cards: match.cards,
    maxAccusationCount: tournament.maxAccusationCount,
    turnDurationSeconds: tournament.turnDurationSeconds,
    phase: match.phase,
    winnerUserId: match.winnerUserId,
    activePlayerUserId: match.activePlayerUserId,
    turnDeadline: match.turnDeadline,
    players: match.players.map((player) => {
      const participant = tournament.participants.find((p) => p.userId === player.userId);
      return {
        userId: player.userId,
        displayName: participant?.displayName ?? '???',
        discardedCardIds: player.discardedCardIds,
        secretCardId: player.userId === forUserId ? player.secretCardId : null,
        isSelf: player.userId === forUserId,
      };
    }),
  };
}

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
      isHost: player.userId === room.hostUserId,
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

  /**
   * Timers de turno de matches de torneo, keyed por matchCode (namespaceado
   * bajo el código del torneo, ej. "AB12CD-R1-M2"). Separados de
   * `turnTimers` (salas 1v1 sueltas) porque un mismo código de sala 1v1
   * jamás debería colisionar con un matchCode de torneo, pero mantener los
   * mapas separados evita cualquier ambigüedad al limpiar timers.
   */
  private readonly tournamentTurnTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ROOM_STORE) private readonly roomStore: RoomStore,
    @Inject(TOURNAMENT_STORE) private readonly tournamentStore: TournamentStore,
    private readonly analyticsTracker: AnalyticsTrackerService,
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
    if (room) {
      this.clearTurnTimer(room.code);
      room.players = room.players.filter((player) => player.socketId !== socket.id);

      if (room.players.length === 0) {
        this.roomStore.delete(room.code);
      } else {
        room.phase = room.phase === 'FINISHED' ? room.phase : 'WAITING';
        room.activePlayerUserId = null;
        room.turnDeadline = null;
        this.roomStore.set(room);
        this.broadcastState(room);
      }
    }

    // La desconexión de un participante de torneo NO se trata como abandono
    // definitivo (no queremos eliminar a nadie por un refresh de página):
    // solo se actualiza el socketId guardado la próxima vez que ese userId
    // se reconecte a través de tournament:join / evento de match. Aquí solo
    // limpiamos el puntero de socket para no emitir a un socket muerto.
    const tournament = this.tournamentStore.findBySocketId(socket.id);
    if (tournament) {
      this.tournamentStore.set(tournament);
    }
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
      hostUserId: socket.data.userId,
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

    void this.analyticsTracker.track({
      type: 'room_created',
      userId: socket.data.userId,
      gameId: game.id,
      metadata: { mode: 'individual', turnDurationSeconds: room.turnDurationSeconds },
    });
  }

  /**
   * Resuelve un código a ciegas (el usuario solo tiene el código, no sabe si
   * es de una sala 1v1 o de un torneo grupal) para que el cliente sepa a qué
   * pantalla enrutar antes de intentar unirse.
   */
  @SubscribeMessage('room:resolve-code')
  handleResolveCode(@MessageBody() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    if (!code) throw new Error('Ingresa un código.');

    const room = this.roomStore.get(code);
    if (room) return { kind: 'room' as const, gameId: room.gameId, gameTitle: room.gameTitle };

    const tournament = this.tournamentStore.get(code);
    if (tournament) {
      return { kind: 'tournament' as const, gameId: tournament.gameId, gameTitle: tournament.gameTitle };
    }

    throw new Error('No existe ninguna sala con ese código.');
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
  handleStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds?: number },
  ) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (room.players.length !== 2) throw new Error('Se necesitan 2 jugadores para iniciar.');

    // El tiempo por turno se elige en la sala (no en la creación del
    // juego), así que cada partida puede tener su propio ritmo; si viene
    // fuera de rango o no llega, se conserva el valor con el que se creó
    // la sala (heredado de la configuración del juego). Solo el anfitrión
    // puede fijarlo — si quien se unió con el código manda un valor, se
    // ignora en vez de fallar, para no bloquear el inicio de la partida.
    if (body?.turnDurationSeconds !== undefined && socket.data.userId === room.hostUserId) {
      const { turnDurationSeconds } = body;
      if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
        throw new Error('Los segundos por turno deben ser un entero entre 5 y 120.');
      }
      room.turnDurationSeconds = turnDurationSeconds;
      this.roomStore.set(room);
    }

    this.startDealCountdown(room);
  }

  /**
   * Chat de texto de la sala 1v1: pensado para que los dos jugadores puedan
   * coordinarse sin llamada ni estar en persona. No se persiste en
   * RoomState ni en base de datos — es un simple relay en vivo a los
   * sockets de la sala, igual de efímero que el resto de la partida.
   */
  /**
   * El anfitrión ajusta los segundos por turno mientras espera al rival en
   * la sala (antes de room:start); se difunde en vivo para que el otro
   * jugador vea el valor actualizado sin esperar a que la partida arranque.
   */
  @SubscribeMessage('room:update-turn-duration')
  handleUpdateTurnDuration(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds: number },
  ) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (socket.data.userId !== room.hostUserId) {
      throw new Error('Solo quien creó la sala puede cambiar los segundos por turno.');
    }

    const { turnDurationSeconds } = body ?? {};
    if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
      throw new Error('Los segundos por turno deben ser un entero entre 5 y 120.');
    }

    room.turnDurationSeconds = turnDurationSeconds;
    this.roomStore.set(room);
    this.broadcastState(room);
  }

  @SubscribeMessage('room:chat')
  handleChat(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { text: string }) {
    const room = this.roomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');

    const sender = room.players.find((p) => p.socketId === socket.id);
    if (!sender) throw new Error('No estás en esta sala.');

    const text = body?.text?.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!text) return;

    this.server.to(room.code).emit('room:chat-message', {
      userId: sender.userId,
      displayName: sender.displayName,
      text,
      sentAt: Date.now(),
    });
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

    const correct = body.cardId === opponent.secretCardId;

    this.server.to(room.code).emit('room:accusation-result', {
      accuserUserId: accuser.userId,
      accuserName: accuser.displayName,
      correct,
    });

    if (!correct) {
      // Acusación fallida: el juego continúa, solo pasa el turno al rival.
      this.advanceTurn(room);
      return;
    }

    this.clearTurnTimer(room.code);
    room.phase = 'FINISHED';
    room.winnerUserId = accuser.userId;
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

  // ---------------------------------------------------------------------
  // Modo grupo (torneo eliminatorio): una sala de torneo agrupa N
  // jugadores, los empareja al azar por ronda en matches 1v1 que reutilizan
  // toda la mecánica de reparto/turnos/acusación de arriba, y hace avanzar
  // a los ganadores hasta que queda un solo jugador.
  // ---------------------------------------------------------------------

  @SubscribeMessage('tournament:create')
  async handleTournamentCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { gameId: string; maxParticipants: number },
  ) {
    const game = await this.gameRepository.findById(body.gameId);
    if (!game || game.gameType.getName() !== 'GUESS_WHO') {
      throw new Error('Juego no encontrado o no es de tipo "¿Quién Es?".');
    }

    const maxParticipants = body.maxParticipants;
    if (!Number.isInteger(maxParticipants) || maxParticipants < 2 || maxParticipants > TOURNAMENT_MAX_PARTICIPANTS) {
      throw new Error(`El cupo debe ser un entero entre 2 y ${TOURNAMENT_MAX_PARTICIPANTS}.`);
    }

    let code = generateRoomCode();
    while (this.tournamentStore.get(code)) {
      code = generateRoomCode();
    }

    const tournament: TournamentState = {
      code,
      gameId: game.id,
      gameTitle: game.title,
      maxParticipants,
      maxAccusationCount: (game.config.maxAccusationCount as number | undefined) ?? 6,
      turnDurationSeconds: (game.config.turnDurationSeconds as number | undefined) ?? 15,
      phase: 'WAITING',
      creatorUserId: socket.data.userId,
      currentRound: 0,
      matches: [],
      winnerUserId: null,
      createdAt: Date.now(),
      participants: [
        {
          socketId: socket.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          points: 0,
          eliminated: false,
          eliminatedAtRound: null,
        },
      ],
    };

    this.lastCreatedGameCards.set(game.id, game.content as GuessWhoCard[]);
    this.tournamentStore.create(tournament);
    socket.join(`tournament:${code}`);
    socket.emit('tournament:state', toTournamentClientView(tournament, socket.data.userId));

    void this.analyticsTracker.track({
      type: 'room_created',
      userId: socket.data.userId,
      gameId: game.id,
      metadata: { mode: 'group', maxParticipants, turnDurationSeconds: tournament.turnDurationSeconds },
    });
  }

  @SubscribeMessage('tournament:join')
  handleTournamentJoin(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { code: string },
  ) {
    const code = body.code?.trim().toUpperCase();
    const tournament = this.tournamentStore.get(code);
    if (!tournament) throw new Error('No existe una sala grupal con ese código.');
    if (tournament.phase !== 'WAITING') throw new Error('El torneo ya inició.');

    const existing = tournament.participants.find((p) => p.userId === socket.data.userId);
    if (existing) {
      existing.socketId = socket.id;
    } else {
      if (tournament.participants.length >= tournament.maxParticipants) {
        throw new Error('La sala ya alcanzó su cupo máximo.');
      }
      tournament.participants.push({
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        points: 0,
        eliminated: false,
        eliminatedAtRound: null,
      });
    }

    this.tournamentStore.set(tournament);
    socket.join(`tournament:${code}`);
    this.broadcastTournamentState(tournament);
  }

  /**
   * El creador ajusta los segundos por turno mientras espera participantes
   * en la sala grupal (antes de tournament:start); se difunde en vivo para
   * que el resto vea el valor actualizado, igual que en el modo individual.
   */
  @SubscribeMessage('tournament:update-turn-duration')
  handleTournamentUpdateTurnDuration(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds: number },
  ) {
    const tournament = this.tournamentStore.findBySocketId(socket.id);
    if (!tournament) throw new Error('No estás en ninguna sala grupal.');
    if (tournament.phase !== 'WAITING') throw new Error('El torneo ya inició.');
    if (tournament.creatorUserId !== socket.data.userId) {
      throw new Error('Solo quien creó la sala puede cambiar los segundos por turno.');
    }

    const { turnDurationSeconds } = body ?? {};
    if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
      throw new Error('Los segundos por turno deben ser un entero entre 5 y 120.');
    }

    tournament.turnDurationSeconds = turnDurationSeconds;
    this.broadcastTournamentState(tournament);
  }

  /**
   * Arranca la primera ronda del torneo. Requiere un número PAR de
   * participantes (2, 4, 6, 8 o 10) — no hace falta llegar al cupo
   * configurado, solo que el número actual sea par para poder emparejar a
   * todos sin dejar a nadie afuera desde el arranque.
   */
  @SubscribeMessage('tournament:start')
  handleTournamentStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds?: number },
  ) {
    const tournament = this.tournamentStore.findBySocketId(socket.id);
    if (!tournament) throw new Error('No estás en ninguna sala grupal.');
    if (tournament.creatorUserId !== socket.data.userId) {
      throw new Error('Solo quien creó la sala puede iniciar el torneo.');
    }
    if (tournament.phase !== 'WAITING') throw new Error('El torneo ya inició.');

    const count = tournament.participants.length;
    if (count < 2 || count % 2 !== 0) {
      throw new Error('Se necesita un número par de jugadores (2, 4, 6, 8 o 10) para iniciar.');
    }

    if (body?.turnDurationSeconds !== undefined) {
      const { turnDurationSeconds } = body;
      if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
        throw new Error('Los segundos por turno deben ser un entero entre 5 y 120.');
      }
      tournament.turnDurationSeconds = turnDurationSeconds;
    }

    tournament.phase = 'RUNNING';
    this.startTournamentRound(tournament, tournament.participants.map((p) => p.userId));
  }

  @SubscribeMessage('tournament:leave')
  handleTournamentLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    const tournament = this.tournamentStore.findBySocketId(socket.id);
    socket.leave(`tournament:${tournament?.code}`);
    if (!tournament) return;

    if (tournament.phase === 'WAITING') {
      tournament.participants = tournament.participants.filter((p) => p.socketId !== socket.id);
      if (tournament.participants.length === 0) {
        this.tournamentStore.delete(tournament.code);
        return;
      }
      this.tournamentStore.set(tournament);
      this.broadcastTournamentState(tournament);
    }
    // Si el torneo ya está RUNNING o FINISHED, no se elimina al participante
    // del estado (para no romper el ranking histórico); simplemente deja de
    // recibir eventos porque salió del room de socket.io.
  }

  /**
   * Empareja aleatoriamente a `userIds` para una nueva ronda: crea un match
   * 1v1 por pareja (con reparto inmediato de cartas) y, si el número de
   * jugadores es impar, le da un "bye" automático al último sobrante (avanza
   * sin jugar esa ronda).
   */
  private startTournamentRound(tournament: TournamentState, userIds: string[]) {
    tournament.currentRound += 1;
    const shuffledIds = shuffle(userIds);

    let byeUserId: string | null = null;
    if (shuffledIds.length % 2 !== 0) {
      byeUserId = shuffledIds.pop() ?? null;
    }

    const newMatches: TournamentMatch[] = [];
    for (let i = 0; i < shuffledIds.length; i += 2) {
      const [userIdA, userIdB] = [shuffledIds[i], shuffledIds[i + 1]];
      const matchCode = `${tournament.code}-R${tournament.currentRound}-M${newMatches.length + 1}`;
      const match = this.buildDealtMatch(tournament, matchCode, tournament.currentRound, [userIdA, userIdB]);
      newMatches.push(match);
    }

    if (byeUserId) {
      const participant = tournament.participants.find((p) => p.userId === byeUserId);
      if (participant) participant.points += 1;
      newMatches.push({
        matchCode: `${tournament.code}-R${tournament.currentRound}-BYE`,
        round: tournament.currentRound,
        playerUserIds: [byeUserId],
        isBye: true,
        phase: 'FINISHED',
        cards: [],
        players: [],
        winnerUserId: byeUserId,
        activePlayerUserId: null,
        turnDeadline: null,
      });
    }

    tournament.matches.push(...newMatches);
    this.tournamentStore.set(tournament);

    for (const match of newMatches) {
      if (match.isBye) continue;
      this.server.to(`tournament:${tournament.code}`).emit('tournament:pairing-announced', {
        round: tournament.currentRound,
        matchCode: match.matchCode,
        pairing: match.playerUserIds.map((userId) => ({
          userId,
          displayName: tournament.participants.find((p) => p.userId === userId)?.displayName ?? '???',
        })),
      });
      this.startTournamentMatchTurn(tournament, match, match.players[Math.floor(Math.random() * match.players.length)].userId);
    }

    this.broadcastTournamentState(tournament);
  }

  /** Baraja cartas y reparte un secreto a cada jugador de un match nuevo de torneo. */
  private buildDealtMatch(
    tournament: TournamentState,
    matchCode: string,
    round: number,
    playerUserIds: [string, string],
  ): TournamentMatch {
    const shuffled = shuffle(this.matchCardSource(tournament));
    return {
      matchCode,
      round,
      playerUserIds,
      isBye: false,
      phase: 'PLAYING',
      cards: shuffled,
      players: [
        { userId: playerUserIds[0], secretCardId: shuffled[0].cardId, discardedCardIds: [] },
        { userId: playerUserIds[1], secretCardId: shuffled[1].cardId, discardedCardIds: [] },
      ],
      winnerUserId: null,
      activePlayerUserId: null,
      turnDeadline: null,
    };
  }

  /** Set de cartas del torneo: se resuelve desde el juego una vez y se reutiliza (barajado distinto) por match. */
  private matchCardSource(tournament: TournamentState): GuessWhoCard[] {
    return this.lastCreatedGameCards.get(tournament.gameId) ?? [];
  }

  /**
   * Cache del set de cartas por gameId, poblado al crear el torneo (ver
   * handleTournamentCreate). Evita tener que volver a consultar el
   * repositorio de juegos por cada match nuevo de cada ronda.
   */
  private readonly lastCreatedGameCards = new Map<string, GuessWhoCard[]>();

  private startTournamentMatchTurn(tournament: TournamentState, match: TournamentMatch, userId: string) {
    match.activePlayerUserId = userId;
    match.turnDeadline = Date.now() + tournament.turnDurationSeconds * 1000;
    this.tournamentStore.set(tournament);
    this.broadcastMatchState(tournament, match);

    this.clearTournamentTurnTimer(match.matchCode);
    const timer = setTimeout(() => {
      const current = this.tournamentStore.get(tournament.code);
      const currentMatch = current?.matches.find((m) => m.matchCode === match.matchCode);
      if (!current || !currentMatch || currentMatch.phase !== 'PLAYING' || currentMatch.activePlayerUserId !== userId) {
        return;
      }
      this.advanceTournamentMatchTurn(current, currentMatch);
    }, tournament.turnDurationSeconds * 1000);
    this.tournamentTurnTimers.set(match.matchCode, timer);
  }

  private advanceTournamentMatchTurn(tournament: TournamentState, match: TournamentMatch) {
    const next = match.players.find((p) => p.userId !== match.activePlayerUserId);
    if (!next) return;
    this.startTournamentMatchTurn(tournament, match, next.userId);
  }

  private clearTournamentTurnTimer(matchCode: string) {
    const timer = this.tournamentTurnTimers.get(matchCode);
    if (timer) {
      clearTimeout(timer);
      this.tournamentTurnTimers.delete(matchCode);
    }
  }

  @SubscribeMessage('tournament:match-pass-turn')
  handleTournamentMatchPassTurn(@ConnectedSocket() socket: AuthenticatedSocket) {
    const { tournament, match } = this.requireActiveTournamentMatch(socket);
    const player = match.players.find((p) => p.userId === socket.data.userId);
    if (!player || player.userId !== match.activePlayerUserId) throw new Error('No es tu turno.');
    this.advanceTournamentMatchTurn(tournament, match);
  }

  @SubscribeMessage('tournament:match-discard')
  handleTournamentMatchDiscard(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { cardId: string },
  ) {
    const { tournament, match } = this.requireActiveTournamentMatch(socket);
    const player = match.players.find((p) => p.userId === socket.data.userId);
    if (!player) throw new Error('No estás en este match.');
    if (player.userId !== match.activePlayerUserId) throw new Error('No es tu turno.');

    if (!player.discardedCardIds.includes(body.cardId)) {
      player.discardedCardIds.push(body.cardId);
    }
    this.tournamentStore.set(tournament);
    this.broadcastMatchState(tournament, match);
  }

  @SubscribeMessage('tournament:match-accuse')
  handleTournamentMatchAccuse(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { cardId: string },
  ) {
    const { tournament, match } = this.requireActiveTournamentMatch(socket);
    const accuser = match.players.find((p) => p.userId === socket.data.userId);
    const opponent = match.players.find((p) => p.userId !== socket.data.userId);
    if (!accuser || !opponent) throw new Error('Falta el rival para acusar.');
    if (accuser.userId !== match.activePlayerUserId) throw new Error('No es tu turno.');

    const remaining = match.cards.length - accuser.discardedCardIds.length;
    if (remaining > tournament.maxAccusationCount) {
      throw new Error(`Solo puedes acusar con ${tournament.maxAccusationCount} cartas o menos en el tablero.`);
    }

    const correct = body.cardId === opponent.secretCardId;

    this.server.to(`tournament:${tournament.code}`).emit('tournament:match-accusation-result', {
      matchCode: match.matchCode,
      accuserUserId: accuser.userId,
      correct,
    });

    if (!correct) {
      // Acusación fallida: igual que en 1v1, el match continúa y solo pasa el turno.
      this.advanceTournamentMatchTurn(tournament, match);
      return;
    }

    this.clearTournamentTurnTimer(match.matchCode);
    match.phase = 'FINISHED';
    match.winnerUserId = accuser.userId;
    match.activePlayerUserId = null;
    match.turnDeadline = null;

    const winner = tournament.participants.find((p) => p.userId === accuser.userId);
    const loser = tournament.participants.find((p) => p.userId === opponent.userId);
    if (winner) winner.points += 1;
    if (loser) {
      loser.eliminated = true;
      loser.eliminatedAtRound = tournament.currentRound;
    }

    this.tournamentStore.set(tournament);
    this.broadcastMatchState(tournament, match);
    this.broadcastTournamentState(tournament);

    this.maybeAdvanceTournamentRound(tournament);
  }

  /**
   * Si todos los matches de la ronda actual ya terminaron, avanza el
   * torneo: si queda un solo jugador vivo, el torneo termina; si no,
   * reempareja a los ganadores (y a quien recibió bye) entre sí para la
   * siguiente ronda.
   */
  private maybeAdvanceTournamentRound(tournament: TournamentState) {
    const currentRoundMatches = tournament.matches.filter((m) => m.round === tournament.currentRound);
    const allFinished = currentRoundMatches.every((m) => m.phase === 'FINISHED');
    if (!allFinished) return;

    const advancing = tournament.participants.filter((p) => !p.eliminated).map((p) => p.userId);

    if (advancing.length <= 1) {
      tournament.phase = 'FINISHED';
      tournament.winnerUserId = advancing[0] ?? null;
      this.tournamentStore.set(tournament);
      this.broadcastTournamentState(tournament);
      return;
    }

    this.startTournamentRound(tournament, advancing);
  }

  private requireActiveTournamentMatch(socket: AuthenticatedSocket): {
    tournament: TournamentState;
    match: TournamentMatch;
  } {
    const tournament = this.tournamentStore.findBySocketId(socket.id);
    if (!tournament) throw new Error('No estás en ninguna sala grupal.');
    const match = tournament.matches.find(
      (m) => m.round === tournament.currentRound && m.playerUserIds.includes(socket.data.userId) && m.phase === 'PLAYING',
    );
    if (!match) throw new Error('No tienes una partida activa en esta ronda.');
    return { tournament, match };
  }

  private broadcastMatchState(tournament: TournamentState, match: TournamentMatch) {
    for (const userId of match.playerUserIds) {
      const participant = tournament.participants.find((p) => p.userId === userId);
      if (!participant) continue;
      this.server.to(participant.socketId).emit('tournament:match-state', toMatchClientView(match, tournament, userId));
    }
  }

  private broadcastTournamentState(tournament: TournamentState) {
    for (const participant of tournament.participants) {
      this.server
        .to(participant.socketId)
        .emit('tournament:state', toTournamentClientView(tournament, participant.userId));
    }
  }
}
