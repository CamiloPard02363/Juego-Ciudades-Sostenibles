import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { PuzzlePieceDef } from '../dualQuestPixiTypes';

/**
 * Ficha de rompecabezas coleccionable — deliberadamente no se llama
 * "gema": la idea de producto es que cada una es un fragmento de un
 * concepto de ciudad sostenible, no un punto de puntaje. El color de su
 * textura viene de `def.color`, así cada concepto se distingue a simple
 * vista igual que en el prototipo (amarillo=energía, azul=agua, etc.).
 */
export class PuzzlePieceEntity {
  readonly def: PuzzlePieceDef;
  readonly sensor: Matter.Body;
  readonly view: Container;
  private collected = false;

  constructor(def: PuzzlePieceDef, texture: Texture) {
    this.def = def;
    this.sensor = Matter.Bodies.circle(def.x, def.y, 16, {
      label: `piece:${def.id}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.SENSOR },
    });

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    sprite.height = 32;
    sprite.width = (32 * texture.width) / texture.height;

    this.view = new Container();
    this.view.addChild(sprite);
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
