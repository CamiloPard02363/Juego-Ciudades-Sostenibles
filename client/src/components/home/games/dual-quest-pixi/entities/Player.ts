import Matter from 'matter-js';
import { Container, Sprite } from 'pixi.js';
import type { InputController } from '../engine/InputController';
import { Category, Mask } from '../engine/PhysicsWorld';
import { getCharacterArt, type CharacterArt } from '../render/characterArt';
import type { Assets } from '../render/AssetLibrary';
import type { Role, Vec2 } from '../dualQuestPixiTypes';

const PLAYER_SIZE = 42;
const MOVE_FORCE = 0.0022;
const MAX_MOVE_SPEED = 5.2;
const JUMP_VELOCITY = -11.5;
const SWIM_VERTICAL_SPEED = 2.6;

// Amplitudes y periodos calcados de los @keyframes del prototipo CSS
// (walk-leg-l/r, walk-arm-l/r, swim-leg-l/r) para que el ciclo se sienta
// idéntico en Pixi — ahí eran grados de `rotate()`, aquí son radianes.
const DEG = Math.PI / 180;
const WALK_LEG_AMPLITUDE = 18 * DEG; // CSS: 20deg / -16deg, promediado y simetrizado
const WALK_ARM_AMPLITUDE = 12 * DEG;
const SWIM_LEG_AMPLITUDE = 18 * DEG; // CSS: 26deg / -10deg
const WALK_CYCLE_MS = 260;
const SWIM_CYCLE_MS = 420;
const IDLE_BOB_MS = 2200;
const IDLE_BOB_PX = 1.4;
const WALK_BOB_PX = 2.4;

interface PlayerOptions {
  role: Role;
  start: Vec2;
  input: InputController;
  assets: Assets;
}

/**
 * Un jugador = un body Matter + un sprite Pixi articulado + un
 * InputController propio. La regla pedagógica central vive aquí, no en
 * el nivel: cada rol nada libre en su propio líquido y muere
 * instantáneamente en el del otro — el nivel solo decide DÓNDE hay
 * agua/lava, nunca qué le hace a quién.
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

  private readonly bob: Container;
  private readonly armL: Sprite;
  private readonly armR: Sprite;
  private readonly legL: Sprite;
  private readonly legR: Sprite;
  private animClock = 0;
  private animMode: 'idle' | 'walk' | 'swim' = 'idle';

  constructor({ role, start, input, assets }: PlayerOptions) {
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

    const art = getCharacterArt(role);
    const textures = role === 'FIRE' ? assets.fire : assets.water;

    // Cada extremidad es su propio sprite con ancla = pivote/120 (hombro o
    // cadera en el mismo espacio 0-120 del SVG original) — así rotar el
    // sprite gira el trazo real desde la articulación correcta, igual que
    // `transform-origin` en el prototipo CSS.
    const makeLimb = (limbArt: CharacterArt['armL'], texture: (typeof textures)['armL']): Sprite => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(limbArt.pivot.x / 120, limbArt.pivot.y / 120);
      sprite.position.set(limbArt.pivot.x - 60, limbArt.pivot.y - 60); // recentrado: el body también está centrado en (0,0)
      return sprite;
    };

    this.legL = makeLimb(art.legL, textures.legL);
    this.legR = makeLimb(art.legR, textures.legR);
    this.armL = makeLimb(art.armL, textures.armL);
    this.armR = makeLimb(art.armR, textures.armR);

    const body = new Sprite(textures.body);
    body.anchor.set(0.5, 0.5); // el body sí está centrado — es la referencia (0,0) del personaje

    // Orden de pintado idéntico al SVG original: brazos y piernas debajo,
    // cuerpo+cara arriba de todo.
    this.bob = new Container();
    this.bob.addChild(this.legL, this.legR, this.armL, this.armR, body);
    // El SVG fuente es un lienzo de 120x120 con el personaje centrado en
    // (60,60) — igual que en CSS, donde `.actor svg{width:100%}` mapeaba
    // ese mismo lienzo 1:1 al tamaño real del personaje en pantalla. Como
    // cada sprite ya se recentró en la construcción, un solo scale aquí
    // reproduce esa misma proporción exacta sin recalcular cada pivote.
    this.bob.scale.set(PLAYER_SIZE / 120);

    this.view = new Container();
    this.view.addChild(this.bob);
  }

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
    this.view.alpha = 1;
  }

  /** Llamar una vez por frame, antes de Matter.Engine.update. */
  update(deltaMs: number): void {
    if (!this.alive) return;
    const input = this.input.poll();

    if (input.left) this.facing = -1;
    if (input.right) this.facing = 1;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vel = this.body.velocity;

    if (this.inOwnLiquid) {
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

    const moving = dir !== 0;
    this.animMode = this.inOwnLiquid ? 'swim' : this.groundContacts > 0 && moving ? 'walk' : 'idle';
    this.animate(deltaMs);

    this.view.position.set(this.body.position.x, this.body.position.y);
    this.view.scale.x = this.facing;
  }

  private animate(deltaMs: number): void {
    this.animClock += deltaMs;

    if (this.animMode === 'idle') {
      const t = (this.animClock % IDLE_BOB_MS) / IDLE_BOB_MS;
      this.bob.y = -Math.abs(Math.sin(t * Math.PI)) * IDLE_BOB_PX;
      this.legL.rotation = this.legR.rotation = this.armL.rotation = this.armR.rotation = 0;
      return;
    }

    const cycleMs = this.animMode === 'swim' ? SWIM_CYCLE_MS : WALK_CYCLE_MS;
    const legAmp = this.animMode === 'swim' ? SWIM_LEG_AMPLITUDE : WALK_LEG_AMPLITUDE;
    const phase = (this.animClock % cycleMs) / cycleMs; // 0..1
    const wave = Math.sin(phase * Math.PI * 2);

    this.legL.rotation = wave * legAmp;
    this.legR.rotation = -wave * legAmp;
    this.armL.rotation = -wave * WALK_ARM_AMPLITUDE;
    this.armR.rotation = wave * WALK_ARM_AMPLITUDE;
    this.bob.y = this.animMode === 'walk' ? -Math.abs(wave) * WALK_BOB_PX : 0;
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
