import Matter from 'matter-js';
import { Container, Graphics, Ticker } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { LinkSystem } from '../systems/LinkSystem';
import type { DoorDef } from '../dualQuestPixiTypes';

const SLIDE_SPEED_PX_PER_MS = 0.4;

/**
 * Lo opuesto de una puerta: por defecto NO hay nada ahí (un hueco real
 * sobre un canal — si nadie activó el interruptor, caerse es la
 * consecuencia física normal, no una ilusión), y el cuerpo sólido
 * aparece/se agrega al mundo solo cuando la combinación de señales se
 * cumple. Reutiliza el mismo `DoorDef` (posición + `requires` + `logic`)
 * porque la forma de los datos es idéntica; solo cambia qué hace con ellos.
 */
export class BridgeEntity {
  readonly id: string;
  readonly body: Matter.Body;
  readonly view: Container;
  private readonly world: Matter.World;
  private active = false;
  private inWorld = false;
  private slideProgress = 0;

  constructor(def: DoorDef, world: Matter.World, link: LinkSystem) {
    this.id = def.id;
    this.world = world;

    this.body = Matter.Bodies.rectangle(def.x, def.y, def.width, def.height, {
      label: `bridge:${def.id}`,
      isStatic: true,
      friction: 0.2,
      collisionFilter: { category: Category.TERRAIN },
    });
    // No se agrega al mundo todavía — el hueco empieza realmente vacío.

    const g = new Graphics();
    g.rect(-def.width / 2, -def.height / 2, def.width, def.height).fill(0x38bdf8).stroke({ width: 2, color: 0x0284c7 });
    this.view = new Container();
    this.view.addChild(g);
    this.view.position.set(def.x, def.y);
    this.view.visible = false;

    link.watch(def.requires, () => this.setActive(link.evaluate(def.requires, def.logic)));
  }

  private setActive(shouldBeActive: boolean): void {
    if (shouldBeActive === this.active) return;
    this.active = shouldBeActive;
    if (shouldBeActive && !this.inWorld) {
      Matter.World.add(this.world, this.body);
      this.inWorld = true;
    } else if (!shouldBeActive && this.inWorld) {
      Matter.World.remove(this.world, this.body);
      this.inWorld = false;
    }
  }

  update(ticker: Ticker): void {
    const target = this.active ? 1 : 0;
    const step = SLIDE_SPEED_PX_PER_MS * (ticker.deltaMS / 200);
    this.slideProgress += Math.sign(target - this.slideProgress) * Math.min(step, Math.abs(target - this.slideProgress));
    this.view.visible = this.slideProgress > 0.02;
    this.view.alpha = this.slideProgress;
    this.view.scale.y = 0.3 + this.slideProgress * 0.7;
  }
}
