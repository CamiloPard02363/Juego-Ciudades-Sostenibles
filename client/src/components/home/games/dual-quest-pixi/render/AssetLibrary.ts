import type { Texture } from 'pixi.js';
import { loadSvgTexture, loadSvgTextures } from './loadSvgTexture';
import { getCharacterArt, type CharacterArt } from './characterArt';
import {
  CONCRETE_SVG,
  DIRT_SVG,
  LAVA_POOL_SVG,
  WATER_POOL_SVG,
  CRATE_SVG,
  DOOR_LOCKED_SVG,
  DOOR_UNLOCKED_SVG,
  buildingSvg,
  TREE_SVG,
  gemSvg,
} from './svgAssets';

interface CharacterTextures {
  body: Texture;
  armL: Texture;
  armR: Texture;
  legL: Texture;
  legR: Texture;
}

export interface Assets {
  concrete: Texture;
  dirt: Texture;
  lavaPool: Texture;
  waterPool: Texture;
  crate: Texture;
  doorLocked: Texture;
  doorUnlocked: Texture;
  tree: Texture;
  buildingTall: Texture;
  buildingShort: Texture;
  fire: CharacterTextures;
  water: CharacterTextures;
  /** Gemas por color — se piden bajo demanda porque cada ficha del nivel
   * trae su propio color; se cachean para no rasterizar dos veces igual. */
  gem: (color: string, glow: string) => Promise<Texture>;
}

async function loadCharacterTextures(art: CharacterArt): Promise<CharacterTextures> {
  return {
    body: await loadSvgTexture(art.body),
    armL: await loadSvgTexture(art.armL.svg),
    armR: await loadSvgTexture(art.armR.svg),
    legL: await loadSvgTexture(art.legL.svg),
    legR: await loadSvgTexture(art.legR.svg),
  };
}

/** Se carga una sola vez por partida en DualQuestPixiGame.mount(). */
export async function loadAssets(): Promise<Assets> {
  const gemCache = new Map<string, Promise<Texture>>();

  const [flat, fire, water] = await Promise.all([
    loadSvgTextures({
      concrete: CONCRETE_SVG,
      dirt: DIRT_SVG,
      lavaPool: LAVA_POOL_SVG,
      waterPool: WATER_POOL_SVG,
      crate: CRATE_SVG,
      doorLocked: DOOR_LOCKED_SVG,
      doorUnlocked: DOOR_UNLOCKED_SVG,
      tree: TREE_SVG,
      buildingTall: buildingSvg(6, '#334155'),
      buildingShort: buildingSvg(3, '#475569'),
    }),
    loadCharacterTextures(getCharacterArt('FIRE')),
    loadCharacterTextures(getCharacterArt('WATER')),
  ]);

  return {
    ...flat,
    fire,
    water,
    gem(color: string, glow: string): Promise<Texture> {
      const key = color + glow;
      if (!gemCache.has(key)) gemCache.set(key, loadSvgTexture(gemSvg(color, glow)));
      return gemCache.get(key)!;
    },
  };
}
