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
import { CreateCategoryUseCase } from '../../../application/use-cases/create-category.use-case.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/list-categories.use-case.js';
import { DeleteCategoryUseCase } from '../../../application/use-cases/delete-category.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() creatorUserId: string, @Body() dto: CreateCategoryDto) {
    return this.createCategoryUseCase.execute({ ...dto, creatorUserId });
  }

  @Get()
  list() {
    return this.listCategoriesUseCase.execute();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUserId() requestingUserId: string, @Param('id') categoryId: string) {
    return this.deleteCategoryUseCase.execute({ categoryId, requestingUserId });
  }
}
