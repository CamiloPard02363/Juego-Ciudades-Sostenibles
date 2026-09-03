import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchGamesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
