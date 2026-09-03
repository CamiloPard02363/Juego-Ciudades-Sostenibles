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
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case.js';
import { GetGameByIdUseCase } from '../../../application/use-cases/get-game-by-id.use-case.js';
import { GetGameBySlugUseCase } from '../../../application/use-cases/get-game-by-slug.use-case.js';
import { ListGamesUseCase } from '../../../application/use-cases/list-games.use-case.js';
import { UpdateGameUseCase } from '../../../application/use-cases/update-game.use-case.js';
import { PublishGameUseCase } from '../../../application/use-cases/publish-game.use-case.js';
import { UnpublishGameUseCase } from '../../../application/use-cases/unpublish-game.use-case.js';
import { DeleteGameUseCase } from '../../../application/use-cases/delete-game.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CreateGameDto } from '../dtos/create-game.dto.js';
import { UpdateGameDto } from '../dtos/update-game.dto.js';
import { ListGamesQueryDto } from '../dtos/list-games-query.dto.js';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly getGameByIdUseCase: GetGameByIdUseCase,
    private readonly getGameBySlugUseCase: GetGameBySlugUseCase,
    private readonly listGamesUseCase: ListGamesUseCase,
    private readonly updateGameUseCase: UpdateGameUseCase,
    private readonly publishGameUseCase: PublishGameUseCase,
    private readonly unpublishGameUseCase: UnpublishGameUseCase,
    private readonly deleteGameUseCase: DeleteGameUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUserId() creatorUserId: string, @Body() dto: CreateGameDto) {
    return this.createGameUseCase.execute({ creatorUserId, ...dto });
  }

  @Get()
  list(@CurrentUserId() requestingUserId: string, @Query() query: ListGamesQueryDto) {
    return this.listGamesUseCase.execute({
      requestingUserId,
      status: query.status,
      onlyMine: query.onlyMine,
      search: query.search,
      categoryId: query.categoryId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('slug/:slug')
  getBySlug(@CurrentUserId() requestingUserId: string, @Param('slug') slug: string) {
    return this.getGameBySlugUseCase.execute({ slug, requestingUserId });
  }

  @Get(':id')
  getById(@CurrentUserId() requestingUserId: string, @Param('id') gameId: string) {
    return this.getGameByIdUseCase.execute({ gameId, requestingUserId });
  }

  @Patch(':id')
  update(
    @CurrentUserId() requestingUserId: string,
    @Param('id') gameId: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.updateGameUseCase.execute({ gameId, requestingUserId, ...dto });
  }

  @Patch(':id/publish')
  publish(@CurrentUserId() requestingUserId: string, @Param('id') gameId: string) {
    return this.publishGameUseCase.execute({ gameId, requestingUserId });
  }

  @Patch(':id/unpublish')
  unpublish(@CurrentUserId() requestingUserId: string, @Param('id') gameId: string) {
    return this.unpublishGameUseCase.execute({ gameId, requestingUserId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUserId() requestingUserId: string, @Param('id') gameId: string) {
    return this.deleteGameUseCase.execute({ gameId, requestingUserId });
  }
}
