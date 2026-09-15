import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category, Mask } from '../engine/PhysicsWorld';
import type { Vec2 } from '../dualQuestPixiTypes';

/**
 * Bloque pesado empujable: cuerpo dinámico con fricción alta (para que no
 * resbale solo) y densidad alta (para que cueste empujarlo — el jugador
 * lo mueve por fuerza de contacto, no hay ninguna tecla de "agarrar").
 * Sirve como peso muerto sobre botones de presión, tal como un jugador.
 */
export class PushableCrate {
  readonly body: Matter.Body;
  readonly view: Container;

  constructor(at: Vec2, size: number) {
    this.body = Matter.Bodies.rectangle(at.x, at.y, size, size, {
      label: 'crate',
      friction: 0.9,
      frictionAir: 0.02,
      density: 0.006, // más denso que un jugador: empujarlo cuesta, no es gratis
      collisionFilter: { category: Category.CRATE, mask: Mask.CRATE },
    });

    const g = new Graphics();
    g.roundRect(-size / 2, -size / 2, size, size, 4).fill(0xb45309).stroke({ width: 3, color: 0x78350f });
    g.moveTo(-size / 2, -size / 2).lineTo(size / 2, size / 2);
    g.moveTo(size / 2, -size / 2).lineTo(-size / 2, size / 2);
    g.stroke({ width: 2, color: 0x78350f, alpha: 0.6 });

    this.view = new Container();
    this.view.addChild(g);
  }

  syncView(): void {
    this.view.position.set(this.body.position.x, this.body.position.y);
    this.view.rotation = this.body.angle;
  }
}
