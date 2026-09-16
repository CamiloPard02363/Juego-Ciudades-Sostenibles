import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { LinkSystem } from '../systems/LinkSystem';
import type { ButtonDef } from '../dualQuestPixiTypes';

/**
 * Botón de presión o palanca, según `def.momentary`. Es un sensor Matter
 * (no bloquea nada físicamente) que cuenta cuántos cuerpos válidos lo
 * están tocando — jugador, caja empujable o el perro, todos cuentan igual,
 * que es justo lo que permite el flujo "el perro sostiene el botón".
 */
export class ButtonEntity {
  readonly id: string;
  readonly sensor: Matter.Body;
  readonly view: Container;
  private readonly momentary: boolean;
  private readonly link: LinkSystem;
  private occupants = 0;
  private toggledOn = false;
  private readonly cap: Graphics;

  constructor(def: ButtonDef, link: LinkSystem) {
    this.id = def.id;
    this.momentary = def.momentary;
    this.link = link;

    this.sensor = Matter.Bodies.rectangle(def.x, def.y, 40, 14, {
      label: `button:${def.id}`,
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.SENSOR },
    });

    const g = new Graphics();
    g.roundRect(-20, -4, 40, 10, 3).fill(0x334155).stroke({ width: 1.5, color: 0x0f172a });
    this.cap = new Graphics();
    this.cap.roundRect(-16, -8, 32, 8, 3).fill(this.momentary ? 0xfacc15 : 0x38bdf8);
    this.view = new Container();
    this.view.addChild(g, this.cap);
    this.view.position.set(def.x, def.y);
  }

  /** Llamado por PhysicsWorld en collisionStart/End contra este sensor. */
  onOccupantChange(delta: 1 | -1): void {
    const wasEmpty = this.occupants === 0;
    this.occupants = Math.max(0, this.occupants + delta);

    // Palanca (no-momentánea): invierte su estado en el instante en que
    // algo empieza a tocarla, y se queda así al soltarla — un botón de
    // presión, en cambio, solo está activo mientras algo lo pisa.
    if (!this.momentary && wasEmpty && this.occupants > 0) {
      this.toggledOn = !this.toggledOn;
    }

    const active = this.momentary ? this.occupants > 0 : this.toggledOn;
    this.cap.y = active ? 3 : 0;
    this.link.setSignal(this.id, active);
  }
}
