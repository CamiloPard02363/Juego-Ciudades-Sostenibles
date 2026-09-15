import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category, Mask } from '../engine/PhysicsWorld';
import type { Vec2 } from '../dualQuestPixiTypes';

const WALK_SPEED = 3.4;
const ARRIVE_THRESHOLD_PX = 6;

type DogCommand = { kind: 'idle' } | { kind: 'move-to'; target: Vec2 } | { kind: 'hold' };

/**
 * Perro ayudante (schnauzer): no lo controla nadie directamente — recibe
 * comandos puntuales ("ve aquí", "quédate quieto") desde quien lo llame
 * (normalmente el jugador que está parado cerca de él, decidido por la
 * escena/nivel, no por esta clase). Al llegar a destino se queda quieto
 * por sí solo; el efecto de "sostener el botón" sale gratis porque su
 * cuerpo físico sigue ahí encima del sensor, igual que un jugador o caja.
 */
export class HelperDog {
  readonly body: Matter.Body;
  readonly view: Container;
  private command: DogCommand = { kind: 'idle' };
  private facing: 1 | -1 = 1;

  constructor(start: Vec2) {
    this.body = Matter.Bodies.rectangle(start.x, start.y, 34, 24, {
      label: 'helper-dog',
      friction: 0.05,
      frictionAir: 0.02,
      inertia: Infinity,
      collisionFilter: { category: Category.DOG, mask: Mask.DOG },
    });

    const g = new Graphics();
    g.roundRect(-17, -8, 34, 16, 6).fill(0x475569); // cuerpo
    g.roundRect(10, -14, 12, 12, 3).fill(0x475569); // cabeza
    g.roundRect(-17, 8, 8, 8, 2).fill(0x334155); // patas
    g.roundRect(9, 8, 8, 8, 2).fill(0x334155);
    this.view = new Container();
    this.view.addChild(g);
  }

  commandMoveTo(target: Vec2): void {
    this.command = { kind: 'move-to', target };
  }

  commandHold(): void {
    this.command = { kind: 'hold' };
  }

  /** Llamar una vez por frame, antes de Matter.Engine.update. */
  update(): void {
    if (this.command.kind === 'move-to') {
      const dx = this.command.target.x - this.body.position.x;
      if (Math.abs(dx) <= ARRIVE_THRESHOLD_PX) {
        Matter.Body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
        this.command = { kind: 'hold' };
      } else {
        this.facing = dx > 0 ? 1 : -1;
        Matter.Body.setVelocity(this.body, { x: Math.sign(dx) * WALK_SPEED, y: this.body.velocity.y });
      }
    } else {
      Matter.Body.setVelocity(this.body, { x: 0, y: this.body.velocity.y });
    }

    this.view.position.set(this.body.position.x, this.body.position.y);
    this.view.scale.x = this.facing;
  }
}
