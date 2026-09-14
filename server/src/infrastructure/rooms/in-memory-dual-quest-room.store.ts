import { Injectable } from '@nestjs/common';
import type { DualQuestRoomStore, DualQuestRoomState } from '../../domain/ports/dual-quest-room-store.port.js';

@Injectable()
export class InMemoryDualQuestRoomStore implements DualQuestRoomStore {
  private readonly rooms = new Map<string, DualQuestRoomState>();

  create(room: DualQuestRoomState): void {
    this.rooms.set(room.code, room);
  }

  get(code: string): DualQuestRoomState | undefined {
    return this.rooms.get(code);
  }

  set(room: DualQuestRoomState): void {
    this.rooms.set(room.code, room);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  findBySocketId(socketId: string): DualQuestRoomState | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }
}
