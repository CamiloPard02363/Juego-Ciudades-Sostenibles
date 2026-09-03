import { Module } from '@nestjs/common';
import { UserModule } from './infrastructure/user.module.js';
import { GameModule } from './infrastructure/game.module.js';
import { CategoryModule } from './infrastructure/category.module.js';
import { UploadModule } from './infrastructure/upload.module.js';

@Module({
  imports: [UserModule, GameModule, CategoryModule, UploadModule],
})
export class AppModule {}
