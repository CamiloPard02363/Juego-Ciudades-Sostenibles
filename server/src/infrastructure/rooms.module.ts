import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { AnalyticsModule } from './analytics.module.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { ROOM_STORE } from '../domain/ports/room-store.port.js';
import { TOURNAMENT_STORE } from '../domain/ports/tournament-store.port.js';
import { DOMINO_ROOM_STORE } from '../domain/ports/domino-room-store.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { InMemoryRoomStore } from './rooms/in-memory-room.store.js';
import { InMemoryTournamentStore } from './rooms/in-memory-tournament.store.js';
import { InMemoryDominoRoomStore } from './rooms/in-memory-domino-room.store.js';
import { RoomsGateway } from './rooms/rooms.gateway.js';

@Module({
  imports: [UserModule, AnalyticsModule],
  providers: [
    MongoService,
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    { provide: ROOM_STORE, useClass: InMemoryRoomStore },
    { provide: TOURNAMENT_STORE, useClass: InMemoryTournamentStore },
    { provide: DOMINO_ROOM_STORE, useClass: InMemoryDominoRoomStore },
    RoomsGateway,
  ],
})
export class RoomsModule {}
