import { Module } from '@nestjs/common';
import { UserModule } from './user.module.js';
import { GAME_REPOSITORY } from '../domain/ports/game.repository.port.js';
import { ROOM_STORE } from '../domain/ports/room-store.port.js';
import { MongoService } from './persistence/mongo/mongo.service.js';
import { MongoGameRepository } from './persistence/mongo/mongo-game.repository.js';
import { InMemoryRoomStore } from './rooms/in-memory-room.store.js';
import { RoomsGateway } from './rooms/rooms.gateway.js';

@Module({
  imports: [UserModule],
  providers: [
    MongoService,
    { provide: GAME_REPOSITORY, useClass: MongoGameRepository },
    { provide: ROOM_STORE, useClass: InMemoryRoomStore },
    RoomsGateway,
  ],
})
export class RoomsModule {}
