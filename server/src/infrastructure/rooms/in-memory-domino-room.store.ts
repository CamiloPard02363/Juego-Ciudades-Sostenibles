import { Injectable } from '@nestjs/common';
import type { DominoRoomStore, DominoRoomState } from '../../domain/ports/domino-room-store.port.js';

@Injectable()
export class InMemoryDominoRoomStore implements DominoRoomStore {
  private readonly rooms = new Map<string, DominoRoomState>();

  create(room: DominoRoomState): void {
    this.rooms.set(room.code, room);
  }

  get(code: string): DominoRoomState | undefined {
    return this.rooms.get(code);
  }

  set(room: DominoRoomState): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  findBySocketId(socketId: string): DominoRoomState | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }
}
