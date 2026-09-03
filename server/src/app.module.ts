import { Module } from '@nestjs/common';
import { UserModule } from './infrastructure/user.module.js';
import { GameModule } from './infrastructure/game.module.js';

@Module({
  imports: [UserModule, GameModule],
})
export class AppModule {}
