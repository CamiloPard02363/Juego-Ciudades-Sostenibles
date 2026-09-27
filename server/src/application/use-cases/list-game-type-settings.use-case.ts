import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_TYPE_SETTING_REPOSITORY,
  type GameTypeSettingRepository,
} from '../../domain/ports/game-type-setting.repository.port.js';
import { VALID_GAME_TYPES } from '../../domain/value-objects/game-type.vo.js';
import { toGameTypeSettingDto, type GameTypeSettingDto } from '../dtos/game-type-setting-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListGameTypeSettingsInput {
  requestingUserId: string;
}

/**
 * Catálogo completo de `VALID_GAME_TYPES`, cruzado con la fila de gobernanza
 * si existe en `game_type_settings`. Para tipos del catálogo sin fila aún
 * (no se han archivado/renombrado nunca), se devuelve un default sensato
 * (displayName = nombre técnico, ACTIVE) sin fallar — evita depender de que
 * el seed haya corrido para los 7 tipos.
 *
 * No-ADMIN solo ve los tipos ACTIVE (issue #156): los ARCHIVED quedan
 * completamente ausentes de la respuesta, no solo marcados.
 */
@Injectable()
export class ListGameTypeSettingsUseCase
  implements UseCase<ListGameTypeSettingsInput, GameTypeSettingDto[]>
{
  constructor(
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListGameTypeSettingsInput): Promise<GameTypeSettingDto[]> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);

    const settings = await this.gameTypeSettingRepository.findAll();
    const settingByGameType = new Map(settings.map((setting) => [setting.gameType.getName(), setting]));

    const dtos = VALID_GAME_TYPES.map((gameType) => {
      const existing = settingByGameType.get(gameType);
      if (existing) {
        return toGameTypeSettingDto(existing);
      }

      return {
        gameType,
        displayName: gameType,
        description: null,
        status: 'ACTIVE',
        isArchived: false,
      };
    });

    return isAdmin ? dtos : dtos.filter((dto) => !dto.isArchived);
  }
}
