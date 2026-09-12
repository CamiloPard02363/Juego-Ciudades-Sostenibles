import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../../application/use-cases/create-organization.use-case.js';
import { ListMyOrganizationsUseCase } from '../../../application/use-cases/list-my-organizations.use-case.js';
import { ListAllOrganizationsUseCase } from '../../../application/use-cases/list-all-organizations.use-case.js';
import { ListOrganizationMembersUseCase } from '../../../application/use-cases/list-organization-members.use-case.js';
import { AddOrganizationMemberUseCase } from '../../../application/use-cases/add-organization-member.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateOrganizationDto } from '../dtos/create-organization.dto.js';
import { AddOrganizationMemberDto } from '../dtos/add-organization-member.dto.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listMyOrganizationsUseCase: ListMyOrganizationsUseCase,
    private readonly listAllOrganizationsUseCase: ListAllOrganizationsUseCase,
    private readonly listOrganizationMembersUseCase: ListOrganizationMembersUseCase,
    private readonly addOrganizationMemberUseCase: AddOrganizationMemberUseCase,
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
  listAll(@CurrentUserId() requestingUserId: string) {
    return this.listAllOrganizationsUseCase.execute({ requestingUserId });
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
}
