import { Inject, Logger, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import type { DominoConcept } from '../../application/content-validators/domino.content-validator.js';
import {
  DOMINO_ROOM_STORE,
  type DominoRoomStore,
  type DominoRoomState,
  type DominoTile,
  type DominoPlacedTile,
} from '../../domain/ports/domino-room-store.port.js';
import {
  SNAKES_LADDERS_ROOM_STORE,
  type SnakesLaddersRoomStore,
  type SnakesLaddersRoomState,
  type SnakesLaddersPendingChallenge,
} from '../../domain/ports/snakes-ladders-room-store.port.js';
import type {
  SnakesLaddersLink,
  SnakesLaddersQuestion,
  SnakesLaddersTriggerType,
} from '../../application/content-validators/snakes-ladders.content-validator.js';
import {
  DUAL_QUEST_ROOM_STORE,
  type DualQuestRoomStore,
  type DualQuestRoomState,
  type DualQuestDirection,
} from '../../domain/ports/dual-quest-room-store.port.js';
import type {
  DualQuestCellPosition,
  DualQuestFragmentGem,
  DualQuestRole,
  DualQuestTrigger,
} from '../../application/content-validators/dual-quest.content-validator.js';
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

/** Deltas de movimiento para el tick de Dúo Lógico. */
const DUAL_QUEST_DIRECTION_DELTAS: Record<DualQuestDirection, DualQuestCellPosition> = {
  UP: { row: -1, col: 0 },
  DOWN: { row: 1, col: 0 },
  LEFT: { row: 0, col: -1 },
  RIGHT: { row: 0, col: 1 },
};

/** Largo máximo de un mensaje de chat de sala; se recorta, no se rechaza. */
const MAX_CHAT_MESSAGE_LENGTH = 500;

/** Cupo máximo absoluto de una sala de torneo (modo grupo de "¿Quién Es?"). */
const TOURNAMENT_MAX_PARTICIPANTS = 10;

/**
 * Tarjetas mínimas que hay que descartar antes de poder acusar al rival —
 * reemplaza al viejo umbral basado en "cuántas quedan en el tablero"
 * (maxAccusationCount) por uno fijo y fácil de comunicar en el lobby: no
 * importa cuántas tarjetas tenga el juego, siempre son 3 descartes.
 */
const MIN_DISCARDS_BEFORE_ACCUSATION = 3;

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

/** Set completo para N conceptos: todas las combinaciones a<=b, N*(N+1)/2 fichas únicas. */
function generateDominoTiles(conceptCount: number): DominoTile[] {
  const tiles: DominoTile[] = [];
  for (let a = 0; a < conceptCount; a++) {
    for (let b = a; b < conceptCount; b++) {
      tiles.push({ id: `${a}-${b}`, a, b });
    }
  }
  return tiles;
}

/** true si `tile` tiene una mitad igual a `end` (o si el tablero está vacío, end===undefined). */
function dominoTileMatchesEnd(tile: DominoTile, end: number | undefined): boolean {
  if (end === undefined) return true;
  return tile.a === end || tile.b === end;
}

function dominoBoardEnds(board: DominoPlacedTile[]): { left: number | undefined; right: number | undefined } {
  return { left: board[0]?.left, right: board[board.length - 1]?.right };
}

function dominoHasValidMove(hand: DominoTile[], board: DominoPlacedTile[]): boolean {
  if (board.length === 0) return hand.length > 0;
  const { left, right } = dominoBoardEnds(board);
  return hand.some((tile) => dominoTileMatchesEnd(tile, left) || dominoTileMatchesEnd(tile, right));
}

/** Vista pública de la sala de dominó para un jugador dado: la mano ajena solo se ve como cantidad. */
function toDominoClientView(room: DominoRoomState, forSocketId: string) {
  return {
    code: room.code,
    gameTitle: room.gameTitle,
    concepts: room.concepts,
    handSize: room.handSize,
    turnDurationSeconds: room.turnDurationSeconds,
    phase: room.phase,
    board: room.board,
    boneyardCount: room.boneyard.length,
    winnerUserId: room.winnerUserId,
    endedByBlock: room.endedByBlock,
    activePlayerUserId: room.activePlayerUserId,
    turnDeadline: room.turnDeadline,
    players: room.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      handCount: player.hand.length,
      hand: player.socketId === forSocketId ? player.hand : null,
      isSelf: player.socketId === forSocketId,
      hasVotedRematch: room.rematchVotes[player.userId] !== undefined,
      isHost: player.userId === room.hostUserId,
    })),
  };
}

/**
 * Vista pública de una sala de Escaleras y Serpientes: nunca incluye
 * `correctOptionIndex` (eso solo vive en `room.questions`, del lado del
 * servidor) — si hay un reto pendiente, se manda su pregunta/opciones pero
 * jamás la respuesta correcta.
 */
function toSnakesLaddersClientView(room: SnakesLaddersRoomState, forSocketId: string) {
  const pendingQuestion = room.pendingChallenge
    ? room.questions.find(
        (q) => q.cellNumber === room.pendingChallenge!.cellNumber && q.triggerType === room.pendingChallenge!.triggerType,
      )
    : undefined;

  return {
    code: room.code,
    gameTitle: room.gameTitle,
    boardSize: room.boardSize,
    ladders: room.ladders,
    snakes: room.snakes,
    turnDurationSeconds: room.turnDurationSeconds,
    phase: room.phase,
    winnerUserId: room.winnerUserId,
    activePlayerUserId: room.activePlayerUserId,
    turnDeadline: room.turnDeadline,
    lastRoll: room.lastRoll,
    pendingChallenge:
      room.pendingChallenge && pendingQuestion
        ? {
            cellNumber: room.pendingChallenge.cellNumber,
            triggerType: room.pendingChallenge.triggerType,
            forUserId: room.pendingChallenge.forUserId,
            prompt: pendingQuestion.prompt,
            options: pendingQuestion.options,
            deadlineTs: room.pendingChallenge.deadlineTs,
          }
        : null,
    players: room.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      position: player.position,
      isSelf: player.socketId === forSocketId,
      isHost: player.userId === room.hostUserId,
      hasVotedRematch: room.rematchVotes[player.userId] !== undefined,
    })),
  };
}

/**
 * Vista pública de una sala de Dúo Lógico: nunca incluye
 * `correctOptionIndex` de los triggers QUESTION (solo vive en
 * `room.triggers`, del lado del servidor) — si hay una pregunta pendiente,
 * se manda su prompt/opciones pero jamás la respuesta correcta.
 */
