import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';

/**
 * La meta del nivel: la misma puerta de candado dual del prototipo — dos
 * mitades, amarilla y azul, que se apagan cuando el nivel se completa. El
 * nivel se completa cuando AMBOS jugadores están dentro a la vez (lo
 * decide DualQuestPixiGame, contando ocupantes por rol), y solo con las
 * fichas ya recogidas — ver GameStateManager.
 */
export class PortalEntity {
  readonly sensor: Matter.Body;
  readonly view: Container;
  private readonly sprite: Sprite;
  private readonly lockedTexture: Texture;
  private readonly unlockedTexture: Texture;

  constructor(x: number, y: number, width: number, height: number, lockedTexture: Texture, unlockedTexture: Texture) {
    this.lockedTexture = lockedTexture;
    this.unlockedTexture = unlockedTexture;

    this.sensor = Matter.Bodies.rectangle(x + width / 2, y + height / 2, width, height, {
      label: 'portal',
      isSensor: true,
      isStatic: true,
      collisionFilter: { category: Category.SENSOR },
    });

    this.sprite = new Sprite(lockedTexture);
    this.sprite.width = width;
    this.sprite.height = height;

    this.view = new Container();
    this.view.addChild(this.sprite);
    this.view.position.set(x, y);
  }

  setUnlocked(unlocked: boolean): void {
    this.sprite.texture = unlocked ? this.unlockedTexture : this.lockedTexture;
  }
}
