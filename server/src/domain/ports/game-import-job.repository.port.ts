export const GAME_IMPORT_JOB_REPOSITORY = Symbol('GAME_IMPORT_JOB_REPOSITORY');

export type GameImportJobStatus = 'PENDING' | 'COMMITTED' | 'FAILED';

export interface GameImportItemError {
  index: number;
  message: string;
}

/**
 * Registro de una ejecución del pipeline ETL. Vive en su propia colección de
 * Mongo (no mezclado con `games`) porque su ciclo de vida es distinto: un
 * juego importado exitosamente queda para siempre en `games`, pero el job
 * que lo trajo es solo un recibo/registro de auditoría e idempotencia.
 */
export interface GameImportJob {
  id: string;
  /**
   * Clave provista por quien importa (no un hash del payload): permite
   * reintentar el mismo lote lógico tras corregir un error sin que se trate
   * como un lote "nuevo", y permite que un reintento idéntico tras un corte
   * de red devuelva el resultado ya confirmado en vez de duplicar trabajo.
   */
  idempotencyKey: string;
  requestedByUserId: string;
  status: GameImportJobStatus;
  totalItems: number;
  insertedGameIds: string[];
  errors: GameImportItemError[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface GameImportJobRepository {
  save(job: GameImportJob): Promise<void>;
  findByIdempotencyKey(idempotencyKey: string): Promise<GameImportJob | null>;
  findById(id: string): Promise<GameImportJob | null>;
}
