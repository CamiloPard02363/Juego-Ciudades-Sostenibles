import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_TYPE_SETTING_REPOSITORY,
  type GameTypeSettingRepository,
} from '../../domain/ports/game-type-setting.repository.port.js';
import { GameTypeSetting } from '../../domain/entities/game-type-setting.entity.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import { GameTypeNotArchivedError } from '../../domain/errors/game.errors.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { toGameTypeSettingDto, type GameTypeSettingDto } from '../dtos/game-type-setting-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface UnarchiveGameTypeInput {
  requestingUserId: string;
  gameType: string;
}

@Injectable()
export class UnarchiveGameTypeUseCase
  implements UseCase<UnarchiveGameTypeInput, GameTypeSettingDto>
{
  constructor(
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: UnarchiveGameTypeInput): Promise<GameTypeSettingDto> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isAdmin) {
      throw new ForbiddenActionError('desarchivar un tipo de juego');
    }

    const gameType = GameType.create(input.gameType);
    const existing = await this.gameTypeSettingRepository.findByGameType(gameType.getName());

    // Sin fila = nunca se archivó (ACTIVE es el default implícito): no tiene
    // sentido "desarchivar" algo que nunca estuvo archivado.
    if (!existing) {
      throw new GameTypeNotArchivedError(gameType.getName());
    }

    const setting: GameTypeSetting = existing;
    setting.unarchive();

    await this.gameTypeSettingRepository.save(setting);

    return toGameTypeSettingDto(setting);
  }
}
