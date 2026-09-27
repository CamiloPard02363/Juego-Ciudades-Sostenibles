import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_TYPE_SETTING_REPOSITORY,
  type GameTypeSettingRepository,
} from '../../domain/ports/game-type-setting.repository.port.js';
import { GameTypeSetting } from '../../domain/entities/game-type-setting.entity.js';
import { GameType } from '../../domain/value-objects/game-type.vo.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.port.js';
import { toGameTypeSettingDto, type GameTypeSettingDto } from '../dtos/game-type-setting-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface UpdateGameTypeSettingInput {
  requestingUserId: string;
  gameType: string;
  displayName: string;
  description?: string | null;
}

@Injectable()
export class UpdateGameTypeSettingUseCase
  implements UseCase<UpdateGameTypeSettingInput, GameTypeSettingDto>
{
  constructor(
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    @Inject(ID_GENERATOR) private readonly idGenerator: IdGenerator,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: UpdateGameTypeSettingInput): Promise<GameTypeSettingDto> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isAdmin) {
      throw new ForbiddenActionError('renombrar un tipo de juego');
    }

    const gameType = GameType.create(input.gameType);
    const existing = await this.gameTypeSettingRepository.findByGameType(gameType.getName());

    const setting: GameTypeSetting =
      existing ??
      GameTypeSetting.create({
        id: this.idGenerator.generate(),
        gameType,
        displayName: gameType.getName(),
      });

    setting.rename(input.displayName, input.description);

    await this.gameTypeSettingRepository.save(setting);

    return toGameTypeSettingDto(setting);
  }
}
