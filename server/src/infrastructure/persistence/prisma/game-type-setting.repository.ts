import { Injectable } from '@nestjs/common';
import type { GameTypeSettingRepository } from '../../../domain/ports/game-type-setting.repository.port.js';
import type { GameTypeSetting } from '../../../domain/entities/game-type-setting.entity.js';
import type { GameTypeName } from '../../../domain/value-objects/game-type.vo.js';
import { PrismaService } from './prisma.service.js';
import { GameTypeSettingMapper } from './game-type-setting.mapper.js';

@Injectable()
export class PrismaGameTypeSettingRepository implements GameTypeSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGameType(gameType: string): Promise<GameTypeSetting | null> {
    const record = await this.prisma.gameTypeSettingModel.findUnique({
      where: { gameType },
    });
    return record ? GameTypeSettingMapper.toDomain(record) : null;
  }

  async findAll(): Promise<GameTypeSetting[]> {
    const records = await this.prisma.gameTypeSettingModel.findMany({
      orderBy: { displayName: 'asc' },
    });
    return records.map(GameTypeSettingMapper.toDomain);
  }

  async findArchivedGameTypes(): Promise<GameTypeName[]> {
    const records = await this.prisma.gameTypeSettingModel.findMany({
      where: { status: 'ARCHIVED' },
      select: { gameType: true },
    });
    return records.map((record) => record.gameType as GameTypeName);
  }

  async save(setting: GameTypeSetting): Promise<void> {
    const data = GameTypeSettingMapper.toPersistence(setting);

    await this.prisma.gameTypeSettingModel.upsert({
      where: { gameType: data.gameType },
      create: data,
      update: data,
    });
  }
}
