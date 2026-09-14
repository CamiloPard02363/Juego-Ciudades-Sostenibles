import { Injectable } from '@nestjs/common';
import type {
  SnakesLaddersRoomStore,
  SnakesLaddersRoomState,
} from '../../domain/ports/snakes-ladders-room-store.port.js';

@Injectable()
export class InMemorySnakesLaddersRoomStore implements SnakesLaddersRoomStore {
  private readonly rooms = new Map<string, SnakesLaddersRoomState>();

  create(room: SnakesLaddersRoomState): void {
    this.rooms.set(room.code, room);
  }

  get(code: string): SnakesLaddersRoomState | undefined {
    return this.rooms.get(code);
  }

  set(room: SnakesLaddersRoomState): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  findBySocketId(socketId: string): SnakesLaddersRoomState | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }
}
