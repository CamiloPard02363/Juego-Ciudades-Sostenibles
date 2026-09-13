/**
 * Un ítem del lote a importar: mismo shape que crear un juego a mano, salvo
 * `creatorUserId` (el importador queda como autor de todo el lote, no cada
 * ítem individualmente) y `organizationId`/`slug` (fuera de alcance para
 * importación masiva por ahora — cada juego importado nace personal, con
 * slug auto-generado desde el título, igual que el flujo manual sin slug
 * explícito).
 */
export interface GameImportItemInput {
  title: string;
  description: string;
  gameType: string;
  categoryId: string;
  theme?: { primaryColor?: string; coverImageUrl?: string | null };
  config?: unknown;
  content: unknown;
}

export interface GameImportBatchInput {
  requestedByUserId: string;
  idempotencyKey: string;
  items: GameImportItemInput[];
}

export interface GameImportItemErrorDto {
  index: number;
  message: string;
}

export interface GameImportJobResultDto {
  jobId: string;
  status: 'COMMITTED' | 'FAILED';
  insertedGameIds: string[];
  errors: GameImportItemErrorDto[];
}
