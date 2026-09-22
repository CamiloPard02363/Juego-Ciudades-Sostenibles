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
import { JoinOrganizationUseCase } from '../../../application/use-cases/join-organization.use-case.js';
import { ListOrganizationStudentsUseCase } from '../../../application/use-cases/list-organization-students.use-case.js';
import { ChangeOrganizationMemberRoleUseCase } from '../../../application/use-cases/change-organization-member-role.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateOrganizationDto } from '../dtos/create-organization.dto.js';
import { AddOrganizationMemberDto } from '../dtos/add-organization-member.dto.js';
import { ListOrganizationsQueryDto } from '../dtos/list-organizations-query.dto.js';
import { JoinOrganizationDto } from '../dtos/join-organization.dto.js';
import { ChangeOrganizationMemberRoleDto } from '../dtos/change-organization-member-role.dto.js';

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
    private readonly joinOrganizationUseCase: JoinOrganizationUseCase,
    private readonly listOrganizationStudentsUseCase: ListOrganizationStudentsUseCase,
    private readonly changeOrganizationMemberRoleUseCase: ChangeOrganizationMemberRoleUseCase,
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

  /**
   * Matrícula por código de invitación de la organización (issue #133,
   * Frente A, CA-A2), análogo a `POST /classes/join`.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@CurrentUserId() requestingUserId: string, @Body() dto: JoinOrganizationDto) {
    return this.joinOrganizationUseCase.execute({
      inviteCode: dto.inviteCode,
      requestingUserId,
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

  /**
   * Lista los miembros `orgRole = STUDENT` de la organización (issue #133,
   * Frente C, CA-C1) — insumo para que un profesor matricule directo sin
   * código vía `POST /classes/:classId/enrollments`.
   */
  @Get(':organizationId/students')
  listStudents(
    @CurrentUserId() requestingUserId: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.listOrganizationStudentsUseCase.execute({ organizationId, requestingUserId });
  }

  /**
   * Cambia el `OrganizationRole` de un miembro ya existente (issue #133,
   * Frente F, CA-F1). Reservado a `OrganizationRole.ADMIN` de esa
   * organización o ADMIN global — resuelto dentro del use-case (mismo OR de
   * ejes que `removeMember`). Nadie puede cambiar su propio rol (CA-F2).
   */
  @Patch(':organizationId/members/:userId/role')
  changeMemberRole(
    @CurrentUserId() requestingUserId: string,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() dto: ChangeOrganizationMemberRoleDto,
  ) {
    return this.changeOrganizationMemberRoleUseCase.execute({
      organizationId,
      userId,
      requestingUserId,
      orgRole: dto.orgRole,
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
