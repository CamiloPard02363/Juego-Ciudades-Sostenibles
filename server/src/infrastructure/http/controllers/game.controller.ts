import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma/prisma.service.js';
import { SearchGamesQueryDto } from '../dtos/search-games-query.dto.js';

@Controller('games')
export class GameController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query() query: SearchGamesQueryDto) {
    const search = query.search?.trim();

    // `contains` compila a un LIKE/ILIKE parametrizado: el texto de
    // búsqueda nunca se concatena en el SQL, así que no es inyectable.
    const games = await this.prisma.gameModel.findMany({
      where: search ? { title: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { title: 'asc' },
    });

    return games.map((game) => ({ id: game.id, title: game.title }));
  }
}
