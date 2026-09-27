import type { GameTypeSettingModel } from '../../../generated/prisma/client.js';
import { GameTypeSetting } from '../../../domain/entities/game-type-setting.entity.js';
import { GameType } from '../../../domain/value-objects/game-type.vo.js';
import { GameTypeStatus } from '../../../domain/value-objects/game-type-status.vo.js';

export class GameTypeSettingMapper {
  static toDomain(record: GameTypeSettingModel): GameTypeSetting {
    return GameTypeSetting.fromPersistence({
      id: record.id,
      gameType: GameType.create(record.gameType),
      status: GameTypeStatus.create(record.status),
      displayName: record.displayName,
      description: record.description,
      archivedAt: record.archivedAt,
      archivedByUserId: record.archivedByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(setting: GameTypeSetting) {
    const props = setting.toPersistence();

    return {
      id: props.id,
      gameType: props.gameType.getName(),
      status: props.status.getName(),
      displayName: props.displayName,
      description: props.description,
      archivedAt: props.archivedAt,
      archivedByUserId: props.archivedByUserId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
