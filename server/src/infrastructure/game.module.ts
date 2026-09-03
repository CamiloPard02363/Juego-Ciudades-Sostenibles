import { Module } from '@nestjs/common';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { GameController } from './http/controllers/game.controller.js';

@Module({
  controllers: [GameController],
  providers: [PrismaService],
})
export class GameModule {}
