import Matter from 'matter-js';

/**
 * Categorías de colisión Matter.js (bitmask de 32 bits). Se definen una
 * sola vez aquí porque cada body debe declarar tanto su propia categoría
 * como la máscara de con qué categorías SÍ colisiona — repartir esto por
 * el código sería una fuente segura de bugs de "atraviesa la pared".
 */
export const Category = {
  TERRAIN: 0x0001,
  FIRE_PLAYER: 0x0002,
  WATER_PLAYER: 0x0004,
  CRATE: 0x0008,
  HAZARD: 0x0010,
  LIQUID_SENSOR: 0x0020,
  SENSOR: 0x0040, // botones, palancas, puerta, piezas, portal
  DOG: 0x0080,
} as const;

export const Mask = {
  // El fuego no debería ni tocar el agua en el sentido físico: se resuelve
  // por sensor + evento de "muerte", no dejando que el cuerpo sólido de
  // agua empuje al jugador — así la trampa se siente instantánea y clara.
  FIRE_PLAYER: Category.TERRAIN | Category.CRATE | Category.HAZARD,
  WATER_PLAYER: Category.TERRAIN | Category.CRATE | Category.HAZARD,
  CRATE: Category.TERRAIN | Category.FIRE_PLAYER | Category.WATER_PLAYER | Category.CRATE,
  // Incluye SENSOR: sin este bit el perro nunca dispara collisionStart
  // contra un botón (Matter exige que las máscaras calcen en ambos
  // sentidos), y "el perro sostiene el botón" es el requisito central de
  // esta entidad — sin el bit, la clase existe pero no cumple su propósito.
  DOG: Category.TERRAIN | Category.CRATE | Category.SENSOR,
} as const;

export interface PhysicsWorldHandles {
  engine: Matter.Engine;
  world: Matter.World;
  step: (deltaMs: number) => void;
  destroy: () => void;
}

export function createPhysicsWorld(): PhysicsWorldHandles {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.15 },
  });

  // Runner manual (no Matter.Runner): el ticker de Pixi ya nos da un delta
  // consistente, y así ambos sistemas comparten el mismo reloj en vez de
  // correr en dos loops de rAF independientes que se desincronizan.
  function step(deltaMs: number): void {
    Matter.Engine.update(engine, deltaMs);
  }

  function destroy(): void {
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
  }

  return { engine, world: engine.world, step, destroy };
}
