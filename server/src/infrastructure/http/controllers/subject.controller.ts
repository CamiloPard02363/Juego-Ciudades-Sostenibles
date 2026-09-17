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
import { CreateRootSubjectUseCase } from '../../../application/use-cases/create-root-subject.use-case.js';
import { CreateSubSubjectUseCase } from '../../../application/use-cases/create-sub-subject.use-case.js';
import { ListSubjectsUseCase } from '../../../application/use-cases/list-subjects.use-case.js';
import { PublishSubjectUseCase } from '../../../application/use-cases/publish-subject.use-case.js';
import { DeleteSubjectUseCase } from '../../../application/use-cases/delete-subject.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateRootSubjectDto, CreateSubSubjectDto } from '../dtos/create-subject.dto.js';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectController {
  constructor(
    private readonly createRootSubjectUseCase: CreateRootSubjectUseCase,
    private readonly createSubSubjectUseCase: CreateSubSubjectUseCase,
    private readonly listSubjectsUseCase: ListSubjectsUseCase,
    private readonly publishSubjectUseCase: PublishSubjectUseCase,
    private readonly deleteSubjectUseCase: DeleteSubjectUseCase,
  ) {}

  @Post('root')
  @HttpCode(HttpStatus.CREATED)
  createRoot(@CurrentUserId() requestingUserId: string, @Body() dto: CreateRootSubjectDto) {
    return this.createRootSubjectUseCase.execute({ ...dto, requestingUserId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSub(@CurrentUserId() requestingUserId: string, @Body() dto: CreateSubSubjectDto) {
    return this.createSubSubjectUseCase.execute({ ...dto, requestingUserId });
  }

  @Get()
  list(@CurrentUserId() requestingUserId: string) {
    return this.listSubjectsUseCase.execute({ requestingUserId });
  }

  @Post(':id/publish')
  publish(@CurrentUserId() requestingUserId: string, @Param('id') subjectId: string) {
    return this.publishSubjectUseCase.execute({ subjectId, requestingUserId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUserId() requestingUserId: string, @Param('id') subjectId: string) {
    return this.deleteSubjectUseCase.execute({ subjectId, requestingUserId });
  }
}
