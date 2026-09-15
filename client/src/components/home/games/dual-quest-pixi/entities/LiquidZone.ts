import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { LiquidZoneDef } from '../dualQuestPixiTypes';

const KIND_COLOR: Record<LiquidZoneDef['kind'], number> = {
  WATER: 0x0284c7,
  LAVA: 0xf97316,
  WASTE: 0x65a30d,
};

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

  constructor(def: LiquidZoneDef) {
    this.kind = def.kind;
    this.sensor = Matter.Bodies.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, {
      label: `liquid:${def.kind}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.LIQUID_SENSOR },
    });

    const g = new Graphics();
    g.rect(0, 0, def.width, def.height).fill({ color: KIND_COLOR[def.kind], alpha: 0.75 });
    this.view = new Container();
    this.view.addChild(g);
    this.view.position.set(def.x, def.y);
  }
}
