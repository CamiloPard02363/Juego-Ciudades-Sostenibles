import { IsString, MinLength } from 'class-validator';

export class CreateRootSubjectDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

export class CreateSubSubjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  parentSubjectId!: string;
}
