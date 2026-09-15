import Matter from 'matter-js';
import { Container, Graphics, FillGradient } from 'pixi.js';
import type { InputController } from '../engine/InputController';
import { Category, Mask } from '../engine/PhysicsWorld';
import type { Role, Vec2 } from '../dualQuestPixiTypes';

const PLAYER_SIZE = 42;
const MOVE_FORCE = 0.0022;
const MAX_MOVE_SPEED = 5.2;
const JUMP_VELOCITY = -11.5;
const SWIM_VERTICAL_SPEED = 2.6;

interface PlayerOptions {
  role: Role;
  start: Vec2;
  input: InputController;
}

/**
 * Un jugador = un body Matter + un sprite Pixi + un InputController propio.
 * La regla pedagógica central vive aquí, no en el nivel: cada rol nada
 * libre en su propio líquido y muere instantáneamente en el del otro —
 * el nivel solo decide DÓNDE hay agua/lava, nunca qué le hace a quién.
 */
export class Player {
  readonly role: Role;
  readonly body: Matter.Body;
  readonly view: Container;
  private readonly input: InputController;
  private groundContacts = 0;
  private inOwnLiquid = false;
  private facing: 1 | -1 = 1;
  private alive = true;

  constructor({ role, start, input }: PlayerOptions) {
    this.role = role;
    this.input = input;

    this.body = Matter.Bodies.rectangle(start.x, start.y, PLAYER_SIZE, PLAYER_SIZE, {
      label: `player:${role}`,
      inertia: Infinity, // no rotar por golpes laterales — se siente mal en un plataformas
      friction: 0.02,
      frictionAir: 0.01,
      restitution: 0,
      collisionFilter: {
        category: role === 'FIRE' ? Category.FIRE_PLAYER : Category.WATER_PLAYER,
        mask: role === 'FIRE' ? Mask.FIRE_PLAYER : Mask.WATER_PLAYER,
      },
    });

    this.view = this.buildView(role);
  }

  private buildView(role: Role): Container {
    const c = new Container();
    const g = new Graphics();

    const gradient = new FillGradient({
      type: 'radial',
      center: { x: 0.4, y: 0.4 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.6,
      colorStops:
        role === 'FIRE'
          ? [
              { offset: 0, color: 0xfff3b0 },
              { offset: 0.5, color: 0xffd166 },
              { offset: 1, color: 0xd62828 },
            ]
          : [
              { offset: 0, color: 0x90e0ef },
              { offset: 0.5, color: 0x00b4d8 },
              { offset: 1, color: 0x03045e },
            ],
      textureSpace: 'local',
    });

    g.circle(0, 0, PLAYER_SIZE / 2).fill(gradient);
    g.circle(-8, -6, 3).fill(0x212529);
    g.circle(8, -6, 3).fill(0x212529);
    c.addChild(g);
    return c;
  }

  /** Sensor de líquido propio activo/inactivo — lo llama PhysicsWorld en
   * el evento de colisión, el Player no conoce la geometría del nivel. */
  setInOwnLiquid(active: boolean): void {
    this.inOwnLiquid = active;
  }

  isInOwnLiquid(): boolean {
    return this.inOwnLiquid;
  }

  isAlive(): boolean {
    return this.alive;
  }

  kill(): void {
    this.alive = false;
    Matter.Body.setStatic(this.body, true);
  }

  respawn(at: Vec2): void {
    this.alive = true;
    Matter.Body.setStatic(this.body, false);
    Matter.Body.setPosition(this.body, at);
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
  }

  /** Llamar una vez por frame, antes de Matter.Engine.update. */
  update(): void {
    if (!this.alive) return;
    const input = this.input.poll();

    if (input.left) this.facing = -1;
    if (input.right) this.facing = 1;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vel = this.body.velocity;

    if (this.inOwnLiquid) {
      // Nadar: gravedad casi nula, control vertical directo — se siente
      // deliberadamente distinto a caminar, no es "caminar pero mojado".
      Matter.Body.setVelocity(this.body, {
        x: clamp(vel.x + dir * MOVE_FORCE * 40, -MAX_MOVE_SPEED * 0.8, MAX_MOVE_SPEED * 0.8),
        y: clamp(
          vel.y + (input.jump ? -SWIM_VERTICAL_SPEED : input.down ? SWIM_VERTICAL_SPEED : vel.y * 0.08),
          -SWIM_VERTICAL_SPEED,
          SWIM_VERTICAL_SPEED,
        ),
      });
    } else {
      Matter.Body.applyForce(this.body, this.body.position, { x: dir * MOVE_FORCE, y: 0 });
      if (Math.abs(vel.x) > MAX_MOVE_SPEED) {
        Matter.Body.setVelocity(this.body, { x: Math.sign(vel.x) * MAX_MOVE_SPEED, y: vel.y });
      }
      if (input.jump && this.groundContacts > 0) {
        Matter.Body.setVelocity(this.body, { x: vel.x, y: JUMP_VELOCITY });
        this.groundContacts = 0; // el salto siempre despega, aunque hubiera más de un contacto activo
      }
    }

    this.view.position.set(this.body.position.x, this.body.position.y);
    this.view.scale.x = this.facing;
  }

  /** DualQuestPixiGame llama esto en cada collisionStart/End con terreno.
   * Se cuenta por contactos, no por booleano, porque un jugador puede
   * tocar dos plataformas a la vez (p. ej. a caballo entre dos bordes) —
   * un booleano se pondría en falso al soltar solo una y rompería el
   * salto mientras claramente sigue parado sobre la otra. */
  setGroundContact(delta: 1 | -1): void {
    this.groundContacts = Math.max(0, this.groundContacts + delta);
  }

  destroy(): void {
    this.input.destroy();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
