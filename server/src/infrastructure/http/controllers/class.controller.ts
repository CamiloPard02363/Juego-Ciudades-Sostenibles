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
import { AddGameToClassUseCase } from '../../../application/use-cases/add-game-to-class.use-case.js';
import { RemoveGameFromClassUseCase } from '../../../application/use-cases/remove-game-from-class.use-case.js';
import { ListClassGamesUseCase } from '../../../application/use-cases/list-class-games.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateClassDto } from '../dtos/create-class.dto.js';
import { AddGameToClassDto } from '../dtos/add-game-to-class.dto.js';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassController {
  constructor(
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly listMyClassesUseCase: ListMyClassesUseCase,
    private readonly addGameToClassUseCase: AddGameToClassUseCase,
    private readonly removeGameFromClassUseCase: RemoveGameFromClassUseCase,
    private readonly listClassGamesUseCase: ListClassGamesUseCase,
  ) {}

  @Get('mine')
  listMine(@CurrentUserId() teacherUserId: string) {
    return this.listMyClassesUseCase.execute(teacherUserId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() teacherUserId: string, @Body() dto: CreateClassDto) {
    return this.createClassUseCase.execute({ teacherUserId, ...dto });
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
}
