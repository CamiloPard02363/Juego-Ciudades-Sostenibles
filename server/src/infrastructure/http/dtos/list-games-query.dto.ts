import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
