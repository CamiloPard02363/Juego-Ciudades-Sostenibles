import { Game } from '../entities/game.entity.js';
import type { GameStatusName } from '../value-objects/game-status.vo.js';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface FindAllGamesFilter {
  status?: GameStatusName;
  creatorUserId?: string;
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
  save(game: Game): Promise<void>;
  findById(id: string): Promise<Game | null>;
  findBySlug(slug: string): Promise<Game | null>;
  existsBySlug(slug: string): Promise<boolean>;
  findAll(filter: FindAllGamesFilter): Promise<PaginatedGames>;
  delete(id: string): Promise<void>;
}
