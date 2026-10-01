import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RecordGamePlayResultDto {
  @IsString()
  gameId!: string;

  @IsString()
  gameTitle!: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  subjectName?: string;

  @IsInt()
  @Min(0)
  score!: number;

  @IsInt()
  @Min(0)
  correctCount!: number;

  @IsInt()
  @Min(0)
  incorrectCount!: number;

  @IsInt()
  @Min(0)
  timePlayedMs!: number;
}
