import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
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

  constructor(at: Vec2, size: number, texture: Texture) {
    this.body = Matter.Bodies.rectangle(at.x, at.y, size, size, {
      label: 'crate',
      friction: 0.9,
      frictionAir: 0.02,
      density: 0.006, // más denso que un jugador: empujarlo cuesta, no es gratis
      collisionFilter: { category: Category.CRATE, mask: Mask.CRATE },
    });

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    sprite.width = size;
    sprite.height = size;

    this.view = new Container();
    this.view.addChild(sprite);
  }

  syncView(): void {
    this.view.position.set(this.body.position.x, this.body.position.y);
    this.view.rotation = this.body.angle;
  }
}
