import type {
  DualQuestCellPosition,
  DualQuestFragmentGem,
  DualQuestRole,
  DualQuestTrigger,
} from '../../application/content-validators/dual-quest.content-validator.js';

export const DUAL_QUEST_ROOM_STORE = Symbol('DUAL_QUEST_ROOM_STORE');

export type DualQuestRoomPhase = 'WAITING' | 'PLAYING' | 'FINISHED';
export type DualQuestDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface DualQuestRoomPlayer {
  socketId: string;
  /** Confirmación individual para el lobby actual. */
  ready?: boolean;
  userId: string;
  displayName: string;
  role: DualQuestRole;
  position: DualQuestCellPosition;
  desiredDirection: DualQuestDirection | null;
}

export interface DualQuestGateState {
  gateId: string;
  position: DualQuestCellPosition;
  open: boolean;
}

/** Pregunta de un trigger QUESTION en curso — el `triggerId` referencia la definición completa (con la respuesta correcta) guardada en `DualQuestRoomState.triggers`. */
export interface DualQuestPendingQuestion {
  triggerId: string;
  forRole: DualQuestRole;
}

export interface DualQuestRoomState {
  code: string;
  gameId: string;
  gameTitle: string;
  coreQuestion: string;
  gridCols: number;
  gridRows: number;
  grid: number[][];
  fireStart: DualQuestCellPosition;
  waterStart: DualQuestCellPosition;
  corePosition: DualQuestCellPosition;
  gates: DualQuestGateState[];
  /** Definiciones completas (incluye `correctOptionIndex` de los QUESTION) — nunca se serializan tal cual hacia el cliente. */
  triggers: DualQuestTrigger[];
  /** Definiciones completas (incluye `order`, la secuencia correcta) — igual que `triggers`, nunca se serializan tal cual. */
  fragmentGems: DualQuestFragmentGem[];
  /** gemId de las ya recolectadas — compartido entre ambos jugadores. */
  collectedGemIds: string[];
  hostUserId: string;
  phase: DualQuestRoomPhase;
  /** Exactamente 2: uno FIRE, uno WATER. */
  players: DualQuestRoomPlayer[];
  pendingQuestion: DualQuestPendingQuestion | null;
  /** true en cuanto ambos jugadores coinciden en `corePosition`. */
  bothAtCore: boolean;
  createdAt: number;
}

/** Almacén efímero en memoria: la sala vive solo mientras el proceso corre (mismo criterio que los demás juegos en vivo). */
export interface DualQuestRoomStore {
  create(room: DualQuestRoomState): void;
  get(code: string): DualQuestRoomState | undefined;
  set(room: DualQuestRoomState): void;
  delete(code: string): void;
  findBySocketId(socketId: string): DualQuestRoomState | undefined;
}
