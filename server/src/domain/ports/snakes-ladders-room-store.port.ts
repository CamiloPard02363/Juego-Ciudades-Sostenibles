import type {
  SnakesLaddersLink,
  SnakesLaddersQuestion,
  SnakesLaddersTriggerType,
} from '../../application/content-validators/snakes-ladders.content-validator.js';

export const SNAKES_LADDERS_ROOM_STORE = Symbol('SNAKES_LADDERS_ROOM_STORE');

export type SnakesLaddersRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface SnakesLaddersRoomPlayer {
  socketId: string;
  /** Confirmación individual para el lobby actual. */
  ready?: boolean;
  userId: string;
  displayName: string;
  position: number;
}

/**
 * Reto pendiente de resolver antes de que el turno avance. `previousPosition`
 * es la casilla donde estaba el jugador ANTES de tirar el dado — la regla de
 * "casilla normal fallida" la usa para deshacer el movimiento de esa tirada.
 * Nunca incluye `correctOptionIndex`: eso solo vive en `questions`, del lado
 * del servidor.
 */
export interface SnakesLaddersPendingChallenge {
  cellNumber: number;
  triggerType: SnakesLaddersTriggerType;
  forUserId: string;
  previousPosition: number;
  deadlineTs: number;
}

export interface SnakesLaddersRoomState {
  code: string;
  gameId: string;
  gameTitle: string;
  boardSize: number;
  ladders: SnakesLaddersLink[];
  snakes: SnakesLaddersLink[];
  /**
   * Preguntas completas (con `correctOptionIndex`) — se guardan acá para que
   * el servidor pueda calificar la respuesta contra el contenido real del
   * juego. Nunca se serializan tal cual hacia el cliente (ver
   * `toSnakesLaddersClientView` en el gateway).
   */
  questions: SnakesLaddersQuestion[];
  hostUserId: string;
  turnDurationSeconds: number;
  phase: SnakesLaddersRoomPhase;
  /** Entre 2 y 4 jugadores. */
  players: SnakesLaddersRoomPlayer[];
  activePlayerUserId: string | null;
  turnDeadline: number | null;
  winnerUserId: string | null;
  pendingChallenge: SnakesLaddersPendingChallenge | null;
  lastRoll: number | null;
  createdAt: number;
  rematchVotes: Record<string, boolean>;
}

/** Almacén efímero en memoria: la sala vive solo mientras el proceso corre (mismo criterio que DominoRoomStore). */
export interface SnakesLaddersRoomStore {
  create(room: SnakesLaddersRoomState): void;
  get(code: string): SnakesLaddersRoomState | undefined;
  set(room: SnakesLaddersRoomState): void;
  delete(code: string): void;
  findBySocketId(socketId: string): SnakesLaddersRoomState | undefined;
}
