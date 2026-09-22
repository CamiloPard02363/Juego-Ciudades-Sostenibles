import { IsString, IsNotEmpty } from 'class-validator';

export class EnrollStudentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
