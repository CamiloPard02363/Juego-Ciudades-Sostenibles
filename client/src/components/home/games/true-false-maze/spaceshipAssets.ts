import type { Direction } from './trueFalseMazeEngine'
import type { FloorTileKey } from './spaceshipMap'

/**
 * Sprites del escenario NAVE_ESPACIAL (robot, medusas galácticas y la nave
 * estilo Among Us). Vienen de la carpeta "SpritesJuegoLaberinto" del equipo,
 * ya limpios: fondo transparente y recortados al contenido. Los muros y pisos
 * (`tiles/`) son de la subcarpeta "EscenearioPrueba2"; la decoración
 * (`decor/`) sigue siendo la de "Escenario". Las variantes de color (medusa
 * aturdida, robot herido, medusas de otros colores) no son archivos aparte:
 * se generan una sola vez al cargar, pintando píxel a píxel sobre un canvas.
 */
const SPRITE_URLS = import.meta.glob<string>('./assets/spaceship/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

export type Sprite = HTMLImageElement | HTMLCanvasElement | ImageBitmap
type PaintContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/**
 * Pinta un sprite una sola vez y lo devuelve como ImageBitmap: es inmutable,
 * así que el navegador lo sube a la GPU una vez. Un <canvas> chico usado
 * como imagen se vuelve a subir en cada drawImage, y en un frame hay cientos
 * de brillos. Sin OffscreenCanvas (Safari viejo) queda como <canvas>.
 */
export function paintSprite(width: number, height: number, paint: (ctx: PaintContext) => void, readback = false): Sprite {
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(width, height)
    const ctx = offscreen.getContext('2d', { willReadFrequently: readback })
    if (ctx) {
      paint(ctx)
      return offscreen.transferToImageBitmap()
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: readback })
  if (ctx) paint(ctx)
  return canvas
}
export type DirectionalFrames = Record<Direction, Sprite[]>

/**
 * Piezas de muro. Las `wall-face-*` son el frente de un muro con piso al sur
 * (techo negro arriba, panel, franja de peligro abajo) y miden una celda;
 * todas empiezan en la misma fase de la franja, así cualquier par empalma.
 * Las `wall-side-*` son la franja lateral de un muro vertical, del lado que
 * da al piso.
 */
export type WallTileKey =
  | 'wall-face-plain'
  | 'wall-face-bracket'
  | 'wall-face-lamp'
  | 'wall-face-lamp-alt'
  | 'wall-face-panel'
  | 'wall-side-east'
  | 'wall-side-west'

export type DecorKey =
  | 'question-terminals'
  | 'zone-true'
  | 'zone-false'
  | 'floor-grate'
  | 'vent-open'
  | 'door'
  | 'crate'
  | 'barrels'
  | 'camera'
  | 'cables'
  | 'arrow-down'
  | 'arrow-up'

export type SpaceshipAssets = {
  robot: DirectionalFrames
  robotHurt: DirectionalFrames
  /** Una tanda de frames por color de medusa (ver JELLY_COLORS). */
  jellies: DirectionalFrames[]
  jellyStunned: DirectionalFrames
  jellyFlash: DirectionalFrames
  floors: Record<FloorTileKey, Sprite>
  walls: Record<WallTileKey, Sprite>
  decor: Record<DecorKey, Sprite>
}

const ROBOT_FRAMES: Record<Direction, string[]> = {
  DOWN: ['robot-down-0', 'robot-down-1', 'robot-down-2', 'robot-down-3'],
  UP: ['robot-up-0', 'robot-up-1', 'robot-up-2', 'robot-up-3'],
  RIGHT: ['robot-right-0', 'robot-right-1', 'robot-right-2', 'robot-right-3', 'robot-right-4'],
  LEFT: ['robot-left-0', 'robot-left-1'],
}

const JELLY_FRAMES: Record<Direction, string[]> = {
  DOWN: ['jelly-down-0', 'jelly-down-1', 'jelly-down-2', 'jelly-down-3'],
  UP: ['jelly-up-0', 'jelly-up-1', 'jelly-up-2', 'jelly-up-3'],
  LEFT: ['jelly-left-0', 'jelly-left-1', 'jelly-left-2', 'jelly-left-3'],
  RIGHT: ['jelly-right-0', 'jelly-right-1', 'jelly-right-2', 'jelly-right-3'],
}

/**
 * Color de cada medusa, en el orden de JELLY_PROFILES del motor. Ninguna es
 * verde ni roja a propósito: esos colores significan VERDADERO y FALSO.
 */
export const JELLY_COLORS: ReadonlyArray<{ hueShift: number; glow: string; label: string }> = [
  { hueShift: 0, glow: '#c084fc', label: 'violeta' },
  { hueShift: 50, glow: '#f472b6', label: 'rosa' },
  { hueShift: -40, glow: '#38bdf8', label: 'celeste' },
  { hueShift: 135, glow: '#fbbf24', label: 'dorada' },
]

