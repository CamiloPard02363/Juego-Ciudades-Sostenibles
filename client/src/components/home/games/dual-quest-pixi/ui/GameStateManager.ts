import { TypedEmitter } from '../engine/TypedEmitter';
import type { GameEventMap, LevelDef, PuzzlePieceDef, Role } from '../dualQuestPixiTypes';

/**
 * Dueño del estado de progreso (fichas recogidas, si el nivel terminó) y
 * de las pausas pedagógicas. Deliberadamente NO dibuja nada: emite
 * eventos tipados y quien esté al otro lado (el wrapper de React, en este
 * proyecto) decide cómo se ve el HUD y el popup — así el motor Pixi nunca
 * tiene que renderizar párrafos de texto, que es exactamente lo que un
 * motor de canvas/WebGL hace peor que el DOM.
 */
export class GameStateManager extends TypedEmitter<GameEventMap> {
  private readonly level: LevelDef;
  private readonly collected = new Set<string>();
  private paused = false;
  private completed = false;

  constructor(level: LevelDef) {
    super();
    this.level = level;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** Llamar cuando un jugador solapa el sensor de una ficha aún no recogida. */
  collectPiece(piece: PuzzlePieceDef): void {
    if (this.collected.has(piece.id)) return;
    this.collected.add(piece.id);
    this.paused = true; // el bucle de física/input debe consultar isPaused()

    this.emit('piece-collected', {
      pieceId: piece.id,
      total: this.level.puzzlePieces.length,
      collected: this.collected.size,
    });
  }

  hasAllPieces(): boolean {
    return this.collected.size === this.level.puzzlePieces.length;
  }

  /** Disparado por DualQuestPixiGame cuando, además de tener todas las
   * fichas, los dos jugadores están juntos parados en el portal — el
   * "Gran Final" es la recompensa de completar el nivel, no solo de
   * haber juntado el rompecabezas en cualquier punto del mapa. */
  completeLevel(): void {
    if (this.completed || !this.hasAllPieces()) return;
    this.completed = true;
    this.emit('level-complete', {
      levelId: this.level.id,
      collected: this.collected.size,
      total: this.level.puzzlePieces.length,
    });
  }

  /** El wrapper de React llama esto cuando el jugador cierra el popup. */
  resume(): void {
    this.paused = false;
  }

  reportDeath(role: Role, cause: 'WATER' | 'LAVA' | 'WASTE'): void {
    this.emit('player-died', { role, cause });
  }

  getPuzzlePieceById(id: string): PuzzlePieceDef | undefined {
    return this.level.puzzlePieces.find((p) => p.id === id);
  }

  getProgress(): { collected: number; total: number } {
    return { collected: this.collected.size, total: this.level.puzzlePieces.length };
  }
}
