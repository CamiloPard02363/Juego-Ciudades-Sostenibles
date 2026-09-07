export const TOURNAMENT_STORE = Symbol('TOURNAMENT_STORE');

export type TournamentPhase = 'WAITING' | 'RUNNING' | 'FINISHED';

export interface TournamentParticipant {
  socketId: string;
  userId: string;
  displayName: string;
  /** Puntos acumulados a lo largo del torneo (1 por ronda ganada, incluye byes). */
  points: number;
  /** Si ya perdió una ronda y quedó fuera del torneo. */
  eliminated: boolean;
  /** Número de ronda en la que fue eliminado (null mientras sigue vivo). */
  eliminatedAtRound: number | null;
}

/**
 * Un "match" de ronda es una partida 1v1 normal de "¿Quién Es?", identificada
 * con un código propio (namespaceado bajo el código del torneo) para no
 * chocar con el sistema de salas 1v1 sueltas. Reutiliza el mismo shape de
 * partida (cartas, descartes, turnos) que RoomState, pero vive embebido
 * dentro del torneo en vez de en el RoomStore de salas 1v1.
 */
export interface TournamentMatch {
  /** Código único del match, ej. "AB12CD-R1-M2". */
  matchCode: string;
  round: number;
  /** userIds de los dos participantes de este match. Un "bye" tiene solo uno. */
  playerUserIds: [string, string] | [string];
  isBye: boolean;
  phase: 'WAITING' | 'PLAYING' | 'FINISHED';
  cards: { cardId: string; imageUrl: string; label: string; audioUrl: string | null }[];
  players: {
    userId: string;
    secretCardId: string | null;
    discardedCardIds: string[];
  }[];
  winnerUserId: string | null;
  activePlayerUserId: string | null;
  turnDeadline: number | null;
}

export interface TournamentState {
  code: string;
  gameId: string;
  gameTitle: string;
  /** Cupo máximo configurado por el creador (límite superior 10, ver validación en el gateway). */
  maxParticipants: number;
  maxAccusationCount: number;
  turnDurationSeconds: number;
  phase: TournamentPhase;
  participants: TournamentParticipant[];
  creatorUserId: string;
  /** Ronda actual (1-indexed). 0 mientras el torneo no ha arrancado. */
  currentRound: number;
  /** Todos los matches creados hasta ahora, de todas las rondas (para poder armar el ranking histórico). */
  matches: TournamentMatch[];
  winnerUserId: string | null;
  createdAt: number;
}

/** Almacén efímero en memoria: el torneo vive solo mientras el proceso corre. */
export interface TournamentStore {
  create(tournament: TournamentState): void;
  get(code: string): TournamentState | undefined;
  set(tournament: TournamentState): void;
  delete(code: string): void;
  findBySocketId(socketId: string): TournamentState | undefined;
}
