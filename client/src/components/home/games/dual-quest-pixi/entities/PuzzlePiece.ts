import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { PuzzlePieceDef } from '../dualQuestPixiTypes';

/**
 * Ficha de rompecabezas coleccionable — deliberadamente no se llama
 * "gema": la idea de producto es que cada una es un fragmento de un
 * concepto de ciudad sostenible, no un punto de puntaje.
 */
export class PuzzlePieceEntity {
  readonly def: PuzzlePieceDef;
  readonly sensor: Matter.Body;
  readonly view: Container;
  private collected = false;

  constructor(def: PuzzlePieceDef) {
    this.def = def;
    this.sensor = Matter.Bodies.circle(def.x, def.y, 16, {
      label: `piece:${def.id}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.SENSOR },
    });

    const g = new Graphics();
    g.poly([0, -16, 14, -4, 8, 16, -8, 16, -14, -4]).fill(0x73fbd3).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
    this.view = new Container();
    this.view.addChild(g);
    this.view.position.set(def.x, def.y);
  }

  isCollected(): boolean {
    return this.collected;
  }

  markCollected(): void {
    this.collected = true;
    this.view.visible = false;
  }
}
