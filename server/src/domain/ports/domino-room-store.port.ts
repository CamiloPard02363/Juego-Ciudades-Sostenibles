import type { DominoConcept } from '../../application/content-validators/domino.content-validator.js';

export const DOMINO_ROOM_STORE = Symbol('DOMINO_ROOM_STORE');

export type DominoRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED';

/** Una ficha: sus dos mitades son índices dentro de `DominoRoomState.concepts`. */
export interface DominoTile {
  id: string;
  a: number;
  b: number;
}

/** Una ficha ya colocada en el tablero, con sus mitades orientadas hacia los extremos abiertos. */
export interface DominoPlacedTile {
  id: string;
  left: number;
  right: number;
  isDouble: boolean;
  /** userId de quien la colocó — para animar "quién jugó" en el cliente. */
  placedByUserId: string;
}

export interface DominoRoomPlayer {
  socketId: string;
  userId: string;
  displayName: string;
  hand: DominoTile[];
}

export interface DominoRoomState {
  code: string;
  gameId: string;
  gameTitle: string;
  /** Conceptos del juego publicado (reemplazan a los números 0-6 del dominó tradicional). */
  concepts: DominoConcept[];
  /** Fichas que recibe cada jugador al repartir; viene de game.config, nunca hardcodeado. */
  handSize: number;
  /** userId de quien creó la sala — único que puede fijar los segundos por turno. */
  hostUserId: string;
  turnDurationSeconds: number;
  phase: DominoRoomPhase;
  players: DominoRoomPlayer[];
  /** Fichas que no se repartieron a nadie; se roban de acá cuando no hay jugada posible. */
  boneyard: DominoTile[];
  board: DominoPlacedTile[];
  activePlayerUserId: string | null;
  turnDeadline: number | null;
  winnerUserId: string | null;
  /** Si termina por bloqueo (nadie puede jugar y el pozo está vacío) en vez de por mano vacía. */
  endedByBlock: boolean;
  createdAt: number;
  rematchVotes: Record<string, boolean>;
  /**
   * Pases consecutivos sin jugar ficha: si ambos jugadores pasan seguido
   * (nadie tiene jugada y el pozo está vacío), la partida está bloqueada y
   * gana quien tenga menos puntos (suma de pips) en la mano.
   */
  consecutivePasses: number;
}

/** Almacén efímero en memoria: la sala vive solo mientras el proceso corre (ver RoomsGateway). */
export interface DominoRoomStore {
  create(room: DominoRoomState): void;
  get(code: string): DominoRoomState | undefined;
  set(room: DominoRoomState): void;
  delete(code: string): void;
  findBySocketId(socketId: string): DominoRoomState | undefined;
}
