import type { GuessWhoCard } from '../../application/content-validators/guess-who.content-validator.js';

export const ROOM_STORE = Symbol('ROOM_STORE');

export type RoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface RoomPlayer {
  socketId: string;
  userId: string;
  displayName: string;
  /** Id de la carta secreta que este jugador debe hacer adivinar al rival. */
  secretCardId: string | null;
  /** Ids de cartas que este jugador ya descartó de su propio tablero. */
  discardedCardIds: string[];
}

export interface RoomState {
  code: string;
  gameId: string;
  gameTitle: string;
  cards: GuessWhoCard[];
  maxAccusationCount: number;
  /** Segundos que tiene el jugador activo antes de que su turno pase automático. Viene de game.config. */
  turnDurationSeconds: number;
  phase: RoomPhase;
  players: RoomPlayer[];
  winnerUserId: string | null;
  createdAt: number;
  /**
   * Votos de revancha tras terminar la partida (fase FINISHED): userId -> true/false.
   * Se reinicia cada vez que se entra a FINISHED. Si algún jugador vota false,
   * la sala se cierra y se expulsa al otro; solo se reinicia la partida
   * cuando ambos votan true.
   */
  rematchVotes: Record<string, boolean>;
  /** userId del jugador que tiene el turno actual (solo relevante en fase PLAYING). */
  activePlayerUserId: string | null;
  /**
   * Timestamp (Date.now() + 15000) en el que vence el turno actual si nadie
   * lo pasa antes. Se manda al cliente para que dibuje su propio countdown
   * sin depender de un tick del servidor; el servidor igual aplica el límite
   * real con un timer propio (ver RoomsGateway.turnTimers).
   */
  turnDeadline: number | null;
}

/** Almacén efímero en memoria: la sala vive solo mientras el proceso corre (ver RoomsGateway). */
export interface RoomStore {
  create(room: RoomState): void;
  get(code: string): RoomState | undefined;
  set(room: RoomState): void;
  delete(code: string): void;
  findBySocketId(socketId: string): RoomState | undefined;
}
