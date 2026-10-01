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
import { CreateClassUseCase } from '../../../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../../../application/use-cases/list-my-classes.use-case.js';
import { ListMyClassesDetailUseCase } from '../../../application/use-cases/list-my-classes-detail.use-case.js';
import { ListAllClassesUseCase } from '../../../application/use-cases/list-all-classes.use-case.js';
import { AddGameToClassUseCase } from '../../../application/use-cases/add-game-to-class.use-case.js';
import { RemoveGameFromClassUseCase } from '../../../application/use-cases/remove-game-from-class.use-case.js';
import { ListClassGamesUseCase } from '../../../application/use-cases/list-class-games.use-case.js';
import { JoinClassUseCase } from '../../../application/use-cases/join-class.use-case.js';
import { ListMyEnrollmentsUseCase } from '../../../application/use-cases/list-my-enrollments.use-case.js';
import { RemoveClassEnrollmentUseCase } from '../../../application/use-cases/remove-class-enrollment.use-case.js';
import { EnrollStudentUseCase } from '../../../application/use-cases/enroll-student.use-case.js';
import { DeactivateClassUseCase } from '../../../application/use-cases/deactivate-class.use-case.js';
import { ReactivateClassUseCase } from '../../../application/use-cases/reactivate-class.use-case.js';
import { SetClassGameArchivedUseCase } from '../../../application/use-cases/set-class-game-archived.use-case.js';
import { GetClassStudentsUseCase } from '../../../application/use-cases/get-class-students.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateClassDto } from '../dtos/create-class.dto.js';
import { AddGameToClassDto } from '../dtos/add-game-to-class.dto.js';
import { JoinClassDto } from '../dtos/join-class.dto.js';
import { EnrollStudentDto } from '../dtos/enroll-student.dto.js';
import { ListClassesQueryDto } from '../dtos/list-classes-query.dto.js';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassController {
  constructor(
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly listMyClassesUseCase: ListMyClassesUseCase,
    private readonly listMyClassesDetailUseCase: ListMyClassesDetailUseCase,
    private readonly listAllClassesUseCase: ListAllClassesUseCase,
    private readonly addGameToClassUseCase: AddGameToClassUseCase,
    private readonly removeGameFromClassUseCase: RemoveGameFromClassUseCase,
    private readonly listClassGamesUseCase: ListClassGamesUseCase,
    private readonly joinClassUseCase: JoinClassUseCase,
    private readonly listMyEnrollmentsUseCase: ListMyEnrollmentsUseCase,
    private readonly removeClassEnrollmentUseCase: RemoveClassEnrollmentUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly deactivateClassUseCase: DeactivateClassUseCase,
    private readonly reactivateClassUseCase: ReactivateClassUseCase,
    private readonly setClassGameArchivedUseCase: SetClassGameArchivedUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
  ) {}

  @Get('mine')
  listMine(@CurrentUserId() teacherUserId: string, @Query() query: ListClassesQueryDto) {
    return this.listMyClassesUseCase.execute(teacherUserId, query.includeInactive);
  }

  /**
   * Vista consolidada de las clases propias con código de invitación y
   * estudiantes matriculados por clase (issue #106, CA1.2). Ruta separada de
   * `mine` en vez de un query param: mismo criterio que `classes/all` vs
   * `classes/mine` — evita ambigüedad sobre qué trae cada respuesta y no
   * rompe a los consumidores existentes de `GET /classes/mine`.
   */
  @Get('mine/detail')
  listMineDetail(@CurrentUserId() teacherUserId: string, @Query() query: ListClassesQueryDto) {
    return this.listMyClassesDetailUseCase.execute(teacherUserId, query.includeInactive);
  }

  /** Clases donde el usuario autenticado está matriculado como estudiante. */
  @Get('enrolled')
  listEnrolled(@CurrentUserId() requestingUserId: string, @Query() query: ListClassesQueryDto) {
    return this.listMyEnrollmentsUseCase.execute(requestingUserId, query.includeInactive);
  }

  /**
   * Todas las Class de la plataforma, ruta separada a propósito (mismo
   * criterio que `GET /organizations/all`): es la única con autorización de
   * ADMIN global.
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  listAll() {
    return this.listAllClassesUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() teacherUserId: string, @Body() dto: CreateClassDto) {
    return this.createClassUseCase.execute({ teacherUserId, ...dto });
  }

  /** Matrícula por código de invitación estático de la Class (issue #101). */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@CurrentUserId() requestingUserId: string, @Body() dto: JoinClassDto) {
    return this.joinClassUseCase.execute({ inviteCode: dto.inviteCode, requestingUserId });
  }

  @Get(':id/games')
  listGames(@CurrentUserId() requestingUserId: string, @Param('id') classId: string) {
    return this.listClassGamesUseCase.execute({ classId, requestingUserId });
  }

  @Post(':id/games')
  @HttpCode(HttpStatus.CREATED)
  addGame(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Body() dto: AddGameToClassDto,
  ) {
    return this.addGameToClassUseCase.execute({ classId, gameId: dto.gameId, requestingUserId });
  }

  @Delete(':id/games/:gameId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeGame(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.removeGameFromClassUseCase.execute({ classId, gameId, requestingUserId });
  }

  /** Archiva un juego dentro de la clase (issue #226): lo oculta sin desvincularlo. */
  @Patch(':id/games/:gameId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveGame(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.setClassGameArchivedUseCase.execute({
      classId,
      gameId,
      isArchived: true,
      requestingUserId,
    });
  }

  /** Restaura un juego archivado de la clase a la vista activa (issue #226). */
  @Patch(':id/games/:gameId/unarchive')
  @HttpCode(HttpStatus.NO_CONTENT)
  unarchiveGame(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('gameId') gameId: string,
  ) {
    return this.setClassGameArchivedUseCase.execute({
      classId,
      gameId,
      isArchived: false,
      requestingUserId,
    });
  }

  /**
   * Estudiantes matriculados de una clase puntual (issue #226, drill-down
   * "Estudiantes de la clase"): autoriza vía `ClassAccessResolver` (profesor
   * dueño, admin de la institución dueña de la clase, o admin global) — a
   * diferencia de `GET /classes/mine/detail`, que solo sirve las clases
   * propias del profesor autenticado.
   */
  @Get(':id/students')
  listStudents(@CurrentUserId() requestingUserId: string, @Param('id') classId: string) {
    return this.getClassStudentsUseCase.execute({ classId, requestingUserId });
  }

  /** El profesor dueño de la clase o un admin (institución/global) expulsa a un estudiante matriculado. */
  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('studentId') studentUserId: string,
  ) {
    return this.removeClassEnrollmentUseCase.execute({ classId, studentUserId, requestingUserId });
  }

  /**
   * Matrícula directa por el profesor, sin código de invitación (issue #133,
   * Frente C, CA-C2) — pensada para usarse junto a
   * `GET /organizations/:organizationId/students`.
   */
  @Post(':classId/enrollments')
  @HttpCode(HttpStatus.CREATED)
  enrollStudent(
    @CurrentUserId() requestingUserId: string,
    @Param('classId') classId: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.enrollStudentUseCase.execute({
      classId,
      userId: dto.userId,
      requestingUserId,
    });
  }

  /** Soft-delete de la clase (issue #133, Frente E, CA-E2). */
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@CurrentUserId() requestingUserId: string, @Param('id') classId: string) {
    return this.deactivateClassUseCase.execute({ classId, requestingUserId });
  }

  /** Restaura la clase a la vista de "activas" (issue #133, Frente E, CA-E2). */
  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  reactivate(@CurrentUserId() requestingUserId: string, @Param('id') classId: string) {
    return this.reactivateClassUseCase.execute({ classId, requestingUserId });
  }
}
