import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../../application/use-cases/create-organization.use-case.js';
import { ListMyOrganizationsUseCase } from '../../../application/use-cases/list-my-organizations.use-case.js';
import { ListAllOrganizationsUseCase } from '../../../application/use-cases/list-all-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from '../../../application/use-cases/list-organization-members.use-case.js';
import { AddOrganizationMemberUseCase } from '../../../application/use-cases/add-organization-member.use-case.js';
import { RemoveOrganizationMemberUseCase } from '../../../application/use-cases/remove-organization-member.use-case.js';
import { DeactivateOrganizationUseCase } from '../../../application/use-cases/deactivate-organization.use-case.js';
import { ReactivateOrganizationUseCase } from '../../../application/use-cases/reactivate-organization.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateOrganizationDto } from '../dtos/create-organization.dto.js';
import { AddOrganizationMemberDto } from '../dtos/add-organization-member.dto.js';
import { ListOrganizationsQueryDto } from '../dtos/list-organizations-query.dto.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listMyOrganizationsUseCase: ListMyOrganizationsUseCase,
    private readonly listAllOrganizationsUseCase: ListAllOrganizationsUseCase,
    private readonly listOrganizationMembersUseCase: ListOrganizationMembersUseCase,
    private readonly addOrganizationMemberUseCase: AddOrganizationMemberUseCase,
    private readonly removeOrganizationMemberUseCase: RemoveOrganizationMemberUseCase,
    private readonly deactivateOrganizationUseCase: DeactivateOrganizationUseCase,
    private readonly reactivateOrganizationUseCase: ReactivateOrganizationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() createdByUserId: string, @Body() dto: CreateOrganizationDto) {
    return this.createOrganizationUseCase.execute({ createdByUserId, ...dto });
  }

  /** Organizaciones que integra el usuario autenticado, con su rol en cada una. */
  @Get('mine')
  listMine(@CurrentUserId() requestingUserId: string) {
    return this.listMyOrganizationsUseCase.execute({ requestingUserId });
  }

  /**
   * Todas las organizaciones de la plataforma. Ruta separada de `mine` a
   * propósito: es la única con autorización de ADMIN global, y tenerla en su
   * propio path evita que un cambio de query param la exponga por accidente.
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listAll(
    @CurrentUserId() requestingUserId: string,
    @Query() query: ListOrganizationsQueryDto,
  ) {
    return this.listAllOrganizationsUseCase.execute({
      requestingUserId,
      search: query.search,
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id/members')
  listMembers(
    @CurrentUserId() requestingUserId: string,
    @Param('id') organizationId: string,
  ) {
    return this.listOrganizationMembersUseCase.execute({ organizationId, requestingUserId });
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @CurrentUserId() requestingUserId: string,
    @Param('id') organizationId: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    return this.addOrganizationMemberUseCase.execute({
      organizationId,
      requestingUserId,
      memberEmail: dto.email,
      orgRole: dto.orgRole,
    });
  }

  /**
   * Remueve la membresía de un usuario de la organización (issue #106,
   * CA3.1). Reservado a `OrganizationRole.ADMIN` de esa organización o ADMIN
   * global — la autorización se resuelve dentro del use-case, no vía
   * `RolesGuard`, porque es un OR entre ambos ejes (ver comentario del
   * use-case). Mismo endpoint sirve para desvincular TEACHER de la
   * organización (CA3.3): las clases del profesor no se tocan.
   */
  @Delete(':organizationId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUserId() requestingUserId: string,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.removeOrganizationMemberUseCase.execute({
      organizationId,
      userId,
      requestingUserId,
    });
  }

  /** Reservado a ADMIN global de plataforma (issue #106, CA2.3). */
  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') organizationId: string) {
    return this.deactivateOrganizationUseCase.execute({ organizationId });
  }

  /** Reservado a ADMIN global de plataforma (issue #106, CA2.3). */
  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  reactivate(@Param('id') organizationId: string) {
    return this.reactivateOrganizationUseCase.execute({ organizationId });
  }
}
