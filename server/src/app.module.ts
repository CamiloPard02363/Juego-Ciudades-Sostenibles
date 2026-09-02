import { Module } from '@nestjs/common';
import { UserModule } from './infrastructure/user.module.js';

@Module({
  imports: [UserModule],
})
export class AppModule {}
