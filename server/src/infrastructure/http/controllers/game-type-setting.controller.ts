import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ListGameTypeSettingsUseCase } from '../../../application/use-cases/list-game-type-settings.use-case.js';
import { ArchiveGameTypeUseCase } from '../../../application/use-cases/archive-game-type.use-case.js';
import { UnarchiveGameTypeUseCase } from '../../../application/use-cases/unarchive-game-type.use-case.js';
import { UpdateGameTypeSettingUseCase } from '../../../application/use-cases/update-game-type-setting.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { UpdateGameTypeSettingDto } from '../dtos/update-game-type-setting.dto.js';
import { ListGameTypeSettingsQueryDto } from '../dtos/list-game-type-settings-query.dto.js';

/**
 * Gobernanza de tipos de juego (issue #156). `GET` es para cualquier
 * autenticado — el filtro por rol (ocultar ARCHIVED a no-ADMIN) vive en el
 * use-case, no acá. Las mutaciones exigen ADMIN vía `RolesGuard` +
 * revalidación contra BD dentro de cada use-case.
 */
@Controller('game-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameTypeSettingController {
  constructor(
    private readonly listGameTypeSettingsUseCase: ListGameTypeSettingsUseCase,
    private readonly archiveGameTypeUseCase: ArchiveGameTypeUseCase,
    private readonly unarchiveGameTypeUseCase: UnarchiveGameTypeUseCase,
    private readonly updateGameTypeSettingUseCase: UpdateGameTypeSettingUseCase,
  ) {}

  @Get()
  list(@CurrentUserId() requestingUserId: string, @Query() query: ListGameTypeSettingsQueryDto) {
    return this.listGameTypeSettingsUseCase.execute({
      requestingUserId,
      page: query.page,
      pageSize: query.pageSize,
      statusFilter: query.statusFilter,
      search: query.search,
    });
  }

  @Patch(':gameType/archive')
  @Roles('ADMIN')
  archive(@CurrentUserId() requestingUserId: string, @Param('gameType') gameType: string) {
    return this.archiveGameTypeUseCase.execute({ requestingUserId, gameType });
  }

  @Patch(':gameType/unarchive')
  @Roles('ADMIN')
  unarchive(@CurrentUserId() requestingUserId: string, @Param('gameType') gameType: string) {
    return this.unarchiveGameTypeUseCase.execute({ requestingUserId, gameType });
  }

  @Patch(':gameType')
  @Roles('ADMIN')
  update(
    @CurrentUserId() requestingUserId: string,
    @Param('gameType') gameType: string,
    @Body() dto: UpdateGameTypeSettingDto,
  ) {
    return this.updateGameTypeSettingUseCase.execute({
      requestingUserId,
      gameType,
      displayName: dto.displayName,
      description: dto.description,
    });
  }
}
