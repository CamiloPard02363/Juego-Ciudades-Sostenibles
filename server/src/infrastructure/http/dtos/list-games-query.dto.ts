import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { VALID_GAME_TYPES } from '../../../domain/value-objects/game-type.vo.js';

export class ListGamesQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'FLAGGED', 'REMOVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'FLAGGED' | 'REMOVED';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyMine?: boolean;

  /** Sección "Comunidad": juegos publicados por otros usuarios, con el nombre del creador. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  community?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Filtro por tipo de juego exacto, usado por la vista de catálogo de tipos (issue #156). */
  @IsOptional()
  @IsIn(VALID_GAME_TYPES)
  gameType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
