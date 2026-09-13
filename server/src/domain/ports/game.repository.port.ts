import { Game } from '../entities/game.entity.js';
import type { GameStatusName } from '../value-objects/game-status.vo.js';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface FindAllGamesFilter {
  status?: GameStatusName;
  creatorUserId?: string;
  /** Excluye los juegos del creador dado — usado para "Comunidad" (juegos de otros). */
  excludeCreatorUserId?: string;
  categoryId?: string;
  /** Filtra juegos institucionales de una organización concreta. */
  organizationId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedGames {
  items: Game[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GameRepository {
  /**
   * `expectedVersion` habilita concurrencia optimista: si se pasa, el guardado
   * solo aplica si la versión almacenada del documento sigue siendo esa —
   * si no, lanza `GameVersionConflictError` (alguien más ya guardó un cambio
   * más nuevo). Se omite únicamente en la primera inserción de un juego
   * nuevo, donde no hay una versión previa contra la cual competir.
   */
  save(game: Game, expectedVersion?: number): Promise<void>;
  /**
   * Inserta varios juegos NUEVOS de una sola vez (uso exclusivo del pipeline
   * de importación masiva — ver `ImportGamesBatchUseCase`). `session` es un
   * handle opaco de transacción: este puerto no conoce ni depende de Mongo,
   * así que no tipa `ClientSession` acá — el adaptador concreto es quien
   * sabe qué hacer con él. Si se omite, cada inserción no está protegida
   * por ninguna transacción (solo aceptable para tests/uso puntual, nunca
   * para el flujo real del ETL).
   */
  bulkInsert(games: Game[], session?: unknown): Promise<void>;
  findById(id: string): Promise<Game | null>;
  findBySlug(slug: string): Promise<Game | null>;
  existsBySlug(slug: string): Promise<boolean>;
  findAll(filter: FindAllGamesFilter): Promise<PaginatedGames>;
  delete(id: string): Promise<void>;
  /** Conteo de juegos PUBLISHED agrupados por categoría, para el catálogo de materias. */
  countPublishedByCategory(): Promise<Map<string, number>>;
}
