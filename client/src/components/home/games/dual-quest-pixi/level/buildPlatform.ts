import Matter from 'matter-js';
import { Container, Sprite, type Texture } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { PlatformDef } from '../dualQuestPixiTypes';

export function buildPlatform(def: PlatformDef, texture: Texture): { body: Matter.Body; view: Container } {
  const body = Matter.Bodies.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, {
    label: 'terrain',
    isStatic: true,
    friction: 0.15,
    collisionFilter: { category: Category.TERRAIN },
  });

  // La textura se estira al tamaño exacto del bloque (igual que
  // `background-size: 100% 100%` en el prototipo CSS) — no se repite en
  // mosaico, porque el degradado de la textura ya representa la
  // superficie completa de un tramo, no una baldosa individual.
  const sprite = new Sprite(texture);
  sprite.width = def.width;
  sprite.height = def.height;

  const view = new Container();
  view.addChild(sprite);
  view.position.set(def.x, def.y);

  return { body, view };
}
