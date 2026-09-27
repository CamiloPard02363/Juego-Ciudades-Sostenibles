import { GameTypeSetting } from '../../domain/entities/game-type-setting.entity.js';

export interface GameTypeSettingDto {
  gameType: string;
  displayName: string;
  description: string | null;
  status: string;
  isArchived: boolean;
}

export function toGameTypeSettingDto(setting: GameTypeSetting): GameTypeSettingDto {
  return {
    gameType: setting.gameType.getName(),
    displayName: setting.displayName,
    description: setting.description,
    status: setting.status.getName(),
    isArchived: setting.isArchived(),
  };
}
