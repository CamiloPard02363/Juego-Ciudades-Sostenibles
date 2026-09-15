import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';

/**
 * Zona de meta: el nivel se completa cuando AMBOS jugadores están dentro
 * a la vez (lo decide DualQuestPixiGame, contando ocupantes por rol) — no
 * cuando cualquiera de los dos llega solo. Requiere las fichas ya
 * recogidas para sentirse "abierto"; ver GameStateManager.
 */
export class PortalEntity {
  readonly sensor: Matter.Body;
  readonly view: Container;
  private readonly glow: Graphics;

  constructor(x: number, y: number, width: number, height: number) {
    this.sensor = Matter.Bodies.rectangle(x + width / 2, y + height / 2, width, height, {
      label: 'portal',
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.SENSOR },
    });

    this.glow = new Graphics();
    this.glow.roundRect(0, 0, width, height, 10).fill({ color: 0x9d4edd, alpha: 0.35 });
    this.view = new Container();
    this.view.addChild(this.glow);
    this.view.position.set(x, y);
  }

  setUnlocked(unlocked: boolean): void {
    this.glow.alpha = unlocked ? 0.7 : 0.2;
  }
}
