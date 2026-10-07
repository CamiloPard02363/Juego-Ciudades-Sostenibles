import type { CellPosition } from '../mazeCollectorTypes'
import { JELLY_COLORS, paintSprite, type SpaceshipAssets, type Sprite, type WallTileKey } from './spaceshipAssets'
import { roomAt, type ShipMap } from './spaceshipMap'
import {
  CAUGHT_MS,
  EMP_WARNING_MS,
  FEEDBACK_MIN_MS,
  interpolatedPosition,
  isMoving,
  VENT_TRAVEL_MS,
  ZONE_WARNING_MS,
  ZONE_WARP_IN_MS,
  ZONE_WARP_OUT_MS,
  type TfEvent,
  type TfJelly,
  type TfState,
  type ZoneKind,
} from './trueFalseMazeEngine'

/**
 * Dibuja la partida en un <canvas> 2D. No tiene reglas: lee el estado del
 * motor y los eventos de cada tick y los convierte en imagen — la nave
 * (pre-dibujada una sola vez en un canvas aparte), los personajes animados
 * con sus sprites, y los efectos: partículas, anillos, textos flotantes,
 * sacudidas, destellos y el apagón.
 *
 * El canvas ocupa toda la pantalla. Todo se dibuja en coordenadas lógicas
 * (CELL unidades por celda) y se escala al tamaño real, así se ve nítido en
 * pantallas retina; la nave se centra en el espacio que dejan los paneles
 * (ver `resize`) y el fondo espacial cubre el resto.
 */

export const CELL = 48
/**
 * Margen de la nave dentro de su propio sistema de coordenadas: a la
 * izquierda caben las toberas y el fuego de los motores; en los demás lados
 * solo el borde del casco. Es chico a propósito: el espacio que sobra en la
 * pantalla lo llena el fondo, no márgenes vacíos alrededor del mapa.
 */
export const PAD = { left: 66, right: 14, top: 8, bottom: 14 }

/** Espacio que ocupan los paneles encima del canvas (HUD, cruceta): la nave se centra en el resto. */
export type Insets = { top: number; right: number; bottom: number; left: number }
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
/** Tope de píxeles por capa: en una pantalla 4K con ratio 2 serían ~33 MP y cada capa pesaría 130 MB. */
const MAX_LAYER_PIXELS = 4_200_000

const FONT = "'Space Grotesk', 'Manrope', system-ui, sans-serif"
const ROBOT_SOURCE_HEIGHT = 98
const JELLY_SOURCE_HEIGHT = 92
/** Personajes y salas se dibujan grandes (más de una celda): lo importante tiene que verse de lejos. */
const ROBOT_DRAW_HEIGHT = CELL * 1.75
const JELLY_DRAW_HEIGHT = CELL * 1.55
const ZONE_DRAW_WIDTH = CELL * 2.3

const ZONE_STYLE: Record<ZoneKind, { main: string; light: string; dark: string; label: string; icon: string }> = {
  TRUE: { main: '#22c55e', light: '#86efac', dark: '#14532d', label: 'VERDADERO', icon: '✓' },
  FALSE: { main: '#ef4444', light: '#fca5a5', dark: '#7f1d1d', label: 'FALSO', icon: '✕' },
}

/** Centros de las pantallas dentro del sprite de terminales (fracción del ancho/alto). */
const TERMINAL_SCREENS: Array<[number, number]> = [
  [0.083, 0.28],
  [0.314, 0.3],
  [0.557, 0.33],
  [0.815, 0.18],
  [0.911, 0.37],
]

type ParticleKind = 'glow' | 'spark' | 'smoke' | 'confetti'

type Particle = {
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  delay: number
  size: number
  color: string
  gravity: number
  drag: number
  rotation: number
  spin: number
}

type Ring = {
  x: number
  y: number
  age: number
  duration: number
  delay: number
  radius: number
  color: string
  width: number
  squash: number
}

type FloatingText = { x: number; y: number; text: string; color: string; age: number; duration: number; size: number; delay: number }

type Star = { x: number; y: number; size: number; phase: number; twinkle: number; color: string }

const STAR_COLORS = ['#ffffff', '#e0e7ff', '#c7d2fe', '#fbcfe8', '#bae6fd']

/** Las primeras estrellas titilan en vivo; el resto queda fijo en el fondo pre-dibujado (más barato por frame). */
const TWINKLING_STARS = 32

const NEBULA_BLOBS: Array<[number, number, number, string]> = [
  [0.12, 0.25, 0.45, 'rgba(124, 58, 237, 0.30)'],
  [0.85, 0.2, 0.4, 'rgba(37, 99, 235, 0.22)'],
  [0.7, 0.85, 0.5, 'rgba(219, 39, 119, 0.16)'],
  [0.3, 0.9, 0.35, 'rgba(14, 165, 233, 0.14)'],
]

type BurstOptions = {
  count: number
  colors: string[]
  speed: number
  life: number
  size: number
  kind?: ParticleKind
  gravity?: number
  drag?: number
  delay?: number
  spread?: number
  angle?: number
}

