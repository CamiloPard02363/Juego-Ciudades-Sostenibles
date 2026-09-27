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
  page?: number;
  pageSize?: number;
  /**
   * Filtro de estado para el ADMIN (issue #156: filtro Activos/Archivados/
   * Todos en /tipos-de-juego). Un no-ADMIN nunca ve ARCHIVED sin importar
   * este valor — el filtro de rol se aplica primero y este es un recorte
   * adicional sobre lo que ya es visible para el requester.
   */
  statusFilter?: 'ACTIVE' | 'ARCHIVED' | 'ALL';
}

export interface ListGameTypeSettingsOutput {
  items: GameTypeSettingDto[];
  total: number;
  page: number;
  pageSize: number;
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
 *
 * Paginado (issue #156, vista de catálogo con flecha en vez de scroll): se
 * ordena por `displayName` de forma estable antes de recortar la página, así
 * que el orden no cambia entre peticiones mientras no se rebautice ningún
 * tipo — el catálogo completo cabe siempre en memoria (7 tipos hoy, crece
 * solo con cambios de código) así que ordenar en memoria es más simple que
 * empujar el orden al repositorio.
 */
@Injectable()
export class ListGameTypeSettingsUseCase
  implements UseCase<ListGameTypeSettingsInput, ListGameTypeSettingsOutput>
{
  constructor(
    @Inject(GAME_TYPE_SETTING_REPOSITORY)
    private readonly gameTypeSettingRepository: GameTypeSettingRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListGameTypeSettingsInput): Promise<ListGameTypeSettingsOutput> {
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
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));

    const visibleByRole = isAdmin ? dtos : dtos.filter((dto) => !dto.isArchived);

    // El filtro de estado solo tiene efecto real para ADMIN: un no-ADMIN ya
    // no tiene ARCHIVED en `visibleByRole`, así que pedir 'ARCHIVED' o 'ALL'
    // sin ser ADMIN simplemente no cambia nada (nunca se le revela un tipo
    // archivado por esta vía).
    const statusFilter = input.statusFilter ?? 'ALL';
    const visible =
      statusFilter === 'ALL'
        ? visibleByRole
        : visibleByRole.filter((dto) => dto.status === statusFilter);

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? visible.length;
    const start = (page - 1) * pageSize;

    return {
      items: visible.slice(start, start + pageSize),
      total: visible.length,
      page,
      pageSize,
    };
  }
}