function toDualQuestClientView(room: DualQuestRoomState, forSocketId: string) {
  const pendingTrigger = room.pendingQuestion
    ? room.triggers.find((t) => t.triggerId === room.pendingQuestion!.triggerId)
    : undefined;

  return {
    code: room.code,
    gameTitle: room.gameTitle,
    coreQuestion: room.coreQuestion,
    gridCols: room.gridCols,
    gridRows: room.gridRows,
    grid: room.grid,
    corePosition: room.corePosition,
    gates: room.gates,
    // Metadata segura de cada interruptor: dónde está y quién lo activa —
    // nunca `prompt`/`options`/`correctOptionIndex` (eso solo se revela vía
    // `pendingQuestion`, una vez que alguien lo activa de verdad).
    triggers: room.triggers.map((trigger) => ({
      triggerId: trigger.triggerId,
      kind: trigger.kind,
      activatedByRole: trigger.activatedByRole,
      switchPosition: trigger.switchPosition,
      gateId: trigger.gateId,
    })),
    phase: room.phase,
    bothAtCore: room.bothAtCore,
    collectedGemIds: room.collectedGemIds,
    // Nunca se manda `order` (la secuencia correcta) — solo lo necesario
    // para que el cliente sepa qué buscar y qué ya se recolectó.
    gems: room.fragmentGems.map((gem) => ({
      gemId: gem.gemId,
      role: gem.role,
      label: gem.label,
      position: gem.position,
      collected: room.collectedGemIds.includes(gem.gemId),
    })),
    canAssemble: room.bothAtCore && room.collectedGemIds.length === room.fragmentGems.length,
    pendingQuestion:
      room.pendingQuestion && pendingTrigger
        ? {
            triggerId: room.pendingQuestion.triggerId,
            forRole: room.pendingQuestion.forRole,
            prompt: pendingTrigger.prompt,
            options: pendingTrigger.options,
          }
        : null,
    players: room.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      role: player.role,
      position: player.position,
      isSelf: player.socketId === forSocketId,
      isHost: player.userId === room.hostUserId,
    })),
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
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
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

  /** Timers de turno de salas de dominó, mismo criterio que `turnTimers` para "¿Quién Es?". */
  private readonly dominoTurnTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Timers de Escaleras y Serpientes — un solo timer por sala que cubre TANTO
   * "el jugador activo no tiró el dado a tiempo" COMO "no respondió el reto
   * pendiente a tiempo" (se distingue en el callback por si `pendingChallenge`
   * existe). No hace falta un segundo mapa: en un momento dado una sala solo
   * puede estar esperando una tirada o una respuesta, nunca ambas.
   */
  private readonly snakesLaddersTurnTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Dúo Lógico no tiene turnos: los dos jugadores se mueven a la vez, en
   * tiempo real. Este mapa guarda el `setInterval` de "tick de movimiento"
   * de cada sala activa (uno cada ~150ms mientras `phase === 'PLAYING'`),
   * no un timeout de espera como los demás juegos.
   */
  private readonly dualQuestMovementTicks = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ROOM_STORE) private readonly roomStore: RoomStore,
    @Inject(TOURNAMENT_STORE) private readonly tournamentStore: TournamentStore,
    @Inject(DOMINO_ROOM_STORE) private readonly dominoRoomStore: DominoRoomStore,
    @Inject(SNAKES_LADDERS_ROOM_STORE) private readonly snakesLaddersRoomStore: SnakesLaddersRoomStore,
    @Inject(DUAL_QUEST_ROOM_STORE) private readonly dualQuestRoomStore: DualQuestRoomStore,
    private readonly analyticsTracker: AnalyticsTrackerService,
  ) {}

  /**
   * Autentica ANTES de aceptar la conexión, como middleware de Socket.IO
   * (no como `handleConnection`): un middleware de `server.use()` corre
   * durante el handshake y Socket.IO no deja pasar al cliente al evento
   * "connect" hasta que este `next()` se resuelve. Esto importa porque
   * `handleConnection` es async — con la autenticación ahí, el cliente veía
   * "connect" en su socket ANTES de que el server terminara de verificar el
   * JWT y buscar el usuario, dejando una ventana real en la que un mensaje
   * enviado de inmediato (room:create, room:join) se procesaba con
   * `socket.data.userId` todavía `undefined`. Como todo socket sin
   * autenticar tiene ese mismo `undefined`, dos jugadores conectando casi a
   * la vez podían "calzar" por username indefinido y uno terminaba pisando
   * la entrada del otro en la sala — la causa real detrás de los segundos
   * por turno que no se aplicaban y los avisos de turno con datos cruzados.
   */
  afterInit(server: Server) {
    server.use((socket: AuthenticatedSocket, next) => {
      this.authenticateSocket(socket)
        .then(() => next())
        .catch(() => next(new Error('No autenticado.')));
    });
  }

  private async authenticateSocket(socket: AuthenticatedSocket): Promise<void> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) throw new Error('No autenticado.');

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new Error('Usuario no encontrado.');

    socket.data.userId = payload.sub;
    socket.data.displayName = user.name.getFullName();
  }

  handleConnection() {
    // La autenticación ya corrió (y, si hubiera fallado, el socket ni
    // llega acá) en el middleware de `afterInit` — ver el comentario ahí.
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

    const dominoRoom = this.dominoRoomStore.findBySocketId(socket.id);
    if (dominoRoom) {
      this.clearDominoTurnTimer(dominoRoom.code);
      dominoRoom.players = dominoRoom.players.filter((player) => player.socketId !== socket.id);

      if (dominoRoom.players.length === 0) {
        this.dominoRoomStore.delete(dominoRoom.code);
      } else {
        dominoRoom.phase = dominoRoom.phase === 'FINISHED' ? dominoRoom.phase : 'WAITING';
        dominoRoom.activePlayerUserId = null;
        dominoRoom.turnDeadline = null;
        this.dominoRoomStore.set(dominoRoom);
        this.broadcastDominoState(dominoRoom);
      }
    }

    const snakesLaddersRoom = this.snakesLaddersRoomStore.findBySocketId(socket.id);
    if (snakesLaddersRoom) {
      this.clearSnakesLaddersTurnTimer(snakesLaddersRoom.code);
      snakesLaddersRoom.players = snakesLaddersRoom.players.filter((player) => player.socketId !== socket.id);

      if (snakesLaddersRoom.players.length === 0) {
        this.snakesLaddersRoomStore.delete(snakesLaddersRoom.code);
      } else {
        snakesLaddersRoom.phase = snakesLaddersRoom.phase === 'FINISHED' ? snakesLaddersRoom.phase : 'WAITING';
        snakesLaddersRoom.activePlayerUserId = null;
        snakesLaddersRoom.turnDeadline = null;
        snakesLaddersRoom.pendingChallenge = null;
        this.snakesLaddersRoomStore.set(snakesLaddersRoom);
        this.broadcastSnakesLaddersState(snakesLaddersRoom);
      }
    }

    const dualQuestRoom = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (dualQuestRoom) {
      this.clearDualQuestMovementTick(dualQuestRoom.code);
      dualQuestRoom.players = dualQuestRoom.players.filter((player) => player.socketId !== socket.id);

      if (dualQuestRoom.players.length === 0) {
        this.dualQuestRoomStore.delete(dualQuestRoom.code);
      } else {
        dualQuestRoom.phase = dualQuestRoom.phase === 'FINISHED' ? dualQuestRoom.phase : 'WAITING';
        dualQuestRoom.pendingQuestion = null;
        this.dualQuestRoomStore.set(dualQuestRoom);
        this.broadcastDualQuestState(dualQuestRoom);
      }
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

    const dominoRoom = this.dominoRoomStore.get(code);
    if (dominoRoom) {
      return { kind: 'domino' as const, gameId: dominoRoom.gameId, gameTitle: dominoRoom.gameTitle };
    }

    const snakesLaddersRoom = this.snakesLaddersRoomStore.get(code);
    if (snakesLaddersRoom) {
      return {
        kind: 'snakes-ladders' as const,
        gameId: snakesLaddersRoom.gameId,
        gameTitle: snakesLaddersRoom.gameTitle,
      };
    }

    const dualQuestRoom = this.dualQuestRoomStore.get(code);
    if (dualQuestRoom) {
      return { kind: 'dual-quest' as const, gameId: dualQuestRoom.gameId, gameTitle: dualQuestRoom.gameTitle };
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
    if (accuser.discardedCardIds.length < MIN_DISCARDS_BEFORE_ACCUSATION) {
      throw new Error(`Debes descartar al menos ${MIN_DISCARDS_BEFORE_ACCUSATION} tarjetas antes de acusar.`);
    }

    const correct = body.cardId === opponent.secretCardId;

    this.server.to(room.code).emit('room:accusation-result', {
      accuserUserId: accuser.userId,
      accuserName: accuser.displayName,
      // A quién le pertenecía la carta que se intentó adivinar (el rival del
      // acusador), para que el cliente arme el mensaje sin tener que
      // adivinar de qué lado de la sala está mirando.
      targetUserId: opponent.userId,
      targetName: opponent.displayName,
      cardId: body.cardId,
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
    if (accuser.discardedCardIds.length < MIN_DISCARDS_BEFORE_ACCUSATION) {
      throw new Error(`Debes descartar al menos ${MIN_DISCARDS_BEFORE_ACCUSATION} tarjetas antes de acusar.`);
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

  // ---------------------------------------------------------------------
  // Dominó 1v1 en tiempo real: mismo patrón de sala/turnos/timers que
  // "¿Quién Es?" arriba, pero el contenido es un set de fichas generado a
  // partir de los conceptos publicados (game.content) en vez de cartas —
  // nada de tiles hardcodeadas, todo sale del juego guardado.
  // ---------------------------------------------------------------------

  @SubscribeMessage('domino:create')
  async handleDominoCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { gameId: string },
  ) {
    const game = await this.gameRepository.findById(body.gameId);
    if (!game || game.gameType.getName() !== 'DOMINO') {
      throw new Error('Juego no encontrado o no es de tipo Dominó.');
    }

    let code = generateRoomCode();
    while (this.dominoRoomStore.get(code)) {
      code = generateRoomCode();
    }

    const room: DominoRoomState = {
      code,
      gameId: game.id,
      gameTitle: game.title,
      concepts: game.content as DominoConcept[],
      handSize: (game.config.handSize as number | undefined) ?? 7,
      hostUserId: socket.data.userId,
      turnDurationSeconds: (game.config.turnDurationSeconds as number | undefined) ?? 20,
      phase: 'WAITING',
      players: [
        {
          socketId: socket.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          hand: [],
        },
      ],
      boneyard: [],
      board: [],
      activePlayerUserId: null,
      turnDeadline: null,
      winnerUserId: null,
      endedByBlock: false,
      createdAt: Date.now(),
      rematchVotes: {},
      consecutivePasses: 0,
    };

    this.dominoRoomStore.create(room);
    socket.join(`domino:${code}`);
    socket.emit('domino:state', toDominoClientView(room, socket.id));

    void this.analyticsTracker.track({
      type: 'room_created',
      userId: socket.data.userId,
      gameId: game.id,
      metadata: { mode: 'domino', turnDurationSeconds: room.turnDurationSeconds },
    });
  }

  @SubscribeMessage('domino:join')
  handleDominoJoin(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    const room = this.dominoRoomStore.get(code);

    if (!room) throw new Error('No existe una sala de dominó con ese código.');
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
        hand: [],
      });
    }

    this.dominoRoomStore.set(room);
    socket.join(`domino:${code}`);
    this.broadcastDominoState(room);
  }

  @SubscribeMessage('domino:start')
  handleDominoStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds?: number },
  ) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (room.players.length !== 2) throw new Error('Se necesitan 2 jugadores para iniciar.');

    // Igual que en "¿Quién Es?": solo el anfitrión puede fijar el tiempo por
    // turno; si el otro jugador manda un valor al iniciar, se ignora en vez
    // de bloquear el arranque de la partida.
    if (body?.turnDurationSeconds !== undefined && socket.data.userId === room.hostUserId) {
      const { turnDurationSeconds } = body;
      if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 5 || turnDurationSeconds > 120) {
        throw new Error('Los segundos por turno deben ser un entero entre 5 y 120.');
      }
      room.turnDurationSeconds = turnDurationSeconds;
      this.dominoRoomStore.set(room);
    }

    this.startDominoDealCountdown(room);
  }

  @SubscribeMessage('domino:update-turn-duration')
  handleDominoUpdateTurnDuration(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds: number },
  ) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
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
    this.dominoRoomStore.set(room);
    this.broadcastDominoState(room);
  }

  private startDominoDealCountdown(room: DominoRoomState) {
    this.server.to(`domino:${room.code}`).emit('domino:dealing', { countdownMs: DEAL_COUNTDOWN_MS });
    setTimeout(() => {
      const current = this.dominoRoomStore.get(room.code);
      if (!current || current.players.length !== 2) return;
      this.dealNewDominoGame(current);
    }, DEAL_COUNTDOWN_MS);
  }

  /** Genera el set completo desde los conceptos publicados, baraja y reparte `handSize` fichas a cada jugador. */
  private dealNewDominoGame(room: DominoRoomState) {
    const shuffled = shuffle(generateDominoTiles(room.concepts.length));
    const handSize = Math.min(room.handSize, Math.floor(shuffled.length / 2));

    room.players[0].hand = shuffled.slice(0, handSize);
    room.players[1].hand = shuffled.slice(handSize, handSize * 2);
    room.boneyard = shuffled.slice(handSize * 2);
    room.board = [];
    room.phase = 'PLAYING';
    room.winnerUserId = null;
    room.endedByBlock = false;
    room.rematchVotes = {};
    room.consecutivePasses = 0;

    const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    this.setActiveDominoTurn(room, firstPlayer.userId);
  }

  /** Coloca una ficha de la mano propia en un extremo del tablero. */
  @SubscribeMessage('domino:play')
  handleDominoPlay(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { tileId: string; side: 'left' | 'right' },
  ) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');
    if (player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');

    const tile = player.hand.find((t) => t.id === body.tileId);
    if (!tile) throw new Error('Esa ficha no está en tu mano.');

    const { left, right } = dominoBoardEnds(room.board);
    let placed: DominoPlacedTile;

    if (room.board.length === 0) {
      placed = { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b, placedByUserId: player.userId };
      room.board = [placed];
    } else if (body.side === 'right') {
      if (!dominoTileMatchesEnd(tile, right)) throw new Error('Esa ficha no encaja en ese extremo.');
      placed =
        tile.a === right
          ? { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b, placedByUserId: player.userId }
          : { id: tile.id, left: tile.b, right: tile.a, isDouble: tile.a === tile.b, placedByUserId: player.userId };
      room.board = [...room.board, placed];
    } else {
      if (!dominoTileMatchesEnd(tile, left)) throw new Error('Esa ficha no encaja en ese extremo.');
      placed =
        tile.a === left
          ? { id: tile.id, left: tile.b, right: tile.a, isDouble: tile.a === tile.b, placedByUserId: player.userId }
          : { id: tile.id, left: tile.a, right: tile.b, isDouble: tile.a === tile.b, placedByUserId: player.userId };
      room.board = [placed, ...room.board];
    }

    player.hand = player.hand.filter((t) => t.id !== tile.id);
    room.consecutivePasses = 0;

    if (player.hand.length === 0) {
      this.finishDominoGame(room, player.userId, false);
      return;
    }

    this.advanceDominoTurn(room);
  }

  /** Roba una ficha del pozo — solo válido si el jugador activo no tiene ninguna jugada posible. */
  @SubscribeMessage('domino:draw')
  handleDominoDraw(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');
    if (player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');
    if (room.boneyard.length === 0) throw new Error('El pozo está vacío.');
    if (dominoHasValidMove(player.hand, room.board)) {
      throw new Error('Ya tienes una jugada posible, no puedes robar.');
    }

    const [drawn, ...rest] = room.boneyard;
    player.hand = [...player.hand, drawn];
    room.boneyard = rest;

    this.dominoRoomStore.set(room);
    this.broadcastDominoState(room);
  }

  /** Pasa el turno — solo válido si no hay jugada posible y el pozo ya está vacío. */
  @SubscribeMessage('domino:pass')
  handleDominoPass(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');
    if (player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');
    if (room.boneyard.length > 0) throw new Error('Todavía puedes robar del pozo.');
    if (dominoHasValidMove(player.hand, room.board)) {
      throw new Error('Tienes una jugada posible, no puedes pasar.');
    }

    room.consecutivePasses += 1;

    // Ambos jugadores pasaron seguido sin poder jugar y sin pozo: la partida
    // está bloqueada. Gana quien tenga menos fichas en la mano; empate si
    // ambos tienen la misma cantidad (no hay ganador).
    if (room.consecutivePasses >= 2) {
      const [a, b] = room.players;
      const winnerUserId =
        a.hand.length === b.hand.length ? null : a.hand.length < b.hand.length ? a.userId : b.userId;
      this.finishDominoGame(room, winnerUserId, true);
      return;
    }

    this.advanceDominoTurn(room);
  }

  @SubscribeMessage('domino:rematch-vote')
  handleDominoRematchVote(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { accept: boolean },
  ) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'FINISHED') throw new Error('No hay una partida terminada para votar revancha.');

    const voter = room.players.find((p) => p.socketId === socket.id);
    if (!voter) throw new Error('No estás en esta sala.');

    room.rematchVotes[voter.userId] = body.accept;

    if (body.accept === false) {
      const opponent = room.players.find((p) => p.userId !== voter.userId);
      if (opponent) {
        this.server.to(opponent.socketId).emit('domino:rematch-rejected', {
          message: `${voter.displayName} no quiso seguir jugando.`,
        });
      }
      this.dominoRoomStore.delete(room.code);
      return;
    }

    const allAccepted =
      room.players.length === 2 && room.players.every((p) => room.rematchVotes[p.userId] === true);

    if (allAccepted) {
      this.startDominoDealCountdown(room);
      return;
    }

    this.dominoRoomStore.set(room);
    this.broadcastDominoState(room);
  }

  @SubscribeMessage('domino:leave')
  handleDominoLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.dominoRoomStore.findBySocketId(socket.id);
    if (room?.phase === 'FINISHED') {
      const player = room.players.find((candidate) => candidate.socketId === socket.id);
      const opponent = room.players.find((candidate) => candidate.socketId !== socket.id);
      if (player && opponent) {
        this.server.to(opponent.socketId).emit('domino:opponent-left', {
          message: `${player.displayName} no quiso seguir jugando.`,
        });
      }
    }
    this.handleDisconnect(socket);
    socket.disconnect();
  }

  private finishDominoGame(room: DominoRoomState, winnerUserId: string | null, endedByBlock: boolean) {
    this.clearDominoTurnTimer(room.code);
    room.phase = 'FINISHED';
    room.winnerUserId = winnerUserId;
    room.endedByBlock = endedByBlock;
    room.rematchVotes = {};
    room.activePlayerUserId = null;
    room.turnDeadline = null;

    this.dominoRoomStore.set(room);
    this.broadcastDominoState(room);
  }

  private setActiveDominoTurn(room: DominoRoomState, userId: string) {
    room.activePlayerUserId = userId;
    room.turnDeadline = Date.now() + room.turnDurationSeconds * 1000;

    this.dominoRoomStore.set(room);
    this.broadcastDominoState(room);

    this.clearDominoTurnTimer(room.code);
    const timer = setTimeout(() => {
      const current = this.dominoRoomStore.get(room.code);
      if (!current || current.phase !== 'PLAYING' || current.activePlayerUserId !== userId) return;
      // Si nadie actúa a tiempo, el servidor decide por el jugador inactivo:
      // pasa si no tiene jugada posible y no hay pozo, o roba/pasa según
      // corresponda, para que la partida nunca quede colgada esperando.
      const player = current.players.find((p) => p.userId === userId);
      if (player && current.boneyard.length > 0 && !dominoHasValidMove(player.hand, current.board)) {
        const [drawn, ...rest] = current.boneyard;
        player.hand = [...player.hand, drawn];
        current.boneyard = rest;
        this.dominoRoomStore.set(current);
        this.broadcastDominoState(current);
        return;
      }
      this.advanceDominoTurn(current);
    }, room.turnDurationSeconds * 1000);
    this.dominoTurnTimers.set(room.code, timer);
  }

  private advanceDominoTurn(room: DominoRoomState) {
    const next = room.players.find((p) => p.userId !== room.activePlayerUserId);
    if (!next) return;
    this.setActiveDominoTurn(room, next.userId);
  }

  private clearDominoTurnTimer(code: string) {
    const timer = this.dominoTurnTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.dominoTurnTimers.delete(code);
    }
  }

  private broadcastDominoState(room: DominoRoomState) {
    for (const player of room.players) {
      this.server.to(player.socketId).emit('domino:state', toDominoClientView(room, player.socketId));
    }
  }

  // ---------------------------------------------------------------------
  // Escaleras y Serpientes: sala en tiempo real de 2 a 4 jugadores. Mismo
  // patrón de sala/turnos/timers que Dominó, generalizado a N jugadores
  // (rotación circular sobre `room.players` en vez de "el otro"). El dado y
  // la corrección de las respuestas SIEMPRE corren en el servidor — nunca se
  // confía en el cliente para ninguno de los dos, así se evita hacer trampa.
  // ---------------------------------------------------------------------

  private static readonly SNAKES_LADDERS_MIN_PLAYERS = 2;
  private static readonly SNAKES_LADDERS_MAX_PLAYERS = 4;

  @SubscribeMessage('snakes-ladders:create')
  async handleSnakesLaddersCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { gameId: string },
  ) {
    const game = await this.gameRepository.findById(body.gameId);
    if (!game || game.gameType.getName() !== 'SNAKES_LADDERS') {
      throw new Error('Juego no encontrado o no es de tipo Escaleras y Serpientes.');
    }

    let code = generateRoomCode();
    while (this.snakesLaddersRoomStore.get(code)) {
      code = generateRoomCode();
    }

    const room: SnakesLaddersRoomState = {
      code,
      gameId: game.id,
      gameTitle: game.title,
      boardSize: game.config.boardSize as number,
      ladders: game.config.ladders as SnakesLaddersLink[],
      snakes: game.config.snakes as SnakesLaddersLink[],
      questions: game.content as SnakesLaddersQuestion[],
      hostUserId: socket.data.userId,
      turnDurationSeconds: (game.config.turnDurationSeconds as number | undefined) ?? 45,
      phase: 'WAITING',
      players: [
        {
          socketId: socket.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          position: 1,
        },
      ],
      activePlayerUserId: null,
      turnDeadline: null,
      winnerUserId: null,
      pendingChallenge: null,
      lastRoll: null,
      createdAt: Date.now(),
      rematchVotes: {},
    };

    this.snakesLaddersRoomStore.create(room);
    socket.join(`snakes-ladders:${code}`);
    socket.emit('snakes-ladders:state', toSnakesLaddersClientView(room, socket.id));

    void this.analyticsTracker.track({
      type: 'room_created',
      userId: socket.data.userId,
      gameId: game.id,
      metadata: { mode: 'snakes-ladders', turnDurationSeconds: room.turnDurationSeconds },
    });
  }

  @SubscribeMessage('snakes-ladders:join')
  handleSnakesLaddersJoin(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    const room = this.snakesLaddersRoomStore.get(code);

    if (!room) throw new Error('No existe una sala de Escaleras y Serpientes con ese código.');

    const existing = room.players.find((player) => player.userId === socket.data.userId);
    if (!existing && room.players.length >= RoomsGateway.SNAKES_LADDERS_MAX_PLAYERS) {
      throw new Error('La sala ya está llena.');
    }

    if (existing) {
      existing.socketId = socket.id;
    } else {
      room.players.push({
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        position: 1,
      });
    }

    this.snakesLaddersRoomStore.set(room);
    socket.join(`snakes-ladders:${code}`);
    this.broadcastSnakesLaddersState(room);
  }

  @SubscribeMessage('snakes-ladders:start')
  handleSnakesLaddersStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { turnDurationSeconds?: number },
  ) {
    const room = this.snakesLaddersRoomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (
      room.players.length < RoomsGateway.SNAKES_LADDERS_MIN_PLAYERS ||
      room.players.length > RoomsGateway.SNAKES_LADDERS_MAX_PLAYERS
    ) {
      throw new Error('Se necesitan entre 2 y 4 jugadores para iniciar.');
    }

    if (body?.turnDurationSeconds !== undefined && socket.data.userId === room.hostUserId) {
      const { turnDurationSeconds } = body;
      if (!Number.isInteger(turnDurationSeconds) || turnDurationSeconds < 15 || turnDurationSeconds > 180) {
        throw new Error('Los segundos por turno deben ser un entero entre 15 y 180.');
      }
      room.turnDurationSeconds = turnDurationSeconds;
    }

    for (const player of room.players) player.position = 1;
    room.phase = 'PLAYING';
    room.winnerUserId = null;
    room.pendingChallenge = null;
    room.lastRoll = null;
    room.rematchVotes = {};

    const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    this.setActiveSnakesLaddersTurn(room, firstPlayer.userId);
  }

  /** El servidor tira el dado — nunca el cliente, así nadie puede manipular el resultado. */
  @SubscribeMessage('snakes-ladders:roll-dice')
  handleSnakesLaddersRoll(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.snakesLaddersRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');
    if (player.userId !== room.activePlayerUserId) throw new Error('No es tu turno.');
    if (room.pendingChallenge) throw new Error('Primero hay que resolver el reto pendiente.');

    const roll = 1 + Math.floor(Math.random() * 6);
    room.lastRoll = roll;
    const previousPosition = player.position;
    const rolledTo = player.position + roll;

    if (rolledTo >= room.boardSize) {
      player.position = room.boardSize;
      this.finishSnakesLaddersGame(room, player.userId);
      return;
    }

    player.position = rolledTo;

    const ladder = room.ladders.find((l) => l.from === rolledTo);
    const snake = room.snakes.find((s) => s.from === rolledTo);
    const triggerType: SnakesLaddersTriggerType | null = ladder ? 'LADDER' : snake ? 'SNAKE' : 'CELL';
    const question = room.questions.find((q) => q.cellNumber === rolledTo && q.triggerType === triggerType);

    if (!question) {
      // Casilla libre: nada que responder, el turno avanza directo.
      this.clearSnakesLaddersTurnTimer(room.code);
      this.snakesLaddersRoomStore.set(room);
      this.broadcastSnakesLaddersState(room);
      this.advanceSnakesLaddersTurn(room);
      return;
    }

    room.pendingChallenge = {
      cellNumber: rolledTo,
      triggerType: triggerType!,
      forUserId: player.userId,
      previousPosition,
      deadlineTs: Date.now() + room.turnDurationSeconds * 1000,
    };

    this.snakesLaddersRoomStore.set(room);
    this.broadcastSnakesLaddersState(room);
    this.armSnakesLaddersChallengeTimer(room);
  }

  @SubscribeMessage('snakes-ladders:answer-challenge')
  handleSnakesLaddersAnswer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { optionIndex: number },
  ) {
    const room = this.snakesLaddersRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING' || !room.pendingChallenge) {
      throw new Error('No hay ningún reto pendiente.');
    }
    if (room.pendingChallenge.forUserId !== socket.data.userId) {
      throw new Error('Este reto no es tuyo.');
    }

    this.resolveSnakesLaddersChallenge(room, body.optionIndex);
  }

  /**
   * Corrige la respuesta contra `room.questions` (nunca contra algo que
   * mande el cliente) y aplica la regla de negocio exacta según el tipo de
   * casilla: normal (falla → vuelve a `previousPosition`), escalera (acierta
   * → sube; falla → se queda en la base) y serpiente (acierta → se queda;
   * falla → baja). `optionIndex` en `null` (usado por el timeout) siempre
   * cuenta como fallo, sin lanzar por índice inválido.
   */
  private resolveSnakesLaddersChallenge(room: SnakesLaddersRoomState, optionIndex: number | null) {
    const pending = room.pendingChallenge as SnakesLaddersPendingChallenge;
    const player = room.players.find((p) => p.userId === pending.forUserId);
    if (!player) return;

    const question = room.questions.find(
      (q) => q.cellNumber === pending.cellNumber && q.triggerType === pending.triggerType,
    );
    const correct = question !== undefined && optionIndex === question.correctOptionIndex;

    if (pending.triggerType === 'CELL') {
      if (!correct) player.position = pending.previousPosition;
    } else if (pending.triggerType === 'LADDER') {
      const ladder = room.ladders.find((l) => l.from === pending.cellNumber);
      if (correct && ladder) player.position = ladder.to;
      // Falla: se queda en la base (pending.cellNumber), ya es su posición actual.
    } else {
      const snake = room.snakes.find((s) => s.from === pending.cellNumber);
      if (!correct && snake) player.position = snake.to;
      // Acierta: evita la caída, se queda en pending.cellNumber.
    }

    this.clearSnakesLaddersTurnTimer(room.code);
    room.pendingChallenge = null;

    this.server.to(`snakes-ladders:${room.code}`).emit('snakes-ladders:challenge-result', {
      userId: player.userId,
      correct,
      correctOptionIndex: question?.correctOptionIndex ?? null,
      position: player.position,
    });

    if (player.position >= room.boardSize) {
      this.finishSnakesLaddersGame(room, player.userId);
      return;
    }

    this.snakesLaddersRoomStore.set(room);
    this.broadcastSnakesLaddersState(room);
    this.advanceSnakesLaddersTurn(room);
  }

  @SubscribeMessage('snakes-ladders:rematch-vote')
  handleSnakesLaddersRematchVote(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { accept: boolean },
  ) {
    const room = this.snakesLaddersRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'FINISHED') throw new Error('No hay una partida terminada para votar revancha.');

    const voter = room.players.find((p) => p.socketId === socket.id);
    if (!voter) throw new Error('No estás en esta sala.');

    room.rematchVotes[voter.userId] = body.accept;

    if (body.accept === false) {
      for (const other of room.players) {
        if (other.userId === voter.userId) continue;
        this.server.to(other.socketId).emit('snakes-ladders:rematch-rejected', {
          message: `${voter.displayName} no quiso seguir jugando.`,
        });
      }
      this.snakesLaddersRoomStore.delete(room.code);
      return;
    }

    const allAccepted =
      room.players.length >= RoomsGateway.SNAKES_LADDERS_MIN_PLAYERS &&
      room.players.every((p) => room.rematchVotes[p.userId] === true);

    if (allAccepted) {
      for (const player of room.players) player.position = 1;
      room.phase = 'PLAYING';
      room.winnerUserId = null;
      room.pendingChallenge = null;
      room.lastRoll = null;
      room.rematchVotes = {};
      const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
      this.setActiveSnakesLaddersTurn(room, firstPlayer.userId);
      return;
    }

    this.snakesLaddersRoomStore.set(room);
    this.broadcastSnakesLaddersState(room);
  }

  @SubscribeMessage('snakes-ladders:leave')
  handleSnakesLaddersLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    this.handleDisconnect(socket);
    socket.disconnect();
  }

  private finishSnakesLaddersGame(room: SnakesLaddersRoomState, winnerUserId: string) {
    this.clearSnakesLaddersTurnTimer(room.code);
    room.phase = 'FINISHED';
    room.winnerUserId = winnerUserId;
    room.pendingChallenge = null;
    room.activePlayerUserId = null;
    room.turnDeadline = null;
    room.rematchVotes = {};

    this.snakesLaddersRoomStore.set(room);
    this.broadcastSnakesLaddersState(room);
  }

  /** Pone a `userId` a esperar su tirada de dado y arma el timer de "no tiró a tiempo" — `armSnakesLaddersChallengeTimer` arma el otro timer, el de "no respondió a tiempo". */
  private setActiveSnakesLaddersTurn(room: SnakesLaddersRoomState, userId: string) {
    room.activePlayerUserId = userId;
    room.pendingChallenge = null;
    room.turnDeadline = Date.now() + room.turnDurationSeconds * 1000;

    this.snakesLaddersRoomStore.set(room);
    this.broadcastSnakesLaddersState(room);

    this.clearSnakesLaddersTurnTimer(room.code);
    const timer = setTimeout(() => {
      const current = this.snakesLaddersRoomStore.get(room.code);
      if (!current || current.phase !== 'PLAYING' || current.activePlayerUserId !== userId) return;
      if (current.pendingChallenge) return; // ya tiró y está esperando respuesta — ver armSnakesLaddersChallengeTimer
      // Nadie tiró a tiempo: el servidor pasa el turno sin mover a nadie,
      // para que la partida nunca quede colgada.
      this.advanceSnakesLaddersTurn(current);
    }, room.turnDurationSeconds * 1000);
    this.snakesLaddersTurnTimers.set(room.code, timer);
  }

  /** Arma el timer de "esperando respuesta al reto" — si vence, cuenta como fallo automático (mismo criterio que Dominó: el servidor nunca deja la partida colgada). */
  private armSnakesLaddersChallengeTimer(room: SnakesLaddersRoomState) {
    this.clearSnakesLaddersTurnTimer(room.code);
    const timer = setTimeout(() => {
      const current = this.snakesLaddersRoomStore.get(room.code);
      if (!current || current.phase !== 'PLAYING' || !current.pendingChallenge) return;
      this.resolveSnakesLaddersChallenge(current, null);
    }, room.turnDurationSeconds * 1000);
    this.snakesLaddersTurnTimers.set(room.code, timer);
  }

  /** Rotación circular sobre `room.players` — a diferencia de Dominó (siempre "el otro"), acá puede haber hasta 4. */
  private advanceSnakesLaddersTurn(room: SnakesLaddersRoomState) {
    const currentIndex = room.players.findIndex((p) => p.userId === room.activePlayerUserId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % room.players.length;
    const next = room.players[nextIndex];
    if (!next) return;
    this.setActiveSnakesLaddersTurn(room, next.userId);
  }

  private clearSnakesLaddersTurnTimer(code: string) {
    const timer = this.snakesLaddersTurnTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.snakesLaddersTurnTimers.delete(code);
    }
  }

  private broadcastSnakesLaddersState(room: SnakesLaddersRoomState) {
    for (const player of room.players) {
      this.server
        .to(player.socketId)
        .emit('snakes-ladders:state', toSnakesLaddersClientView(room, player.socketId));
    }
  }

  // ---------------------------------------------------------------------
  // Dúo Lógico: sala cooperativa de exactamente 2 jugadores (FIRE y WATER)
  // moviéndose en tiempo real sobre una cuadrícula compartida — a
  // diferencia de todos los juegos anteriores (por turnos), acá el
  // servidor corre un tick continuo por sala que mueve a ambos jugadores
  // a la vez. La Fase 3 agrega la recolección de gemas y el ensamblaje
  // final sobre esta misma sala.
  // ---------------------------------------------------------------------

  private static readonly DUAL_QUEST_TICK_MS = 150;

  @SubscribeMessage('dual-quest:create')
  async handleDualQuestCreate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { gameId: string; role?: DualQuestRole },
  ) {
    const game = await this.gameRepository.findById(body.gameId);
    if (!game || game.gameType.getName() !== 'DUAL_QUEST') {
      throw new Error('Juego no encontrado o no es de tipo Dúo Lógico.');
    }

    let code = generateRoomCode();
    while (this.dualQuestRoomStore.get(code)) {
      code = generateRoomCode();
    }

    const role: DualQuestRole = body.role === 'WATER' ? 'WATER' : 'FIRE';
    const startPosition = role === 'FIRE' ? (game.config.fireStart as DualQuestCellPosition) : (game.config.waterStart as DualQuestCellPosition);

    const room: DualQuestRoomState = {
      code,
      gameId: game.id,
      gameTitle: game.title,
      coreQuestion: game.config.coreQuestion as string,
      gridCols: game.config.gridCols as number,
      gridRows: game.config.gridRows as number,
      grid: game.config.grid as number[][],
      fireStart: game.config.fireStart as DualQuestCellPosition,
      waterStart: game.config.waterStart as DualQuestCellPosition,
      corePosition: game.config.corePosition as DualQuestCellPosition,
      gates: (game.config.gates as Array<{ gateId: string; position: DualQuestCellPosition }>).map((gate) => ({
        ...gate,
        open: false,
      })),
      triggers: game.config.triggers as DualQuestTrigger[],
      fragmentGems: game.content as DualQuestFragmentGem[],
      collectedGemIds: [],
      hostUserId: socket.data.userId,
      phase: 'WAITING',
      players: [
        {
          socketId: socket.id,
          userId: socket.data.userId,
          displayName: socket.data.displayName,
          role,
          position: startPosition,
          desiredDirection: null,
        },
      ],
      pendingQuestion: null,
      bothAtCore: false,
      createdAt: Date.now(),
    };

    this.dualQuestRoomStore.create(room);
    socket.join(`dual-quest:${code}`);
    socket.emit('dual-quest:state', toDualQuestClientView(room, socket.id));

    void this.analyticsTracker.track({
      type: 'room_created',
      userId: socket.data.userId,
      gameId: game.id,
      metadata: { mode: 'dual-quest', role },
    });
  }

  @SubscribeMessage('dual-quest:join')
  handleDualQuestJoin(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    const room = this.dualQuestRoomStore.get(code);

    if (!room) throw new Error('No existe una sala de Dúo Lógico con ese código.');

    const existing = room.players.find((player) => player.userId === socket.data.userId);
    if (existing) {
      existing.socketId = socket.id;
    } else {
      if (room.players.length >= 2) throw new Error('La sala ya está llena.');
      // El segundo jugador siempre recibe el rol que falta — Dúo Lógico
      // necesita exactamente un FIRE y un WATER, nunca dos del mismo.
      const takenRole = room.players[0]?.role;
      const role: DualQuestRole = takenRole === 'FIRE' ? 'WATER' : 'FIRE';
      const startPosition = role === 'FIRE' ? room.fireStart : room.waterStart;
      room.players.push({
        socketId: socket.id,
        userId: socket.data.userId,
        displayName: socket.data.displayName,
        role,
        position: startPosition,
        desiredDirection: null,
      });
    }

    this.dualQuestRoomStore.set(room);
    socket.join(`dual-quest:${code}`);
    this.broadcastDualQuestState(room);
  }

  @SubscribeMessage('dual-quest:start')
  handleDualQuestStart(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'WAITING') throw new Error('La partida ya está en curso o terminó.');
    if (room.players.length !== 2) throw new Error('Se necesitan 2 jugadores (Fuego y Agua) para iniciar.');

    room.phase = 'PLAYING';
    room.bothAtCore = false;
    room.pendingQuestion = null;
    this.dualQuestRoomStore.set(room);
    this.broadcastDualQuestState(room);
    this.startDualQuestMovementTick(room.code);
  }

  /** El jugador solo manda su dirección deseada — el tick del servidor decide si de verdad se mueve. */
  @SubscribeMessage('dual-quest:move')
  handleDualQuestMove(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { direction: DualQuestDirection | null },
  ) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    player.desiredDirection = body.direction ?? null;
    this.dualQuestRoomStore.set(room);
  }

  @SubscribeMessage('dual-quest:activate-trigger')
  handleDualQuestActivateTrigger(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { triggerId: string },
  ) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) throw new Error('No estás en esta sala.');

    const trigger = room.triggers.find((t) => t.triggerId === body.triggerId);
    if (!trigger) throw new Error('Ese trigger no existe.');
    if (trigger.activatedByRole !== player.role) {
      throw new Error(`Ese trigger solo lo puede activar el rol ${trigger.activatedByRole}.`);
    }
    if (player.position.row !== trigger.switchPosition.row || player.position.col !== trigger.switchPosition.col) {
      throw new Error('Tienes que estar parado sobre el interruptor para activarlo.');
    }

    if (trigger.kind === 'SWITCH') {
      this.openDualQuestGate(room, trigger.gateId);
      return;
    }

    // QUESTION: se guarda como pendiente y se emite sin la respuesta correcta.
    room.pendingQuestion = { triggerId: trigger.triggerId, forRole: player.role };
    this.dualQuestRoomStore.set(room);
    this.broadcastDualQuestState(room);
  }

  @SubscribeMessage('dual-quest:answer-trigger')
  handleDualQuestAnswerTrigger(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { triggerId: string; optionIndex: number },
  ) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING' || !room.pendingQuestion) {
      throw new Error('No hay ninguna pregunta pendiente.');
    }
    if (room.pendingQuestion.triggerId !== body.triggerId) {
      throw new Error('Esa pregunta ya no está activa.');
    }

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || player.role !== room.pendingQuestion.forRole) {
      throw new Error('Esta pregunta no es tuya.');
    }

    const trigger = room.triggers.find((t) => t.triggerId === body.triggerId);
    const correct = trigger !== undefined && body.optionIndex === trigger.correctOptionIndex;

    room.pendingQuestion = null;

    this.server.to(`dual-quest:${room.code}`).emit('dual-quest:trigger-result', {
      triggerId: body.triggerId,
      role: player.role,
      correct,
    });

    if (correct && trigger) {
      this.openDualQuestGate(room, trigger.gateId);
      return;
    }

    // Incorrecto: no hay castigo duro, solo no se abre — el jugador puede
    // volver a pararse en el interruptor e intentar de nuevo.
    this.dualQuestRoomStore.set(room);
    this.broadcastDualQuestState(room);
  }

  private openDualQuestGate(room: DualQuestRoomState, gateId: string) {
    const gate = room.gates.find((g) => g.gateId === gateId);
    if (gate) gate.open = true;
    this.dualQuestRoomStore.set(room);
    this.broadcastDualQuestState(room);
  }

  /**
   * Arma la Gema Núcleo: el cliente manda TODAS las gemas recolectadas en
   * el orden que cree correcto. El servidor la corrige contra el `order`
   * real de `room.fragmentGems` (nunca contra algo que mande el cliente) —
   * coincide exacto y en secuencia, o no cuenta. Reintentos ilimitados: una
   * respuesta incorrecta no penaliza, solo no termina la partida.
   */
  @SubscribeMessage('dual-quest:submit-assembly')
  handleDualQuestSubmitAssembly(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { orderedGemIds: string[] },
  ) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room || room.phase !== 'PLAYING') throw new Error('La partida no está en curso.');
    if (!room.bothAtCore) throw new Error('Ambos jugadores deben estar en la Gema Núcleo para ensamblar.');
    if (room.collectedGemIds.length !== room.fragmentGems.length) {
      throw new Error('Todavía faltan gemas por recolectar.');
    }

    const submitted = Array.isArray(body.orderedGemIds) ? body.orderedGemIds : [];
    const sameSet =
      submitted.length === room.collectedGemIds.length &&
      room.collectedGemIds.every((id) => submitted.includes(id));
    if (!sameSet) {
      throw new Error('El arreglo enviado no contiene exactamente las gemas recolectadas.');
    }

    const correctSequence = [...room.fragmentGems].sort((a, b) => a.order - b.order).map((g) => g.gemId);
    const correct = submitted.every((gemId, index) => gemId === correctSequence[index]);

    this.server.to(`dual-quest:${room.code}`).emit('dual-quest:assembly-result', { correct });

    if (correct) {
      this.clearDualQuestMovementTick(room.code);
      room.phase = 'FINISHED';
      this.dualQuestRoomStore.set(room);
      this.broadcastDualQuestState(room);
    }
  }

  /** Solo el anfitrión, y solo con la partida terminada — reinicia posiciones, compuertas y gemas para volver a jugar sin recrear la sala. */
  @SubscribeMessage('dual-quest:restart')
  handleDualQuestRestart(@ConnectedSocket() socket: AuthenticatedSocket) {
    const room = this.dualQuestRoomStore.findBySocketId(socket.id);
    if (!room) throw new Error('No estás en ninguna sala.');
    if (room.phase !== 'FINISHED') throw new Error('La partida no ha terminado.');
    if (socket.data.userId !== room.hostUserId) throw new Error('Solo quien creó la sala puede reiniciar.');

    for (const player of room.players) {
      player.position = player.role === 'FIRE' ? room.fireStart : room.waterStart;
      player.desiredDirection = null;
    }
    for (const gate of room.gates) gate.open = false;
    room.collectedGemIds = [];
    room.pendingQuestion = null;
    room.bothAtCore = false;
    room.phase = 'PLAYING';

    this.dualQuestRoomStore.set(room);
    this.broadcastDualQuestState(room);
    this.startDualQuestMovementTick(room.code);
  }

  @SubscribeMessage('dual-quest:leave')
  handleDualQuestLeave(@ConnectedSocket() socket: AuthenticatedSocket) {
    this.handleDisconnect(socket);
    socket.disconnect();
  }

  private startDualQuestMovementTick(code: string) {
    this.clearDualQuestMovementTick(code);
    const timer = setInterval(() => {
      const room = this.dualQuestRoomStore.get(code);
      if (!room || room.phase !== 'PLAYING') {
        this.clearDualQuestMovementTick(code);
        return;
      }
      this.tickDualQuestMovement(room);
    }, RoomsGateway.DUAL_QUEST_TICK_MS);
    this.dualQuestMovementTicks.set(code, timer);
  }

  private clearDualQuestMovementTick(code: string) {
    const timer = this.dualQuestMovementTicks.get(code);
    if (timer) {
      clearInterval(timer);
      this.dualQuestMovementTicks.delete(code);
    }
  }

  private isDualQuestPassable(room: DualQuestRoomState, position: DualQuestCellPosition, role: DualQuestRole): boolean {
    const cell = room.grid[position.row]?.[position.col];
    if (cell === undefined) return false;
    const gate = room.gates.find((g) => g.position.row === position.row && g.position.col === position.col);
    if (gate && !gate.open) return false;
    if (cell === 1) return false;
    if (cell === 2) return role === 'FIRE';
    if (cell === 3) return role === 'WATER';
    return true;
  }

  private tickDualQuestMovement(room: DualQuestRoomState) {
    let moved = false;
    let collected = false;

    for (const player of room.players) {
      if (!player.desiredDirection) continue;
      const delta = DUAL_QUEST_DIRECTION_DELTAS[player.desiredDirection];
      const next: DualQuestCellPosition = { row: player.position.row + delta.row, col: player.position.col + delta.col };
      if (this.isDualQuestPassable(room, next, player.role)) {
        player.position = next;
        moved = true;
      }
    }

    // Auto-recolección: cada jugador solo puede recoger gemas de SU rol,
    // mismo criterio que Maze Collector (caer en la celda ya las agrega).
    if (moved) {
      for (const player of room.players) {
        const gem = room.fragmentGems.find(
          (g) =>
            g.role === player.role &&
            g.position.row === player.position.row &&
            g.position.col === player.position.col &&
            !room.collectedGemIds.includes(g.gemId),
        );
        if (gem) {
          room.collectedGemIds = [...room.collectedGemIds, gem.gemId];
          collected = true;
        }
      }
    }

    const wasBothAtCore = room.bothAtCore;
    room.bothAtCore =
      room.players.length === 2 &&
      room.players.every((p) => p.position.row === room.corePosition.row && p.position.col === room.corePosition.col);

    if (moved || collected || room.bothAtCore !== wasBothAtCore) {
      this.dualQuestRoomStore.set(room);
      this.broadcastDualQuestState(room);
    }
  }

  private broadcastDualQuestState(room: DualQuestRoomState) {
    for (const player of room.players) {
      this.server.to(player.socketId).emit('dual-quest:state', toDualQuestClientView(room, player.socketId));
    }
  }
}
