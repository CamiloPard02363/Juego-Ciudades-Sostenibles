import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ListAiProviderAttemptsUseCase } from '../../../application/use-cases/list-ai-provider-attempts.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { ListAiProviderAttemptsQueryDto } from '../dtos/list-ai-provider-attempts-query.dto.js';

/**
 * Panel de administración de IA (issue #204): historial de fallback entre
 * proveedores. Solo ADMIN — a diferencia de `GameTypeSettingController`,
 * este endpoint no tiene ningún caso de uso para no-ADMIN, así que el rol se
 * declara a nivel de controller.
 */
@Controller('admin/ai-provider-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AiProviderAttemptsController {
  constructor(private readonly listAiProviderAttemptsUseCase: ListAiProviderAttemptsUseCase) {}

  @Get()
  list(@CurrentUserId() requestingUserId: string, @Query() query: ListAiProviderAttemptsQueryDto) {
    return this.listAiProviderAttemptsUseCase.execute({
      requestingUserId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
