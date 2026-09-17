import { IsString } from 'class-validator';

export class AddGameToClassDto {
  @IsString()
  gameId!: string;
}
