import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CreateClassUseCase } from '../../../application/use-cases/create-class.use-case.js';
import { ListMyClassesUseCase } from '../../../application/use-cases/list-my-classes.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateClassDto } from '../dtos/create-class.dto.js';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassController {
  constructor(
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly listMyClassesUseCase: ListMyClassesUseCase,
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
}
