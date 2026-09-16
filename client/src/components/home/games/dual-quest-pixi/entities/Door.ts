import Matter from 'matter-js';
import { Container, Graphics, Ticker } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { LinkSystem } from '../systems/LinkSystem';
import type { DoorDef } from '../dualQuestPixiTypes';

const SLIDE_SPEED_PX_PER_MS = 0.35;

/**
 * Puerta/compuerta: cuerpo sólido y estático que se retrae hacia arriba
 * cuando su combinación de señales (AND/OR sobre `requires`) está activa.
 * El cuerpo físico se saca del mundo mientras está abierta en vez de
 * dejarlo ahí como sensor — así ningún jugador puede "colarse a medias"
 * durante la animación.
 */
export class DoorEntity {
  readonly id: string;
  readonly body: Matter.Body;
  readonly view: Container;
  private readonly world: Matter.World;
  private readonly height: number;
  private open = false;
  private slideProgress = 0; // 0 = cerrada, 1 = abierta

  constructor(def: DoorDef, world: Matter.World, link: LinkSystem) {
    this.id = def.id;
    this.world = world;
    this.height = def.height;

    this.body = Matter.Bodies.rectangle(def.x, def.y, def.width, def.height, {
      label: `door:${def.id}`,
      isStatic: true,
      collisionFilter: { category: Category.TERRAIN },
    });
    Matter.World.add(world, this.body);

    const g = new Graphics();
    g.rect(-def.width / 2, -def.height / 2, def.width, def.height).fill(0x1e293b).stroke({ width: 2, color: 0x0f172a });
    this.view = new Container();
    this.view.addChild(g);
    this.view.position.set(def.x, def.y);

    link.watch(def.requires, () => {
      this.setOpen(link.evaluate(def.requires, def.logic));
    });
  }

  private setOpen(shouldBeOpen: boolean): void {
    if (shouldBeOpen === this.open) return;
    this.open = shouldBeOpen;
    if (shouldBeOpen) {
      Matter.World.remove(this.world, this.body);
    } else {
      Matter.World.add(this.world, this.body);
    }
  }

  /** Anima la hoja visual retrayéndose — puramente cosmético, la física
   * ya cambió instantáneamente en setOpen() para no dar falsas aperturas. */
  update(ticker: Ticker): void {
    const target = this.open ? 1 : 0;
    const step = (SLIDE_SPEED_PX_PER_MS * ticker.deltaMS) / this.height;
    this.slideProgress += Math.sign(target - this.slideProgress) * Math.min(step, Math.abs(target - this.slideProgress));
    this.view.pivot.y = 0;
    this.view.y = this.body.position.y - this.slideProgress * this.height;
    this.view.alpha = 1 - this.slideProgress * 0.85;
  }
}
