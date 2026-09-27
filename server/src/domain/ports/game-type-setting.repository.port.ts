import { GameTypeSetting } from '../entities/game-type-setting.entity.js';
import type { GameTypeName } from '../value-objects/game-type.vo.js';

export const GAME_TYPE_SETTING_REPOSITORY = Symbol('GAME_TYPE_SETTING_REPOSITORY');

export interface GameTypeSettingRepository {
  findByGameType(gameType: string): Promise<GameTypeSetting | null>;
  findAll(): Promise<GameTypeSetting[]>;
  /** Solo los nombres técnicos de los tipos actualmente ARCHIVED, para filtros de lectura. */
  findArchivedGameTypes(): Promise<GameTypeName[]>;
  /** Upsert por `gameType` (único). */
  save(setting: GameTypeSetting): Promise<void>;
}