type ZoneVisual = {
  kind: ZoneKind
  cell: CellPosition
  scale: number
  alpha: number
  jitter: number
  highlight: 'none' | 'chosen-correct' | 'chosen-wrong' | 'answer' | 'dim'
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function hashCell(row: number, col: number): number {
  return Math.abs((row * 73856093) ^ (col * 19349663)) % 1000
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export class TrueFalseMazeRenderer {
  /** Tamaño de la nave en unidades lógicas (celdas + márgenes). */
  readonly shipWidth: number
  readonly shipHeight: number

  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly assets: SpaceshipAssets
  private readonly map: ShipMap
  private readonly reducedMotion: boolean

  /**
   * Dos sistemas de coordenadas. El "mundo" cubre todo el canvas (fondo,
   * estrellas, viñeta, apagón, destellos) y mide `worldWidth x worldHeight`
   * unidades. La nave se dibuja en su propio sistema (el de PAD/CELL) y se
   * traslada a (shipX, shipY) dentro del mundo, centrada en el espacio que
   * dejan los paneles. `k` son píxeles de canvas por unidad.
   */
  private worldWidth = 0
  private worldHeight = 0
  private shipX = 0
  private shipY = 0
  private k = 1
  private layoutKey = ''
  private staticLayer: HTMLCanvasElement | null = null
  private background: HTMLCanvasElement | null = null
  /** Puntos de energía pre-dibujados; se rehace solo cuando cambia cuántos quedan. */
  private dotsLayer: HTMLCanvasElement | null = null
  private dotsLayerState: TfState | null = null
  private dotsLayerCount = -1
  private vignette: HTMLCanvasElement | null = null
  private darkness: HTMLCanvasElement | null = null
  private readonly glowCache = new Map<string, Sprite>()

  private readonly stars: Star[] = []
  private particles: Particle[] = []
  private rings: Ring[] = []
  private texts: FloatingText[] = []
  private shake = 0
  private flash: { color: string; alpha: number } | null = null
  private lightsLevel = 0
  private terminalsBoostUntil = 0
  private shootingStar: { x: number; y: number; vx: number; vy: number; startedAt: number; life: number } | null = null
  private nextShootingStarAt = 4000
  private readonly emitters = new Map<string, number>()

  constructor(canvas: HTMLCanvasElement, assets: SpaceshipAssets, map: ShipMap) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('El navegador no permite dibujar en canvas.')
    this.canvas = canvas
    this.ctx = ctx
    this.assets = assets
    this.map = map
    this.shipWidth = map.cols * CELL + PAD.left + PAD.right
    this.shipHeight = map.rows * CELL + PAD.top + PAD.bottom
    this.reducedMotion =
      typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * Ajusta el canvas a la pantalla: `cssWidth x cssHeight` es el tamaño en
   * pantalla (el canvas ocupa todo) e `insets` el espacio tapado por paneles.
   * La nave se escala al máximo que cabe en el resto y se centra ahí; el
   * fondo cubre todo, así no quedan franjas vacías. Redibuja las capas fijas
   * solo si algo cambió.
   */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number, insets: Insets = NO_INSETS) {
    const dpr = Math.max(1, Math.min(devicePixelRatio, 2, Math.sqrt(MAX_LAYER_PIXELS / Math.max(1, cssWidth * cssHeight))))
    const key = [cssWidth, cssHeight, dpr.toFixed(3), insets.top, insets.right, insets.bottom, insets.left].join('|')
    if (key === this.layoutKey && this.staticLayer) return
    this.layoutKey = key

    const availWidth = Math.max(120, cssWidth - insets.left - insets.right)
    const availHeight = Math.max(120, cssHeight - insets.top - insets.bottom)
    const scale = Math.min(availWidth / this.shipWidth, availHeight / this.shipHeight)

    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr))
    this.worldWidth = cssWidth / scale
    this.worldHeight = cssHeight / scale
    this.k = this.canvas.width / this.worldWidth
    this.shipX = (insets.left + (availWidth - this.shipWidth * scale) / 2) / scale
    this.shipY = (insets.top + (availHeight - this.shipHeight * scale) / 2) / scale

    this.glowCache.clear()
    this.buildStars()
    this.staticLayer = this.buildStaticLayer()
    this.background = this.buildBackground()
    this.vignette = this.buildVignette()
    this.darkness = makeCanvas(this.canvas.width, this.canvas.height)
    this.dotsLayer = makeCanvas(this.shipWidth * this.k, this.shipHeight * this.k)
    this.dotsLayerCount = -1
  }

  /** Estrellas repartidas por todo el mundo (se regeneran al cambiar el tamaño). */
  private buildStars() {
    this.stars.length = 0
    const count = Math.round(Math.min(320, (this.worldWidth * this.worldHeight) / 4200))
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight,
        size: Math.random() < 0.85 ? 1 : 2,
        phase: Math.random() * Math.PI * 2,
        twinkle: 0.0015 + Math.random() * 0.004,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      })
    }
  }

  /** Limpia efectos en curso (al reiniciar la partida). */
  reset() {
    this.particles = []
    this.rings = []
    this.texts = []
    this.shake = 0
    this.flash = null
    this.lightsLevel = 0
  }

  // ==================== Coordenadas ====================

  private cellX(col: number): number {
    return PAD.left + (col + 0.5) * CELL
  }

  private cellY(row: number): number {
    return PAD.top + (row + 0.5) * CELL
  }

  /** Línea del "suelo" de una celda: donde apoyan los pies los personajes. */
  private footY(row: number): number {
    return PAD.top + (row + 0.5) * CELL + CELL * 0.4
  }

  // ==================== Capas fijas ====================

  private tileAt(row: number, col: number) {
    return this.map.tiles[row]?.[col] ?? 'void'
  }

  private isFloorish(row: number, col: number): boolean {
    const tile = this.tileAt(row, col)
    return tile === 'floor' || tile === 'obstacle'
  }

  private isWall(row: number, col: number): boolean {
    return this.tileAt(row, col) === 'wall'
  }

  private isFace(row: number, col: number): boolean {
    return this.isWall(row, col) && this.isFloorish(row + 1, col)
  }

  private buildStaticLayer(): HTMLCanvasElement {
    const k = this.k
    const layer = makeCanvas(this.shipWidth * k, this.shipHeight * k)
    const ctx = layer.getContext('2d')
    if (!ctx) return layer
    ctx.scale(k, k)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    this.drawThrusterNozzles(ctx)
    ctx.save()
    ctx.translate(PAD.left, PAD.top)
    this.drawFloors(ctx)
    this.drawFloorDecals(ctx)
    this.drawFloorShadows(ctx)
    this.drawHullRim(ctx)
    this.drawWallFaces(ctx)
    this.drawWallTops(ctx)
    this.drawWallDecor(ctx)
    this.drawRoomLabels(ctx)
    ctx.restore()
    return layer
  }

  private drawFloors(ctx: CanvasRenderingContext2D) {
    const { map } = this
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        if (!this.isFloorish(row, col)) continue
        const x = col * CELL
        const y = row * CELL
        const room = roomAt(map, { row, col })
        if (room) {
          // Placas grandes de 2x2 celdas: el piso de las salas se ve menos cuadriculado.
          const tile = this.assets.floors[room.floor]
          const sw = tile.width / 2
          const sh = tile.height / 2
          const sx = ((col - room.left) % 2) * sw
          const sy = ((row - room.top) % 2) * sh
          ctx.drawImage(tile, sx, sy, sw, sh, x, y, CELL, CELL)
        } else {
          const tile = this.assets.floors[hashCell(row, col) % 7 === 0 ? 'floor-012' : 'floor-013']
          ctx.drawImage(tile, x, y, CELL, CELL)
        }
      }
    }
  }

  private drawSpriteFit(ctx: CanvasRenderingContext2D, sprite: Sprite, cx: number, bottom: number, width: number) {
    const height = (sprite.height / sprite.width) * width
    ctx.drawImage(sprite, cx - width / 2, bottom - height, width, height)
  }

  private drawFloorDecals(ctx: CanvasRenderingContext2D) {
    const { decor } = this.assets
    for (const cell of this.map.decor.grates) {
      this.drawSpriteFit(ctx, decor['floor-grate'], (cell.col + 0.5) * CELL, (cell.row + 0.5) * CELL + 12, CELL * 0.82)
    }
    for (const cell of this.map.decor.cables) {
      this.drawSpriteFit(ctx, decor.cables, (cell.col + 0.5) * CELL, (cell.row + 1) * CELL - 4, CELL * 0.92)
    }
    const drawn = new Set<string>()
    for (const vent of this.map.vents) {
      const key = `${vent.pos.row}:${vent.pos.col}`
      if (drawn.has(key)) continue
      drawn.add(key)
      this.drawSpriteFit(ctx, decor['vent-open'], (vent.pos.col + 0.5) * CELL, (vent.pos.row + 1) * CELL - 5, CELL * 0.86)
    }

    // Plataforma de salida del robot: anillos metálicos con luz cian.
    const start = this.map.playerStart
    const cx = (start.col + 0.5) * CELL
    const cy = (start.row + 0.5) * CELL + 6
    ctx.save()
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, CELL * 0.5, CELL * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.ellipse(cx, cy, CELL * 0.36, CELL * 0.16, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  private drawFloorShadows(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.map.rows; row++) {
      for (let col = 0; col < this.map.cols; col++) {
        if (!this.isFloorish(row, col)) continue
        const x = col * CELL
        const y = row * CELL
        if (!this.isFloorish(row - 1, col)) {
          const gradient = ctx.createLinearGradient(0, y, 0, y + 14)
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)')
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = gradient
          ctx.fillRect(x, y, CELL, 14)
        }
        if (!this.isFloorish(row, col - 1)) {
          const gradient = ctx.createLinearGradient(x, 0, x + 8, 0)
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = gradient
          ctx.fillRect(x, y, 8, CELL)
        }
        if (!this.isFloorish(row, col + 1)) {
          const gradient = ctx.createLinearGradient(x + CELL, 0, x + CELL - 8, 0)
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = gradient
          ctx.fillRect(x + CELL - 8, y, 8, CELL)
        }
      }
    }
  }

  /**
   * Caras de muro (muros con piso al sur), estilo 3/4 de Among Us: en cada
   * tramo horizontal, los extremos que doblan hacia abajo usan las piezas de
   * esquina y el medio alterna las rectas (tuberías, rejilla, cables).
   */
  private drawWallFaces(ctx: CanvasRenderingContext2D) {
    const { walls } = this.assets
    for (let row = 0; row < this.map.rows; row++) {
      let col = 0
      while (col < this.map.cols) {
        if (!this.isFace(row, col)) {
          col++
          continue
        }
        const start = col
        while (col < this.map.cols && this.isFace(row, col)) col++
        const end = col - 1
        for (let c = start; c <= end; c++) {
          const leftWall = this.isWall(row, c - 1) && !this.isFace(row, c - 1)
          const rightWall = this.isWall(row, c + 1) && !this.isFace(row, c + 1)
          let key: WallTileKey
          if (start === end && this.isWall(row, c - 1) && this.isWall(row, c + 1)) {
            key = (row + c) % 2 === 0 ? 'wall-004' : 'wall-006'
          } else if (c === start && leftWall) {
            key = 'wall-005'
          } else if (c === end && rightWall) {
            key = (row + c) % 2 === 0 ? 'wall-003' : 'wall-008'
          } else {
            const options: WallTileKey[] = ['wall-001', 'wall-002', 'wall-001', 'wall-007']
            key = options[(row * 7 + c * 3) % options.length]
          }
          ctx.drawImage(walls[key], c * CELL, row * CELL, CELL, CELL)
        }
      }
    }
  }

  /** Borde de casco (chapa con remaches) donde el piso termina frente al espacio exterior. */
  private drawHullRim(ctx: CanvasRenderingContext2D) {
    const rim = 9
    const strip = (x: number, y: number, w: number, h: number, horizontal: boolean) => {
      const gradient = horizontal ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0)
      gradient.addColorStop(0, '#c4cde0')
      gradient.addColorStop(0.45, '#8a96ae')
      gradient.addColorStop(1, '#4b566d')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = 'rgba(8, 12, 24, 0.55)'
      if (horizontal) ctx.fillRect(x, y + h - 1.5, w, 1.5)
      else ctx.fillRect(x + w - 1.5, y, 1.5, h)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
      if (horizontal) ctx.fillRect(x + w / 2 - 1, y + 2.5, 2, 2)
      else ctx.fillRect(x + 2.5, y + h / 2 - 1, 2, 2)
    }
    for (let row = 0; row < this.map.rows; row++) {
      for (let col = 0; col < this.map.cols; col++) {
        if (!this.isFloorish(row, col)) continue
        const x = col * CELL
        const y = row * CELL
        if (this.tileAt(row, col - 1) === 'void') strip(x - rim, y, rim, CELL, false)
        if (this.tileAt(row, col + 1) === 'void') strip(x + CELL, y, rim, CELL, false)
        if (this.tileAt(row + 1, col) === 'void') strip(x, y + CELL, CELL, rim, true)
      }
    }
  }

  /**
   * Techo de los muros (los que no muestran su cara): chapa metálica con
   * relieve, remaches y paneles de luz — no un bloque negro. Los muros son
   * de una sola celda, así que son franjas finas con borde claro donde
   * dan al piso.
   */
  private drawWallTops(ctx: CanvasRenderingContext2D) {
    for (let row = 0; row < this.map.rows; row++) {
      for (let col = 0; col < this.map.cols; col++) {
        if (!this.isWall(row, col) || this.isFace(row, col)) continue
        const x = col * CELL
        const y = row * CELL
        const gradient = ctx.createLinearGradient(x, y, x + CELL, y + CELL)
        gradient.addColorStop(0, '#46526c')
        gradient.addColorStop(1, '#2b3449')
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, CELL, CELL)

        // Costura del panel y remaches.
        ctx.strokeStyle = 'rgba(8, 12, 24, 0.5)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x + 5.5, y + 5.5, CELL - 11, CELL - 11)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 7, y + 7, CELL - 14, CELL - 14)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
        for (const [rx, ry] of [
          [10, 10],
          [CELL - 10, 10],
          [10, CELL - 10],
          [CELL - 10, CELL - 10],
        ]) {
          ctx.beginPath()
          ctx.arc(x + rx, y + ry, 1.7, 0, Math.PI * 2)
          ctx.fill()
        }

        // Detalle según la celda: panel de luz, rejilla o nada (para no repetirse).
        const variant = hashCell(row, col) % 7
        if (variant === 0 || variant === 3) {
          const color = variant === 0 ? '#22d3ee' : '#fbbf24'
          ctx.fillStyle = 'rgba(8, 12, 24, 0.55)'
          roundedRect(ctx, x + CELL / 2 - 10, y + CELL / 2 - 3.5, 20, 7, 3)
          ctx.fill()
          ctx.fillStyle = color
          ctx.globalAlpha = 0.85
          roundedRect(ctx, x + CELL / 2 - 8, y + CELL / 2 - 1.8, 16, 3.6, 1.8)
          ctx.fill()
          ctx.globalAlpha = 1
        } else if (variant === 1) {
          ctx.strokeStyle = 'rgba(8, 12, 24, 0.6)'
          ctx.lineWidth = 2
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath()
            ctx.moveTo(x + CELL / 2 - 11, y + CELL / 2 + i * 4.5)
            ctx.lineTo(x + CELL / 2 + 11, y + CELL / 2 + i * 4.5)
            ctx.stroke()
          }
        }

        // Borde claro hacia el piso (grosor del muro) y casco hacia el espacio.
        const sides: Array<[number, number, [number, number, number, number]]> = [
          [-1, 0, [x, y, CELL, 4]],
          [1, 0, [x, y + CELL - 4, CELL, 4]],
          [0, -1, [x, y, 4, CELL]],
          [0, 1, [x + CELL - 4, y, 4, CELL]],
        ]
        for (const [dr, dc, rect] of sides) {
          const tile = this.tileAt(row + dr, col + dc)
          if (tile === 'void') {
            ctx.fillStyle = '#b5bfd3'
            ctx.fillRect(...rect)
          } else if (tile === 'floor' || tile === 'obstacle') {
            ctx.fillStyle = '#8f9cb6'
            ctx.fillRect(...rect)
            ctx.fillStyle = 'rgba(8, 12, 24, 0.55)'
            const [rx, ry, rw, rh] = rect
            if (dr === 1) ctx.fillRect(rx, ry + rh, rw, 1.5)
            else if (dr === -1) ctx.fillRect(rx, ry - 1.5, rw, 1.5)
            else if (dc === 1) ctx.fillRect(rx + rw, ry, 1.5, rh)
            else ctx.fillRect(rx - 1.5, ry, 1.5, rh)
          }
        }
      }
    }
  }

  private drawThrusterNozzles(ctx: CanvasRenderingContext2D) {
    for (const row of this.engineRows()) {
      const y = PAD.top + (row + 0.5) * CELL
      const x = PAD.left
      const gradient = ctx.createLinearGradient(0, y - 20, 0, y + 20)
      gradient.addColorStop(0, '#94a3b8')
      gradient.addColorStop(0.5, '#475569')
      gradient.addColorStop(1, '#1e293b')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(x - 6, y - 16)
      ctx.lineTo(x - 24, y - 23)
      ctx.lineTo(x - 24, y + 23)
      ctx.lineTo(x - 6, y + 16)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  /** Filas de las salas de motor: de ahí sale el fuego de los propulsores. */
  private engineRows(): number[] {
    return this.map.rooms
      .filter((room) => room.id.startsWith('engine'))
      .map((room) => Math.round((room.top + room.bottom) / 2))
  }

  private terminalsRect() {
    const { terminals } = this.map.decor
    const sprite = this.assets.decor['question-terminals']
    const width = terminals.widthCells * CELL
    const height = (sprite.height / sprite.width) * width
    const x = (terminals.centerCol + 0.5) * CELL - width / 2
    const y = (terminals.row + 1) * CELL + 14 - height
    return { x, y, width, height }
  }

  private drawWallDecor(ctx: CanvasRenderingContext2D) {
    const { decor } = this.assets
    const terminals = this.terminalsRect()
    ctx.drawImage(decor['question-terminals'], terminals.x, terminals.y, terminals.width, terminals.height)
    for (const cell of this.map.decor.cameras) {
      const width = CELL * 0.72
      const height = (decor.camera.height / decor.camera.width) * width
      ctx.drawImage(decor.camera, cell.col * CELL + CELL * 0.22, cell.row * CELL + 3, width, height)
    }
    for (const cell of this.map.decor.doors) {
      this.drawSpriteFit(ctx, decor.door, (cell.col + 0.5) * CELL, (cell.row + 1) * CELL - 1, CELL * 0.86)
    }
  }

  private drawRoomLabels(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.font = `700 10px ${FONT}`
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(226, 232, 240, 0.34)'
    for (const room of this.map.rooms) {
      if (room.id === 'questions') continue
      ctx.fillText(room.label.toUpperCase(), room.left * CELL + 6, room.bottom * CELL + CELL - 14)
    }
    ctx.restore()
  }

  /** Degradado del espacio + nebulosas + planeta + estrellas fijas de todo el mundo, dibujado una sola vez. */
  private buildBackground(): HTMLCanvasElement {
    const k = this.k
    const { worldWidth: w, worldHeight: h } = this
    const canvas = makeCanvas(w * k, h * k)
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas
    ctx.scale(k, k)
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#03040c')
    gradient.addColorStop(0.5, '#0a0e24')
    gradient.addColorStop(1, '#04050e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    for (const [fx, fy, fr, color] of NEBULA_BLOBS) {
      const x = fx * w
      const y = fy * h
      const r = fr * Math.max(w, h * 1.4)
      const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
      blob.addColorStop(0, color)
      blob.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = blob
      ctx.fillRect(0, 0, w, h)
    }
    for (const star of this.stars.slice(TWINKLING_STARS)) {
      ctx.globalAlpha = 0.3 + 0.6 * (star.phase / (Math.PI * 2))
      ctx.fillStyle = star.color
      ctx.fillRect(star.x, star.y, star.size, star.size)
    }
    ctx.globalAlpha = 1
    const base = Math.min(w, h)
    this.paintPlanet(ctx, w * 0.97, h * 0.93, base * 0.3, ['#9a8cf5', '#4a3aa6', '#120d30'])
    this.paintPlanet(ctx, w * 0.03, h * 0.18, base * 0.075, ['#7dd3fc', '#2563a8', '#0a1a38'])
    return canvas
  }

  /** Planeta de fondo: esfera con bandas, sombra del lado opuesto al sol y halo de atmósfera. */
  private paintPlanet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, [light, mid, dark]: string[]) {
    const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.28)
    halo.addColorStop(0, `${mid}66`)
    halo.addColorStop(1, `${mid}00`)
    ctx.fillStyle = halo
    ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6)

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    const body = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r)
    body.addColorStop(0, light)
    body.addColorStop(0.55, mid)
    body.addColorStop(1, dark)
    ctx.fillStyle = body
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - r, cy - r * 0.55 + i * r * 0.32, r * 2, r * 0.1)
    const shade = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    shade.addColorStop(0.4, 'rgba(0, 0, 0, 0)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.7)')
    ctx.fillStyle = shade
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }

  private buildVignette(): HTMLCanvasElement {
    const { worldWidth: w, worldHeight: h } = this
    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, Math.max(w, h) * 0.72)
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    return canvas
  }

  /** Halo radial de un color (cacheado): base de todos los brillos aditivos. */
  private glow(color: string): Sprite {
    const cached = this.glowCache.get(color)
    if (cached) return cached
    const size = 64
    const sprite = paintSprite(size, size, (ctx) => {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      gradient.addColorStop(0, color)
      gradient.addColorStop(0.35, color)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
    })
    this.glowCache.set(color, sprite)
    return sprite
  }

  private drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
    if (alpha <= 0.002 || radius <= 0) return
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(this.glow(color), x - radius, y - radius, radius * 2, radius * 2)
    ctx.globalAlpha = 1
  }

  // ==================== Efectos por evento ====================

  private burst(x: number, y: number, options: BurstOptions) {
    const {
      count,
      colors,
      speed,
      life,
      size,
      kind = 'glow',
      gravity = 0,
      drag = 0.92,
      delay = 0,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
    } = options
    for (let i = 0; i < count; i++) {
      const direction = angle + (Math.random() - 0.5) * spread
      const velocity = speed * (0.4 + Math.random() * 0.8)
      this.particles.push({
        kind,
        x,
        y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        age: 0,
        life: life * (0.6 + Math.random() * 0.6),
        delay,
        size: size * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity,
        drag,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 12,
      })
    }
  }

  private ring(x: number, y: number, radius: number, color: string, options: Partial<Omit<Ring, 'x' | 'y' | 'radius' | 'color'>> = {}) {
    this.rings.push({ x, y, radius, color, age: 0, duration: 650, delay: 0, width: 3, squash: 1, ...options })
  }

  private text(x: number, y: number, text: string, color: string, size = 18, delay = 0) {
    this.texts.push({ x, y, text, color, size: size * 1.3, delay, age: 0, duration: 1300 })
  }

  private kick(amount: number) {
    if (!this.reducedMotion) this.shake = Math.max(this.shake, amount)
  }

  private flashScreen(color: string, alpha: number) {
    this.flash = { color, alpha: this.reducedMotion ? alpha * 0.5 : alpha }
  }

  consume(events: readonly TfEvent[], state: TfState) {
    for (const event of events) {
      switch (event.type) {
        case 'dot': {
          this.burst(this.cellX(event.cell.col), this.cellY(event.cell.row), {
            count: 4,
            colors: ['#7dd3fc', '#e0f2fe'],
            speed: 70,
            life: 300,
            size: 5,
          })
          break
        }
        case 'core': {
          const x = this.cellX(event.cell.col)
          const y = this.cellY(event.cell.row)
          this.burst(x, y, { count: 22, colors: ['#67e8f9', '#e0f2fe', '#a5f3fc'], speed: 170, life: 650, size: 9 })
          this.ring(x, y, CELL * 1.4, '#67e8f9', { width: 4 })
          this.text(x, y - 20, '+50', '#67e8f9', 15)
          break
        }
        case 'emp-start': {
          const point = interpolatedPosition(state.player)
          const x = this.cellX(point.col)
          const y = this.cellY(point.row)
          this.ring(x, y, CELL * 6, '#22d3ee', { duration: 900, width: 6 })
          this.ring(x, y, CELL * 3.5, '#a5f3fc', { duration: 700, delay: 120, width: 3 })
          this.flashScreen('#22d3ee', 0.28)
          this.text(x, y - 46, 'PULSO EMP', '#a5f3fc', 17)
          break
        }
        case 'zap': {
          const x = this.cellX(event.cell.col)
          const y = this.cellY(event.cell.row) - 8
          this.burst(x, y, { count: 18, colors: ['#ffffff', '#a5f3fc', '#22d3ee'], speed: 260, life: 420, size: 2.4, kind: 'spark' })
          this.burst(x, y, { count: 8, colors: [JELLY_COLORS[event.jellyIndex % JELLY_COLORS.length].glow], speed: 90, life: 600, size: 10 })
          this.ring(x, y, CELL * 1.6, '#e0f2fe', { duration: 450 })
          this.text(x, y - 28, `+${event.points}`, '#a5f3fc', 18)
          this.kick(4)
          break
        }
        case 'answer': {
          const x = this.cellX(event.cell.col)
          // Un poco más abajo que el centro del sprite: el texto flotante sube sin taparle el letrero a la sala.
          const y = this.cellY(event.cell.row) + 30
          if (event.correct) {
            this.burst(x, y, {
              count: 54,
              colors: ['#22c55e', '#86efac', '#facc15', '#67e8f9', '#ffffff', '#f472b6'],
              speed: 330,
              life: 1500,
              size: 6,
              kind: 'confetti',
              gravity: 520,
              drag: 0.95,
              spread: Math.PI * 1.3,
            })
            this.burst(x, y, { count: 16, colors: ['#86efac', '#ffffff'], speed: 160, life: 600, size: 12 })
            this.ring(x, y, CELL * 2.2, '#4ade80', { width: 5, duration: 700 })
            this.ring(x, y, CELL * 3.4, '#bbf7d0', { width: 2, duration: 900, delay: 140 })
            this.flashScreen('#22c55e', 0.22)
            this.text(x, y - 40, `+${event.points}`, '#86efac', 24)
            if (event.streak >= 2) this.text(x, y - 70, `¡Racha x${event.streak}!`, '#fde047', 18, 280)
          } else {
            this.burst(x, y, { count: 26, colors: ['#ef4444', '#f97316', '#fecaca'], speed: 280, life: 520, size: 2.6, kind: 'spark' })
            this.burst(x, y, { count: 10, colors: ['#64748b', '#334155'], speed: 50, life: 1100, size: 16, kind: 'smoke' })
            this.ring(x, y, CELL * 2, '#f87171', { width: 5 })
            this.flashScreen('#ef4444', 0.3)
            this.text(x, y - 40, '−1 vida', '#fca5a5', 20)
            this.kick(9)
          }
          break
        }
        case 'caught': {
          const x = this.cellX(event.cell.col)
          const y = this.cellY(event.cell.row) - 10
          this.burst(x, y, { count: 30, colors: ['#ffffff', '#fde047', '#f97316', '#ef4444'], speed: 300, life: 600, size: 2.6, kind: 'spark' })
          this.burst(x, y, { count: 12, colors: ['#94a3b8', '#475569'], speed: 60, life: 1200, size: 18, kind: 'smoke' })
          this.ring(x, y, CELL * 2.4, '#fb7185', { width: 5 })
          this.flashScreen('#ef4444', 0.34)
          this.text(x, y - 40, '−1 vida', '#fca5a5', 20)
          this.kick(12)
          break
        }
        case 'respawn': {
          const x = this.cellX(event.cell.col)
          const y = this.cellY(event.cell.row)
          this.ring(x, y + 6, CELL * 1.2, '#22d3ee', { squash: 0.45, width: 4, duration: 700 })
          this.ring(x, y + 6, CELL * 1.8, '#a5f3fc', { squash: 0.45, width: 2, duration: 800, delay: 150 })
          this.burst(x, y, { count: 14, colors: ['#67e8f9', '#ffffff'], speed: 110, life: 600, size: 8, angle: -Math.PI / 2, spread: 1.4 })
          break
        }
        case 'vent': {
          const x = this.cellX(event.from.col)
          const y = this.cellY(event.from.row) + 8
          this.burst(x, y, { count: 12, colors: ['#94a3b8', '#64748b', '#cbd5e1'], speed: 70, life: 900, size: 14, kind: 'smoke', angle: -Math.PI / 2, spread: 1.6 })
          this.kick(2)
          break
        }
        case 'vent-exit': {
          const x = this.cellX(event.cell.col)
          const y = this.cellY(event.cell.row) + 8
          this.burst(x, y, { count: 12, colors: ['#94a3b8', '#cbd5e1'], speed: 80, life: 900, size: 14, kind: 'smoke', angle: -Math.PI / 2, spread: 1.6 })
          this.ring(x, y, CELL * 0.9, '#cbd5e1', { squash: 0.45, width: 2, duration: 450 })
          break
        }
        case 'zones-move': {
          for (const move of event.moves) {
            const style = ZONE_STYLE[move.kind]
            if (move.from) {
              const fx = this.cellX(move.from.col)
              const fy = this.cellY(move.from.row) - 14
              this.burst(fx, fy, { count: 18, colors: [style.main, style.light, '#ffffff'], speed: 140, life: 520, size: 8 })
            }
            const tx = this.cellX(move.to.col)
            const ty = this.cellY(move.to.row)
            const delay = move.from ? ZONE_WARP_OUT_MS : 0
            this.ring(tx, ty + 10, CELL * 1.6, style.light, { squash: 0.45, width: 4, duration: 650, delay })
            this.burst(tx, ty - 10, {
              count: 14,
              colors: [style.light, '#ffffff'],
              speed: 120,
              life: 600,
              size: 7,
              delay,
              angle: -Math.PI / 2,
              spread: 1.2,
            })
          }
          break
        }
        case 'question':
          this.terminalsBoostUntil = state.now + 1500
          break
        case 'ship-clean': {
          const point = interpolatedPosition(state.player)
          const x = this.cellX(point.col)
          const y = this.cellY(point.row)
          this.ring(this.shipWidth / 2, this.shipHeight / 2, this.shipWidth * 0.7, '#fde047', { duration: 1100, width: 6 })
          this.text(x, y - 50, `¡Nave impecable! +${event.points}`, '#fde047', 18)
          break
        }
        case 'ship-refill':
          this.ring(this.shipWidth / 2, this.shipHeight / 2, this.shipWidth * 0.6, '#67e8f9', { duration: 1000, width: 3 })
          break
        case 'lights-out':
          this.flashScreen('#000000', 0.5)
          this.kick(3)
          break
        case 'lights-on':
          this.flashScreen('#e0f2fe', 0.18)
          break
        case 'jelly-release': {
          const color = JELLY_COLORS[event.jellyIndex % JELLY_COLORS.length].glow
          this.burst(this.cellX(event.cell.col), this.cellY(event.cell.row) - 10, { count: 10, colors: [color, '#ffffff'], speed: 90, life: 500, size: 7 })
          break
        }
        case 'jelly-home': {
          const color = JELLY_COLORS[event.jellyIndex % JELLY_COLORS.length].glow
          this.ring(this.cellX(event.cell.col), this.cellY(event.cell.row), CELL * 0.8, color, { duration: 420 })
          break
        }
        case 'finished':
          if (event.won) {
            for (let i = 0; i < 7; i++) {
              // Los fuegos artificiales cubren toda la pantalla, no solo la nave.
              const x = -this.shipX + Math.random() * this.worldWidth
              const y = -this.shipY + Math.random() * this.worldHeight * 0.6
              const delay = i * 260
              this.burst(x, y, {
                count: 40,
                colors: ['#facc15', '#22c55e', '#38bdf8', '#f472b6', '#ffffff', '#a78bfa'],
                speed: 300,
                life: 1600,
                size: 6,
                kind: 'confetti',
                gravity: 380,
                delay,
              })
              this.ring(x, y, CELL * 2.5, '#fde68a', { delay, duration: 800 })
            }
          }
          break
        default:
          break
      }
    }
  }

  // ==================== Frame ====================

  draw(state: TfState, dtMs: number) {
    if (!this.staticLayer) return
    const ctx = this.ctx
    const now = state.now
    const dt = Math.min(dtMs, 64)
    this.update(state, dt)

    ctx.setTransform(this.k, 0, 0, this.k, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1

    const shakeX = this.shake > 0.2 ? (Math.random() - 0.5) * 2 * this.shake : 0
    const shakeY = this.shake > 0.2 ? (Math.random() - 0.5) * 2 * this.shake : 0

    // Fondo y efectos de pantalla en coordenadas del mundo; la nave y todo lo
    // que vive en ella, trasladados a su lugar.
    this.drawSpace(ctx, now)
    ctx.save()
    ctx.translate(this.shipX + shakeX, this.shipY + shakeY)
    this.drawExhaust(ctx, now)
    ctx.drawImage(this.staticLayer, 0, 0, this.shipWidth, this.shipHeight)
    this.drawAmbient(ctx, state)
    this.drawPickups(ctx, state)
    const zones = this.zoneVisuals(state)
    this.drawZoneFloors(ctx, state, zones)
    this.drawShadows(ctx, state)
    this.drawDepthSorted(ctx, state, zones)
    // Las partículas van bajo el apagón (el vapor no debe brillar en la
    // oscuridad); los textos flotantes encima, para que siempre se lean.
    this.drawParticles(ctx)
    ctx.restore()

    this.drawLightsOut(ctx, state)

    ctx.save()
    ctx.translate(this.shipX + shakeX, this.shipY + shakeY)
    this.drawTexts(ctx)
    ctx.restore()

    this.drawScreenEffects(ctx, state)
  }

  private update(state: TfState, dt: number) {
    const seconds = dt / 1000
    for (const particle of this.particles) {
      if (particle.delay > 0) {
        particle.delay -= dt
        continue
      }
      particle.age += dt
      const drag = Math.pow(particle.drag, dt / 16)
      particle.vx *= drag
      particle.vy = particle.vy * drag + particle.gravity * seconds
      particle.x += particle.vx * seconds
      particle.y += particle.vy * seconds
      particle.rotation += particle.spin * seconds
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life)
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900)

    for (const ring of this.rings) {
      if (ring.delay > 0) ring.delay -= dt
      else ring.age += dt
    }
    this.rings = this.rings.filter((ring) => ring.age < ring.duration)

    for (const text of this.texts) {
      if (text.delay > 0) text.delay -= dt
      else text.age += dt
    }
    this.texts = this.texts.filter((text) => text.age < text.duration)

    this.shake *= Math.pow(0.86, dt / 16)
    if (this.flash) {
      this.flash.alpha *= Math.pow(0.9, dt / 16)
      if (this.flash.alpha < 0.01) this.flash = null
    }

    const dark = state.lightsOutUntil !== null && state.phase !== 'finished' ? 1 : 0
    this.lightsLevel += (dark - this.lightsLevel) * Math.min(1, dt / 260)

    this.emitAmbient(state)
  }

  /** Partículas de ambiente: chispas de cables, vapor de rejillas, propulsión del robot, aura EMP. */
  private emitAmbient(state: TfState) {
    const now = state.now
    const due = (key: string, every: [number, number]) => {
      const next = this.emitters.get(key)
      if (next === undefined) {
        this.emitters.set(key, now + every[0] + Math.random() * (every[1] - every[0]))
        return false
      }
      if (now < next) return false
      this.emitters.set(key, now + every[0] + Math.random() * (every[1] - every[0]))
      return true
    }

    for (const cell of this.map.decor.cables) {
      if (due(`cable-${cell.row}-${cell.col}`, [700, 2200])) {
        const x = this.cellX(cell.col) + (Math.random() - 0.5) * CELL * 0.6
        const y = this.cellY(cell.row) + (Math.random() - 0.5) * CELL * 0.4
        this.burst(x, y, { count: 7, colors: ['#fde047', '#ffffff', '#fb923c'], speed: 150, life: 300, size: 1.8, kind: 'spark', gravity: 300 })
      }
    }
    for (const vent of this.map.vents) {
      if (due(`vent-${vent.pos.row}-${vent.pos.col}`, [2600, 5200])) {
        const x = this.cellX(vent.pos.col)
        const y = this.cellY(vent.pos.row) + 6
        this.burst(x, y, { count: 3, colors: ['#94a3b8', '#cbd5e1'], speed: 26, life: 1400, size: 10, kind: 'smoke', angle: -Math.PI / 2, spread: 0.7 })
      }
    }
    for (const row of this.engineRows()) {
      if (due(`exhaust-${row}`, [40, 90])) {
        const y = this.cellY(row) + (Math.random() - 0.5) * 18
        this.burst(PAD.left - 26, y, { count: 1, colors: ['#67e8f9', '#a5b4fc', '#ffffff'], speed: 160, life: 420, size: 6, angle: Math.PI, spread: 0.25, drag: 0.97 })
      }
    }

    const player = state.player
    if (state.phase === 'playing' && !player.vent) {
      const point = interpolatedPosition(player)
      const x = this.cellX(point.col)
      const y = this.footY(point.row)
      if (isMoving(player) && !player.idle && due('thruster', [45, 70])) {
        const back = { UP: Math.PI / 2, DOWN: -Math.PI / 2, LEFT: 0, RIGHT: Math.PI }[player.facing]
        this.burst(x, y - 4, { count: 1, colors: ['#67e8f9', '#e0f2fe'], speed: 40, life: 360, size: 5, angle: back, spread: 0.8 })
      }
      if (state.empUntil !== null && due('emp-aura', [90, 160])) {
        const angle = Math.random() * Math.PI * 2
        this.burst(x + Math.cos(angle) * 32, y - 42 + Math.sin(angle) * 32, {
          count: 2,
          colors: ['#a5f3fc', '#ffffff'],
          speed: 120,
          life: 220,
          size: 1.6,
          kind: 'spark',
        })
      }
    }

    for (const jelly of state.jellies) {
      if (jelly.mode === 'RETURNING' && due(`trail-${jelly.index}`, [50, 80])) {
        const point = interpolatedPosition(jelly)
        this.burst(this.cellX(point.col), this.cellY(point.row) - 12, {
          count: 1,
          colors: [JELLY_COLORS[jelly.index % JELLY_COLORS.length].glow, '#ffffff'],
          speed: 20,
          life: 500,
          size: 6,
        })
      }
    }
  }

  private drawSpace(ctx: CanvasRenderingContext2D, now: number) {
    if (this.background) ctx.drawImage(this.background, 0, 0, this.worldWidth, this.worldHeight)

    for (let i = 0; i < TWINKLING_STARS; i++) {
      const star = this.stars[i]
      ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(now * star.twinkle + star.phase))
      ctx.fillStyle = star.color
      ctx.fillRect(star.x, star.y, star.size + 0.5, star.size + 0.5)
    }
    ctx.globalAlpha = 1

    if (!this.shootingStar && now > this.nextShootingStarAt) {
      this.shootingStar = {
        x: Math.random() * this.worldWidth,
        y: Math.random() * this.worldHeight * 0.4,
        vx: 0.55 + Math.random() * 0.3,
        vy: 0.22 + Math.random() * 0.15,
        startedAt: now,
        life: 900,
      }
      this.nextShootingStarAt = now + 7000 + Math.random() * 9000
    }
    const shooting = this.shootingStar
    if (shooting) {
      const age = now - shooting.startedAt
      const t = age / shooting.life
      if (t >= 1 || t < 0) {
        this.shootingStar = null
      } else {
        const x = shooting.x + shooting.vx * age
        const y = shooting.y + shooting.vy * age
        const tail = ctx.createLinearGradient(x, y, x - shooting.vx * 120, y - shooting.vy * 120)
        tail.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - t)})`)
        tail.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.strokeStyle = tail
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - shooting.vx * 120, y - shooting.vy * 120)
        ctx.stroke()
      }
    }
  }

  private drawExhaust(ctx: CanvasRenderingContext2D, now: number) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const row of this.engineRows()) {
      const y = this.cellY(row)
      const flicker = 0.85 + 0.12 * Math.sin(now / 37 + row) + (Math.random() - 0.5) * 0.08
      const length = 84 * flicker
      const x = PAD.left - 24
      ctx.save()
      ctx.translate(x - length * 0.45, y)
      ctx.scale(length / 32, 0.66)
      this.drawGlow(ctx, 0, 0, 32, '#3b82f6', 0.75)
      ctx.restore()
      ctx.save()
      ctx.translate(x - length * 0.28, y)
      ctx.scale((length * 0.55) / 20, 0.52)
      this.drawGlow(ctx, 0, 0, 20, '#67e8f9', 0.9)
      ctx.restore()
      this.drawGlow(ctx, x - 4, y, 15, '#ffffff', 0.85)
    }
    ctx.restore()
  }

  private drawAmbient(ctx: CanvasRenderingContext2D, state: TfState) {
    const now = state.now
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    // Pantallas de las terminales: titilan; brillan fuerte al llegar una pregunta.
    const terminals = this.terminalsRect()
    const boost = Math.max(0, (this.terminalsBoostUntil - now) / 1500)
    TERMINAL_SCREENS.forEach(([fx, fy], index) => {
      const x = PAD.left + terminals.x + fx * terminals.width
      const y = PAD.top + terminals.y + fy * terminals.height
      const flicker = boost > 0 ? (Math.sin(now / 40 + index) > 0 ? 1 : 0.6) : 1
      const alpha = (0.32 + 0.14 * Math.sin(now / 420 + index * 1.7) + boost * 0.6) * flicker
      this.drawGlow(ctx, x, y, 20 + boost * 12, '#22d3ee', alpha)
    })

    // Reactor (nido): latido violeta.
    const reactor = this.map.rooms.find((room) => room.id === 'reactor')
    if (reactor) {
      const x = PAD.left + ((reactor.left + reactor.right + 1) / 2) * CELL
      const y = PAD.top + ((reactor.top + reactor.bottom + 1) / 2) * CELL
      this.drawGlow(ctx, x, y, CELL * 2.2, '#a855f7', 0.22 + 0.1 * Math.sin(now / 520))
      ctx.strokeStyle = `rgba(216, 180, 254, ${0.25 + 0.15 * Math.sin(now / 300)})`
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.lineDashOffset = -now / 30
      ctx.beginPath()
      ctx.ellipse(x, y + 6, CELL * 1.35, CELL * 0.7, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Plataforma del robot.
    const start = this.map.playerStart
    const sx = this.cellX(start.col)
    const sy = this.cellY(start.row) + 6
    this.drawGlow(ctx, sx, sy, CELL * 0.75, '#06b6d4', 0.22 + 0.1 * Math.sin(now / 380))
    ctx.strokeStyle = `rgba(103, 232, 249, ${0.35 + 0.2 * Math.sin(now / 260)})`
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = now / 40
    ctx.beginPath()
    ctx.ellipse(sx, sy, CELL * 0.62, CELL * 0.28, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // LED de las cámaras de seguridad.
    for (const cell of this.map.decor.cameras) {
      const on = Math.floor((now + cell.col * 337) / 600) % 2 === 0
      const x = PAD.left + cell.col * CELL + CELL * 0.62
      const y = PAD.top + cell.row * CELL + 9
      if (on) {
        this.drawGlow(ctx, x, y, 7, '#ef4444', 0.9)
        this.drawGlow(ctx, x, y, 2.5, '#ffffff', 0.9)
      }
    }

    // Luces de navegación del casco: roja, verde y estrobo blanco en la punta.
    const blink = (period: number, offset: number) => ((now + offset) % period) / period
    const left = PAD.left + 5
    const top = PAD.top + 5
    const bottom = PAD.top + this.map.rows * CELL - 5
    if (blink(1400, 0) < 0.5) this.drawGlow(ctx, left, top, 9, '#ef4444', 0.95)
    if (blink(1400, 700) < 0.5) this.drawGlow(ctx, left, bottom, 9, '#22c55e', 0.95)
    const strobe = blink(1700, 0)
    if (strobe < 0.06 || (strobe > 0.12 && strobe < 0.18)) {
      this.drawGlow(ctx, PAD.left + this.map.cols * CELL + 5, this.cellY(6), 14, '#ffffff', 1)
    }

    ctx.restore()
  }

  private refreshDotsLayer(state: TfState) {
    if (!this.dotsLayer || (this.dotsLayerState === state && this.dotsLayerCount === state.dotsLeft)) return
    const ctx = this.dotsLayer.getContext('2d')
    if (!ctx) return
    this.dotsLayerState = state
    this.dotsLayerCount = state.dotsLeft
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0)
    ctx.clearRect(0, 0, this.shipWidth, this.shipHeight)
    ctx.globalCompositeOperation = 'lighter'
    for (let row = 0; row < this.map.rows; row++) {
      for (let col = 0; col < this.map.cols; col++) {
        if (!state.dotGrid[row][col]) continue
        const x = this.cellX(col)
        const y = this.cellY(row)
        this.drawGlow(ctx, x, y, 11, '#0ea5e9', 0.5)
        this.drawGlow(ctx, x, y, 4.4, '#e0f2fe', 0.95)
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawPickups(ctx: CanvasRenderingContext2D, state: TfState) {
    const now = state.now
    this.refreshDotsLayer(state)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    if (this.dotsLayer) {
      ctx.globalAlpha = 0.82 + 0.18 * Math.sin(now / 320)
      ctx.drawImage(this.dotsLayer, 0, 0, this.shipWidth, this.shipHeight)
      ctx.globalAlpha = 1
    }
    for (const core of state.cores) {
      if (core.taken) continue
      const x = this.cellX(core.pos.col)
      const y = this.cellY(core.pos.row)
      const pulse = 1 + 0.14 * Math.sin(now / 200)
      this.drawGlow(ctx, x, y, 28 * pulse, '#06b6d4', 0.62)
      this.drawGlow(ctx, x, y, 11 * pulse, '#ecfeff', 1)
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.88)'
      ctx.lineWidth = 2
      for (let i = 0; i < 2; i++) {
        ctx.beginPath()
        ctx.ellipse(x, y, 18 * pulse, 7 * pulse, now / 500 + i * (Math.PI / 2), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  private zoneVisuals(state: TfState): ZoneVisual[] {
    const now = state.now
    const visuals: ZoneVisual[] = []
    const warning =
      state.phase === 'playing' && state.relocateAt !== null && state.relocateAt - state.worldTime < ZONE_WARNING_MS
    const result = state.phase === 'feedback' ? state.lastResult : null

    for (const kind of ['TRUE', 'FALSE'] as const) {
      const zone = state.zones[kind]
      if (zone.leaving) {
        const t = (now - zone.leaving.at) / ZONE_WARP_OUT_MS
        if (t < 1) {
          visuals.push({ kind, cell: zone.leaving.pos, scale: 1 - t * t, alpha: 1 - t, jitter: 0, highlight: 'none' })
        }
      }
      if (!zone.pos) continue
      const since = now - zone.shownAt
      if (since < 0) continue
      const t = Math.min(1, since / ZONE_WARP_IN_MS)
      let alpha = Math.min(1, t * 1.6)
      let jitter = 0
      if (warning) {
        alpha *= Math.sin(now / 55) > 0 ? 1 : 0.35
        jitter = (Math.random() - 0.5) * 3
      }
      let highlight: ZoneVisual['highlight'] = 'none'
      if (result) {
        const chosenHere = result.zoneCell.row === zone.pos.row && result.zoneCell.col === zone.pos.col
        if (chosenHere) highlight = result.correct ? 'chosen-correct' : 'chosen-wrong'
        else highlight = result.correct ? 'dim' : 'answer'
      }
      visuals.push({ kind, cell: zone.pos, scale: easeOutBack(t), alpha, jitter, highlight })
    }
    return visuals
  }

  private drawZoneFloors(ctx: CanvasRenderingContext2D, state: TfState, zones: ZoneVisual[]) {
    const now = state.now
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const zone of zones) {
      const style = ZONE_STYLE[zone.kind]
      const x = this.cellX(zone.cell.col) + zone.jitter
      const y = this.cellY(zone.cell.row) + CELL * 0.32
      const dim = zone.highlight === 'dim' ? 0.35 : 1
      const strong = zone.highlight === 'answer' || zone.highlight === 'chosen-correct' ? 1.6 : 1
      const alpha = zone.alpha * dim
      const pulse = 1 + 0.08 * Math.sin(now / 260 + (zone.kind === 'TRUE' ? 0 : 1.5))

      // Haz de luz vertical, como un proyector holográfico.
      const beamHeight = CELL * 3.2 * zone.scale
      const beamWidth = CELL * 1.55 * zone.scale
      const beam = ctx.createLinearGradient(0, y, 0, y - beamHeight)
      beam.addColorStop(0, `${style.main}55`)
      beam.addColorStop(1, `${style.main}00`)
      ctx.globalAlpha = Math.min(1, alpha * 0.9 * strong)
      ctx.fillStyle = beam
      ctx.fillRect(x - beamWidth / 2, y - beamHeight, beamWidth, beamHeight)
      ctx.globalAlpha = 1

      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, 0.42)
      this.drawGlow(ctx, 0, 0, CELL * 1.35 * zone.scale * pulse, style.main, 0.58 * alpha * strong)
      ctx.restore()

      ctx.globalAlpha = alpha
      ctx.strokeStyle = style.light
      ctx.lineWidth = 2.5
      ctx.setLineDash([9, 7])
      ctx.lineDashOffset = -now / 35
      ctx.beginPath()
      ctx.ellipse(x, y, CELL * 1.02 * zone.scale * pulse, CELL * 0.42 * zone.scale * pulse, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  private drawShadows(ctx: CanvasRenderingContext2D, state: TfState) {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)'
    const player = state.player
    if (!player.vent && !(state.phase === 'caught')) {
      const point = interpolatedPosition(player)
      ctx.beginPath()
      ctx.ellipse(this.cellX(point.col), this.footY(point.row) + 1, CELL * 0.44, CELL * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const jelly of state.jellies) {
      const point = interpolatedPosition(jelly)
      const float = Math.sin(state.now / 280 + jelly.index * 1.3)
      ctx.globalAlpha = jelly.mode === 'RETURNING' ? 0.2 : 0.75 - float * 0.15
      ctx.beginPath()
      ctx.ellipse(this.cellX(point.col), this.footY(point.row) + 2, CELL * (0.38 - float * 0.04), CELL * 0.13, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawDepthSorted(ctx: CanvasRenderingContext2D, state: TfState, zones: ZoneVisual[]) {
    const items: Array<{ y: number; draw: () => void }> = []

    for (const obstacle of this.map.obstacles) {
      const sprite = obstacle.kind === 'crate' ? this.assets.decor.crate : this.assets.decor.barrels
      const width = obstacle.kind === 'crate' ? CELL * 1.0 : CELL * 1.12
      const bottom = PAD.top + (obstacle.pos.row + 1) * CELL - 3
      items.push({ y: bottom, draw: () => this.drawSpriteFit(ctx, sprite, this.cellX(obstacle.pos.col), bottom, width) })
    }

    for (const zone of zones) {
      const bottom = PAD.top + (zone.cell.row + 1) * CELL + 2
      items.push({ y: bottom, draw: () => this.drawZone(ctx, state, zone, bottom) })
    }

    const ventArrows = new Set<string>()
    for (const vent of this.map.vents) {
      const key = `${vent.pos.row}:${vent.pos.col}`
      if (ventArrows.has(key)) continue
      ventArrows.add(key)
      const y = PAD.top + vent.pos.row * CELL + 2
      items.push({ y, draw: () => this.drawVentArrow(ctx, state, vent.pos) })
    }

    for (const jelly of state.jellies) {
      const point = interpolatedPosition(jelly)
      items.push({ y: this.footY(point.row), draw: () => this.drawJelly(ctx, state, jelly) })
    }

    const playerPoint = state.phase === 'caught' && state.caught ? state.caught.cell : interpolatedPosition(state.player)
    items.push({ y: this.footY(playerPoint.row) + 0.5, draw: () => this.drawRobot(ctx, state) })

    items.sort((a, b) => a.y - b.y)
    for (const item of items) item.draw()
  }

  private drawZone(ctx: CanvasRenderingContext2D, state: TfState, zone: ZoneVisual, bottom: number) {
    const style = ZONE_STYLE[zone.kind]
    const sprite = zone.kind === 'TRUE' ? this.assets.decor['zone-true'] : this.assets.decor['zone-false']
    const now = state.now
    const x = this.cellX(zone.cell.col) + zone.jitter
    const bob = Math.sin(now / 420 + (zone.kind === 'TRUE' ? 0 : 2)) * 3
    const width = ZONE_DRAW_WIDTH * zone.scale
    const height = (sprite.height / sprite.width) * width
    const top = bottom - height + bob
    let alpha = zone.alpha * (zone.highlight === 'dim' ? 0.45 : 1)
    let shakeX = 0
    if (zone.highlight === 'chosen-wrong') {
      shakeX = Math.sin(now / 25) * 2.5
      alpha *= 0.85
    }

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(sprite, x - width / 2 + shakeX, top, width, height)

    // Barrido holográfico que recorre el sprite.
    const sweep = ((now / 1600) % 1) * height
    ctx.globalCompositeOperation = 'lighter'
    const band = ctx.createLinearGradient(0, top + sweep - 14, 0, top + sweep + 14)
    band.addColorStop(0, `${style.light}00`)
    band.addColorStop(0.5, `${style.light}33`)
    band.addColorStop(1, `${style.light}00`)
    ctx.fillStyle = band
    ctx.fillRect(x - width / 2 + shakeX, top + sweep - 14, width, 28)
    ctx.globalCompositeOperation = 'source-over'

    if (zone.highlight === 'chosen-wrong') {
      // Una X grande sobre la sala equivocada.
      ctx.strokeStyle = '#fecaca'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      const cx = x + shakeX
      const cy = top + height * 0.48
      const r = width * 0.22
      ctx.beginPath()
      ctx.moveTo(cx - r, cy - r)
      ctx.lineTo(cx + r, cy + r)
      ctx.moveTo(cx + r, cy - r)
      ctx.lineTo(cx - r, cy + r)
      ctx.stroke()
    }

    // Letrero sobre la sala: la palabra completa, grande y legible.
    if (zone.scale > 0.4) {
      const label = `${style.icon} ${style.label}`
      ctx.font = `700 ${16 * Math.min(1, zone.scale)}px ${FONT}`
      const textWidth = ctx.measureText(label).width
      const pillW = textWidth + 22
      const pillH = 27
      const pillX = x - pillW / 2
      const pillY = Math.max(4, top - pillH - 2 + Math.sin(now / 300) * 1.5)
      ctx.shadowColor = style.main
      ctx.shadowBlur = zone.highlight === 'answer' ? 22 + Math.sin(now / 120) * 9 : 12
      ctx.fillStyle = style.dark
      roundedRect(ctx, pillX, pillY, pillW, pillH, 13.5)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = style.light
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x, pillY + pillH / 2 + 0.5)
    }
    ctx.restore()

    if (zone.highlight === 'answer') {
      // Si el jugador se equivocó, la sala correcta late para que vea dónde estaba.
      const pulse = (now % 900) / 900
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = style.light
      ctx.globalAlpha = 1 - pulse
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(x, bottom - CELL * 0.2, CELL * (1.0 + pulse * 1.1), CELL * (0.42 + pulse * 0.46), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawVentArrow(ctx: CanvasRenderingContext2D, state: TfState, cell: CellPosition) {
    const point = interpolatedPosition(state.player)
    const distance = Math.abs(point.row - cell.row) + Math.abs(point.col - cell.col)
    const near = distance < 3.5
    const sprite = this.assets.decor['arrow-up']
    const width = CELL * (near ? 0.74 : 0.6)
    const height = (sprite.height / sprite.width) * width
    const x = this.cellX(cell.col)
    const y = PAD.top + cell.row * CELL - 4 + Math.sin(state.now / 240 + cell.col) * 3
    ctx.save()
    ctx.globalAlpha = near ? 0.95 : 0.45
    ctx.drawImage(sprite, x - width / 2, y - height + 12, width, height)
    ctx.restore()
  }

  private drawJelly(ctx: CanvasRenderingContext2D, state: TfState, jelly: TfJelly) {
    const now = state.now
    const point = interpolatedPosition(jelly)
    const empActive = state.empUntil !== null
    const stunned = jelly.mode === 'FRIGHTENED' || (jelly.mode === 'WAITING' && empActive)
    const ending = empActive && state.empUntil !== null && state.empUntil - state.worldTime < EMP_WARNING_MS
    let frames = this.assets.jellies[jelly.index % this.assets.jellies.length]
    if (stunned) frames = ending && Math.floor(now / 160) % 2 === 0 ? this.assets.jellyFlash : this.assets.jellyStunned

    const list = frames[jelly.facing]
    const frame = list[Math.floor(now / 130 + jelly.index * 1.7) % list.length]
    const k = JELLY_DRAW_HEIGHT / JELLY_SOURCE_HEIGHT
    const breathe = jelly.mode === 'WAITING' ? 1 + Math.sin(now / 240 + jelly.index) * 0.04 : 1
    const width = frame.width * k
    const height = frame.height * k * breathe
    const float = Math.sin(now / 280 + jelly.index * 1.3) * 4.5
    const x = this.cellX(point.col)
    const feet = this.footY(point.row) - 10 - float
    const glow = stunned ? '#93c5fd' : JELLY_COLORS[jelly.index % JELLY_COLORS.length].glow

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    this.drawGlow(ctx, x, feet - height * 0.62, CELL * 1.15, glow, jelly.mode === 'RETURNING' ? 0.12 : 0.26 + 0.08 * Math.sin(now / 200 + jelly.index))
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = jelly.mode === 'RETURNING' ? 0.3 : jelly.mode === 'WAITING' ? 0.92 : 1
    ctx.drawImage(frame, x - width / 2, feet - height, width, height)
    ctx.restore()
  }

  private drawRobot(ctx: CanvasRenderingContext2D, state: TfState) {
    const player = state.player
    const now = state.now
    let point: { row: number; col: number } = interpolatedPosition(player)
    let scale = 1
    let rotation = 0
    let alpha = 1
    let frames = this.assets.robot
    let offsetX = 0
    let offsetY = 0

    if (player.vent) {
      const t = Math.min(1, (state.worldTime - player.vent.startedAt) / VENT_TRAVEL_MS)
      if (t < 0.5) {
        point = player.vent.from
        scale = 1 - t * 2
        offsetY = t * 2 * 14
      } else {
        point = player.vent.to
        scale = (t - 0.5) * 2
        offsetY = (1 - (t - 0.5) * 2) * 14
      }
    }

    if (state.phase === 'caught' && state.caught) {
      const t = Math.min(1, (now - state.caught.at) / CAUGHT_MS)
      point = state.caught.cell
      rotation = t * Math.PI * 3
      scale = Math.max(0.2, 1 - t * 0.75)
      alpha = t > 0.8 ? (1 - t) / 0.2 : 1
      frames = Math.floor(now / 90) % 2 === 0 ? this.assets.robotHurt : this.assets.robot
    }

    if (state.phase === 'feedback' && state.lastResult) {
      const since = now - (state.feedbackSkippableAt - FEEDBACK_MIN_MS)
      if (state.lastResult.correct && since < 1100) offsetY -= Math.abs(Math.sin(since / 115)) * 13
      if (!state.lastResult.correct && since < 700) {
        offsetX = Math.sin(since / 22) * 4
        if (Math.floor(since / 110) % 2 === 0) frames = this.assets.robotHurt
      }
    }

    if (scale <= 0.01) return

    const moving = state.phase === 'playing' && isMoving(player) && !player.idle && !player.vent
    const list = frames[player.facing]
    const frame = list[moving ? Math.floor(now / 105) % list.length : 0]
    const k = (ROBOT_DRAW_HEIGHT / ROBOT_SOURCE_HEIGHT) * scale
    const width = frame.width * k
    const height = frame.height * k
    const hover = moving ? -Math.abs(Math.sin(now / 95)) * 3 : -2 - Math.sin(now / 320) * 2
    const x = this.cellX(point.col) + offsetX
    const feet = this.footY(point.row) + hover + offsetY

    const shielded = state.phase === 'playing' && state.worldTime < player.shieldUntil && !player.vent
    if (shielded && Math.floor(now / 110) % 2 === 0) alpha *= 0.4

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    this.drawGlow(ctx, x, feet - 2, CELL * 0.58 * scale, '#22d3ee', 0.34 + (moving ? 0.12 : 0))
    if (state.empUntil !== null && state.phase === 'playing') {
      this.drawGlow(ctx, x, feet - height * 0.5, CELL * 1.4, '#22d3ee', 0.22 + 0.08 * Math.sin(now / 90))
    }
    ctx.restore()

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, feet - height / 2)
    ctx.rotate(rotation)
    ctx.drawImage(frame, -width / 2, -height / 2, width, height)
    ctx.restore()

    if (shielded) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.45 + 0.2 * Math.sin(now / 90)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(x, feet - height / 2, width * 0.7, height * 0.62, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const particle of this.particles) {
      if (particle.delay > 0) continue
      const t = particle.age / particle.life
      const fade = 1 - t
      switch (particle.kind) {
        case 'glow':
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          this.drawGlow(ctx, particle.x, particle.y, particle.size * (0.5 + fade * 0.5), particle.color, fade)
          ctx.restore()
          break
        case 'spark': {
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = fade
          ctx.strokeStyle = particle.color
          ctx.lineWidth = particle.size
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(particle.x - particle.vx * 0.04, particle.y - particle.vy * 0.04)
          ctx.stroke()
          ctx.restore()
          break
        }
        case 'smoke':
          ctx.save()
          ctx.globalAlpha = 0.35 * fade
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * (0.5 + t), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          break
        case 'confetti':
          ctx.save()
          ctx.globalAlpha = Math.min(1, fade * 1.6)
          ctx.translate(particle.x, particle.y)
          ctx.rotate(particle.rotation)
          ctx.fillStyle = particle.color
          ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2)
          ctx.restore()
          break
      }
    }

    for (const ring of this.rings) {
      if (ring.delay > 0) continue
      const t = ring.age / ring.duration
      const radius = ring.radius * (0.15 + 0.85 * (1 - Math.pow(1 - t, 3)))
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 1 - t
      ctx.strokeStyle = ring.color
      ctx.lineWidth = ring.width * (1 - t * 0.6)
      ctx.beginPath()
      ctx.ellipse(ring.x, ring.y, radius, radius * ring.squash, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawTexts(ctx: CanvasRenderingContext2D) {
    for (const text of this.texts) {
      if (text.delay > 0) continue
      const t = text.age / text.duration
      const rise = 46 * (1 - Math.pow(1 - t, 2))
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1
      ctx.save()
      ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1
      ctx.font = `700 ${text.size * pop}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.85)'
      ctx.strokeText(text.text, text.x, text.y - rise)
      ctx.shadowColor = text.color
      ctx.shadowBlur = 14
      ctx.fillStyle = text.color
      ctx.fillText(text.text, text.x, text.y - rise)
      ctx.restore()
    }
  }

  private drawLightsOut(ctx: CanvasRenderingContext2D, state: TfState) {
    if (this.lightsLevel < 0.01 || !this.darkness) return
    const dark = this.darkness.getContext('2d')
    if (!dark) return
    const now = state.now
    const level = this.lightsLevel
    const { worldWidth: w, worldHeight: h } = this
    dark.setTransform(this.k, 0, 0, this.k, 0, 0)
    dark.globalCompositeOperation = 'source-over'
    dark.clearRect(0, 0, w, h)
    dark.fillStyle = `rgba(2, 4, 12, ${0.93 * level})`
    dark.fillRect(0, 0, w, h)

    // Los huecos de luz se calculan en coordenadas de la nave.
    dark.save()
    dark.translate(this.shipX, this.shipY)
    dark.globalCompositeOperation = 'destination-out'
    const cut = (x: number, y: number, radius: number, strength = 1) => {
      const gradient = dark.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`)
      gradient.addColorStop(0.55, `rgba(0, 0, 0, ${strength * 0.85})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      dark.fillStyle = gradient
      dark.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    const player = interpolatedPosition(state.player)
    const flicker = 1 + Math.sin(now / 70) * 0.025 + (Math.random() - 0.5) * 0.02
    cut(this.cellX(player.col), this.cellY(player.row) - 14, CELL * 3.4 * flicker)
    for (const kind of ['TRUE', 'FALSE'] as const) {
      const pos = state.zones[kind].pos
      if (pos) cut(this.cellX(pos.col), this.cellY(pos.row) - 18, CELL * 1.7, 0.9)
    }
    for (const core of state.cores) if (!core.taken) cut(this.cellX(core.pos.col), this.cellY(core.pos.row), CELL * 0.7, 0.8)
    for (const jelly of state.jellies) {
      const point = interpolatedPosition(jelly)
      cut(this.cellX(point.col), this.cellY(point.row) - 24, CELL * 0.85, 0.75)
    }
    dark.restore()
    dark.globalCompositeOperation = 'source-over'

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.darkness, 0, 0)
    ctx.restore()

    // Luz roja de emergencia barriendo los bordes.
    const pulse = 0.5 + 0.5 * Math.sin(now / 260)
    ctx.save()
    ctx.globalAlpha = 0.28 * level * pulse
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, Math.max(w, h) * 0.65)
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0)')
    gradient.addColorStop(1, 'rgba(239, 68, 68, 1)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  private drawScreenEffects(ctx: CanvasRenderingContext2D, state: TfState) {
    const now = state.now
    const { worldWidth: w, worldHeight: h } = this
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, w, h)

    const alarm =
      state.phase === 'caught' || (state.phase === 'feedback' && state.lastResult !== null && !state.lastResult.correct)
    const emp = state.empUntil !== null && state.phase === 'playing'
    if (alarm || emp) {
      const color = alarm ? '239, 68, 68' : '34, 211, 238'
      const strength = alarm ? 0.32 * (0.6 + 0.4 * Math.sin(now / 140)) : 0.14 + 0.05 * Math.sin(now / 160)
      ctx.save()
      const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.38, w / 2, h / 2, Math.max(w, h) * 0.62)
      gradient.addColorStop(0, `rgba(${color}, 0)`)
      gradient.addColorStop(1, `rgba(${color}, ${strength})`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    if (this.flash) {
      ctx.save()
      ctx.globalAlpha = this.flash.alpha
      ctx.fillStyle = this.flash.color
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }
}
