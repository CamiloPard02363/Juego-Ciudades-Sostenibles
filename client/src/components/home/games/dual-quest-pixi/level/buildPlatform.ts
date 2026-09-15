import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { Category } from '../engine/PhysicsWorld';
import type { PlatformDef } from '../dualQuestPixiTypes';

const MATERIAL_COLORS: Record<PlatformDef['material'], { top: number; body: number }> = {
  concrete: { top: 0x94a3b8, body: 0x334155 },
  dirt: { top: 0x52b788, body: 0x3a1500 },
  metal: { top: 0xcbd5e1, body: 0x1e293b },
};

export function buildPlatform(def: PlatformDef): { body: Matter.Body; view: Container } {
  const body = Matter.Bodies.rectangle(def.x + def.width / 2, def.y + def.height / 2, def.width, def.height, {
    label: 'terrain',
    isStatic: true,
    friction: 0.15,
    collisionFilter: { category: Category.TERRAIN },
  });

  const colors = MATERIAL_COLORS[def.material];
  const g = new Graphics();
  g.rect(0, 0, def.width, def.height).fill(colors.body);
  g.rect(0, 0, def.width, Math.min(8, def.height)).fill(colors.top);

  const view = new Container();
  view.addChild(g);
  view.position.set(def.x, def.y);

  return { body, view };
}
