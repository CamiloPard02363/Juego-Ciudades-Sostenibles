import { Injectable } from '@nestjs/common';
import type { TournamentStore, TournamentState } from '../../domain/ports/tournament-store.port.js';

@Injectable()
export class InMemoryTournamentStore implements TournamentStore {
  private readonly tournaments = new Map<string, TournamentState>();

  create(tournament: TournamentState): void {
    this.tournaments.set(tournament.code, tournament);
  }

  get(code: string): TournamentState | undefined {
    return this.tournaments.get(code);
  }

  set(tournament: TournamentState): void {
    this.tournaments.set(tournament.code, tournament);
  }

  delete(code: string): void {
    this.tournaments.delete(code);
  }

  findBySocketId(socketId: string): TournamentState | undefined {
    for (const tournament of this.tournaments.values()) {
      if (tournament.participants.some((participant) => participant.socketId === socketId)) {
        return tournament;
      }
    }
    return undefined;
  }
}
