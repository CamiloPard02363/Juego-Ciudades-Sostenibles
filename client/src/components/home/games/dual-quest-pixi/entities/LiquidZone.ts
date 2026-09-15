import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { LiquidZoneDef } from '../dualQuestPixiTypes';

/**
 * Un canal/pozo de líquido — SIEMPRE definido con un ancho y un alto
 * dentro de la geometría del nivel (nunca una línea flotando en el aire):
 * quien arma el LevelDef es responsable de que esta zona esté encajada
 * entre paredes/piso reales. Es un sensor puro; qué le hace a cada rol
 * (nadar libre / morir) lo decide DualQuestPixiGame al leer `kind` y el
 * rol del cuerpo que entra, no esta clase.
 */
export class LiquidZoneEntity {
  readonly sensor: Matter.Body;
  readonly view: Container;
  readonly kind: LiquidZoneDef['kind'];

  constructor(def: LiquidZoneDef, texture: Texture) {
    this.kind = def.kind;
    this.sensor = Matter.Bodies.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, {
      label: `liquid:${def.kind}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.LIQUID_SENSOR },
    });

    const sprite = new Sprite(texture);
    sprite.width = def.width;
    sprite.height = def.height;

    this.view = new Container();
    this.view.addChild(sprite);
    this.view.position.set(def.x, def.y);
  }
}
