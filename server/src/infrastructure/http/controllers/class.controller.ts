import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateClassUseCase } from '../../../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../../../application/use-cases/list-my-classes.use-case.js';
import { ListAllClassesUseCase } from '../../../application/use-cases/list-all-classes.use-case.js';
import { AddGameToClassUseCase } from '../../../application/use-cases/add-game-to-class.use-case.js';
import { RemoveGameFromClassUseCase } from '../../../application/use-cases/remove-game-from-class.use-case.js';
import { ListClassGamesUseCase } from '../../../application/use-cases/list-class-games.use-case.js';
import { JoinClassUseCase } from '../../../application/use-cases/join-class.use-case.js';
import { ListMyEnrollmentsUseCase } from '../../../application/use-cases/list-my-enrollments.use-case.js';
import { RemoveClassEnrollmentUseCase } from '../../../application/use-cases/remove-class-enrollment.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateClassDto } from '../dtos/create-class.dto.js';
import { AddGameToClassDto } from '../dtos/add-game-to-class.dto.js';
import { JoinClassDto } from '../dtos/join-class.dto.js';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassController {
  constructor(
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly listMyClassesUseCase: ListMyClassesUseCase,
    private readonly listAllClassesUseCase: ListAllClassesUseCase,
    private readonly addGameToClassUseCase: AddGameToClassUseCase,
    private readonly removeGameFromClassUseCase: RemoveGameFromClassUseCase,
    private readonly listClassGamesUseCase: ListClassGamesUseCase,
    private readonly joinClassUseCase: JoinClassUseCase,
    private readonly listMyEnrollmentsUseCase: ListMyEnrollmentsUseCase,
    private readonly removeClassEnrollmentUseCase: RemoveClassEnrollmentUseCase,
  ) {}

  @Get('mine')
  listMine(@CurrentUserId() teacherUserId: string) {
    return this.listMyClassesUseCase.execute(teacherUserId);
  }

  /** Clases donde el usuario autenticado está matriculado como estudiante. */
  @Get('enrolled')
  listEnrolled(@CurrentUserId() requestingUserId: string) {
    return this.listMyEnrollmentsUseCase.execute(requestingUserId);
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

  /** El profesor dueño de la clase expulsa a un estudiante matriculado. */
  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @CurrentUserId() requestingUserId: string,
    @Param('id') classId: string,
    @Param('studentId') studentUserId: string,
  ) {
    return this.removeClassEnrollmentUseCase.execute({ classId, studentUserId, requestingUserId });
  }
}
