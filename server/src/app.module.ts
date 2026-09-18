import { Module } from '@nestjs/common';
import { UserModule } from './infrastructure/user.module.js';
import { GameModule } from './infrastructure/game.module.js';
import { OrganizationModule } from './infrastructure/organization.module.js';
import { SubjectModule } from './infrastructure/subject.module.js';
import { UploadModule } from './infrastructure/upload.module.js';
import { RoomsModule } from './infrastructure/rooms.module.js';
import { AnalyticsModule } from './infrastructure/analytics.module.js';
import { ClassModule } from './infrastructure/class.module.js';

@Module({
  imports: [UserModule, OrganizationModule, GameModule, SubjectModule, ClassModule, UploadModule, RoomsModule, AnalyticsModule],
})
export class AppModule {}