const FLOOR_KEYS: FloorTileKey[] = [
  'floor-plain',
  'floor-shine',
  'floor-cross',
  'floor-cross-alt',
  'floor-grate',
  'floor-grate-alt',
]
const WALL_KEYS: WallTileKey[] = [
  'wall-face-plain',
  'wall-face-bracket',
  'wall-face-lamp',
  'wall-face-lamp-alt',
  'wall-face-panel',
  'wall-side-east',
  'wall-side-west',
]
const DECOR_KEYS: DecorKey[] = [
  'question-terminals',
  'zone-true',
  'zone-false',
  'floor-grate',
  'vent-open',
  'door',
  'crate',
  'barrels',
  'camera',
  'cables',
  'arrow-down',
  'arrow-up',
]

/** URL de un sprite, ej. `robot/robot-down-0` — también sirve para un <img> fuera del canvas. */
export function spaceshipSpriteUrl(path: string): string {
  const url = SPRITE_URLS[`./assets/spaceship/${path}.png`]
  if (!url) throw new Error(`Falta el sprite "${path}".`)
  return url
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`No se pudo cargar el sprite "${path}".`))
    image.src = spaceshipSpriteUrl(path)
  })
}

async function loadFrames(paths: Record<Direction, string[]>, folder: string): Promise<DirectionalFrames> {
  const entries = await Promise.all(
    (Object.keys(paths) as Direction[]).map(
      async (direction) =>
        [direction, await Promise.all(paths[direction].map((name) => loadImage(`${folder}/${name}`)))] as const,
    ),
  )
  return Object.fromEntries(entries) as DirectionalFrames
}

async function loadRecord<K extends string>(keys: K[], folder: string): Promise<Record<K, Sprite>> {
  const images = await Promise.all(keys.map((key) => loadImage(`${folder}/${key}`)))
  return Object.fromEntries(keys.map((key, index) => [key, images[index]])) as Record<K, Sprite>
}

// ==================== Variantes de color ====================

type PixelMapper = (r: number, g: number, b: number) => [number, number, number]

function mapPixels(source: Sprite, mapper: PixelMapper): Sprite {
  return paintSprite(
    source.width,
    source.height,
    (ctx) => {
      ctx.drawImage(source, 0, 0)
      const image = ctx.getImageData(0, 0, source.width, source.height)
      const data = image.data
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue
        const [r, g, b] = mapper(data[i], data[i + 1], data[i + 2])
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
      }
      ctx.putImageData(image, 0, 0)
    },
    true,
  )
}

function mapFrames(frames: DirectionalFrames, mapper: PixelMapper): DirectionalFrames {
  return {
    UP: frames.UP.map((frame) => mapPixels(frame, mapper)),
    DOWN: frames.DOWN.map((frame) => mapPixels(frame, mapper)),
    LEFT: frames.LEFT.map((frame) => mapPixels(frame, mapper)),
    RIGHT: frames.RIGHT.map((frame) => mapPixels(frame, mapper)),
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h / 6, s, l]
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t
  if (tt < 0) tt += 1
  if (tt > 1) tt -= 1
  if (tt < 1 / 6) return p + (q - p) * 6 * tt
  if (tt < 1 / 2) return q
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const gray = Math.round(l * 255)
    return [gray, gray, gray]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, h) * 255),
    Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  ]
}

function hueShift(degrees: number): PixelMapper {
  const shift = degrees / 360
  return (r, g, b) => {
    const [h, s, l] = rgbToHsl(r, g, b)
    return hslToRgb((h + shift + 1) % 1, s, l)
  }
}

const luminance = (r: number, g: number, b: number) => (0.3 * r + 0.59 * g + 0.11 * b) / 255

/** Medusa aturdida por el pulso EMP: azul pálido, como apagada. */
const stunned: PixelMapper = (r, g, b) => {
  const t = luminance(r, g, b)
  return [Math.round(40 + t * 150), Math.round(90 + t * 150), Math.round(170 + t * 85)]
}

/** Parpadeo blanco cuando al pulso le quedan dos segundos. */
const flash: PixelMapper = (r, g, b) => {
  const t = luminance(r, g, b)
  return [Math.round(205 + t * 50), Math.round(215 + t * 40), 255]
}

/** Robot recién atrapado: rojo de alarma. */
const hurt: PixelMapper = (r, g, b) => [Math.min(255, Math.round(r * 0.55 + 150)), Math.round(g * 0.3), Math.round(b * 0.3)]

let cached: Promise<SpaceshipAssets> | null = null

/** Carga (una sola vez por sesión) todos los sprites y genera las variantes de color. */
export function loadSpaceshipAssets(): Promise<SpaceshipAssets> {
  cached ??= (async () => {
    const [robot, jellyBase, floors, walls, decor] = await Promise.all([
      loadFrames(ROBOT_FRAMES, 'robot'),
      loadFrames(JELLY_FRAMES, 'jellyfish'),
      loadRecord(FLOOR_KEYS, 'tiles'),
      loadRecord(WALL_KEYS, 'tiles'),
      loadRecord(DECOR_KEYS, 'decor'),
    ])
    return {
      robot,
      robotHurt: mapFrames(robot, hurt),
      jellies: JELLY_COLORS.map((color) => (color.hueShift === 0 ? jellyBase : mapFrames(jellyBase, hueShift(color.hueShift)))),
      jellyStunned: mapFrames(jellyBase, stunned),
      jellyFlash: mapFrames(jellyBase, flash),
      floors,
      walls,
      decor,
    }
  })().catch((error: unknown) => {
    cached = null
    throw error
  })
  return cached
}
