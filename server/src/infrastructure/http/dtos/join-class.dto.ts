import { IsString, Length } from 'class-validator';

export class JoinClassDto {
  @IsString()
  @Length(6, 6)
  inviteCode!: string;
}
