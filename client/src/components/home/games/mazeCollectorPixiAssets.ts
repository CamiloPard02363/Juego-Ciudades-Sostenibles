import { Assets, Texture } from 'pixi.js'
import type { WasteType } from './mazeCollectorTypes'

/** Rutas servidas desde client/public — ver carpeta assets/maze-collector (PNG recortados con chroma-key de temp/sprites, set "Nexus-Recolector"). */
const ASSET_URLS = {
  // Camión: solo 3 ángulos reales (down/up/right) — LEFT se deriva de RIGHT
  // con flip horizontal en el renderer, no hay un sprite de perfil propio.
  truckDown: '/assets/maze-collector/truck-down.png',
  truckUp: '/assets/maze-collector/truck-up.png',
  truckRight: '/assets/maze-collector/truck-right.png',
  // Nubes por estado de IA: patrulla (fuera de radio de detección), persecución (A* activo).
  cloudPatrol: '/assets/maze-collector/cloud-patrol.png',
  cloudChase: '/assets/maze-collector/cloud-chase.png',
  cloudAlert: '/assets/maze-collector/cloud-alert.png',
  // Fachadas de edificio (vista frontal), superpuestas ancla-base sobre paredes de interés.
  buildingRecycling: '/assets/maze-collector/building-recycling.png',
  buildingSchool: '/assets/maze-collector/building-school.png',
  buildingTower: '/assets/maze-collector/building-tower.png',
  // Tiles top-down de piso, siempre debajo de cualquier fachada.
  tilePark: '/assets/maze-collector/tile-park.png',
  tileStreet: '/assets/maze-collector/tile-street.png',
  // Tiles de pared genéricos (manzanas de CITY sin fachada destacada, y muros
  // de los layouts abstractos Classic/Cross/Spiral) — variantes de fachada de
  // tienda del mismo set pixel-art.
  tileBuildingA: '/assets/maze-collector/tile-building-a.png',
  tileBuildingB: '/assets/maze-collector/tile-building-b.png',
  tileBuildingC: '/assets/maze-collector/tile-building-c.png',
  tileBuildingD: '/assets/maze-collector/tile-building-d.png',
  // Residuos coleccionables por tipo.
  wasteGlass: '/assets/maze-collector/waste-glass.png',
  wasteCan: '/assets/maze-collector/waste-can.png',
  wastePaper: '/assets/maze-collector/waste-paper.png',
  // Power-up y HUD.
  powerupRecycling: '/assets/maze-collector/powerup-recycling.png',
  hudEnergy: '/assets/maze-collector/hud-energy.png',
} as const

export type MazeCollectorAssetKey = keyof typeof ASSET_URLS

export type MazeCollectorTextures = Record<MazeCollectorAssetKey, Texture>

let cachedTextures: MazeCollectorTextures | null = null
let loadingPromise: Promise<MazeCollectorTextures> | null = null

export const CITY_BUILDING_TILE_KEYS = [
  'tileBuildingA',
  'tileBuildingB',
  'tileBuildingC',
  'tileBuildingD',
] as const satisfies readonly MazeCollectorAssetKey[]

/** Carga (una sola vez, cacheado) las texturas del recolector desde los SVG/PNG en public/assets. */
export async function loadMazeCollectorTextures(): Promise<MazeCollectorTextures> {
  if (cachedTextures) return cachedTextures
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const keys = Object.keys(ASSET_URLS) as MazeCollectorAssetKey[]
    const loaded = await Promise.all(keys.map((key) => Assets.load<Texture>(ASSET_URLS[key])))
    const textures = Object.fromEntries(keys.map((key, index) => [key, loaded[index]])) as MazeCollectorTextures
    cachedTextures = textures
    return textures
  })()

  return loadingPromise
}

/** Mapea el tipo de residuo del ítem a su textura dedicada; sin wasteType, usa una silueta genérica. */
export function assetKeyForWasteType(wasteType: WasteType | undefined): MazeCollectorAssetKey {
  if (wasteType === 'GLASS') return 'wasteGlass'
  if (wasteType === 'PAPER') return 'wastePaper'
  if (wasteType === 'PLASTIC') return 'wasteCan'
  return 'wasteCan'
}
