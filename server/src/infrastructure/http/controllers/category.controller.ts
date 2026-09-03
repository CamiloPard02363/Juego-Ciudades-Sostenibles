import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CreateCategoryUseCase } from '../../../application/use-cases/create-category.use-case.js';
import { ListCategoriesUseCase } from '../../../application/use-cases/list-categories.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateCategoryDto } from '../dtos/create-category.dto.js';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCategoryDto) {
    return this.createCategoryUseCase.execute(dto);
  }

  @Get()
  list() {
    return this.listCategoriesUseCase.execute();
  }
}
