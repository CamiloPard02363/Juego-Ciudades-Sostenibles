import { Injectable } from '@nestjs/common';
import type { RoomStore, RoomState } from '../../domain/ports/room-store.port.js';

@Injectable()
export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomState>();

  create(room: RoomState): void {
    this.rooms.set(room.code, room);
  }

  get(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  set(room: RoomState): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  findBySocketId(socketId: string): RoomState | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }
}
