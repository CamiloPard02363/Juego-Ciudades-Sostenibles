import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { CellPosition, MazeCollectorConfig, MazeCollectorItem, MazeLayoutDef, ZoneType } from './mazeCollectorTypes'
import {
  loadMazeCollectorTextures,
  assetKeyForWasteType,
  CITY_BUILDING_TILE_KEYS,
  type MazeCollectorAssetKey,
  type MazeCollectorTextures,
} from './mazeCollectorPixiAssets'
import { DETECTION_RADIUS } from './mazeCollectorEngine'

/** 72px de celda — el camión pasa de ~36px (v1) a ~59px, tamaño legible en tablet/móvil. */
export const CELL_SIZE = 72

const CITY_STREET_SPACING = 4

/** Duración visual del "paso" entre celdas — algo menor que TICK_MS=260 del hook para que el tween termine antes del siguiente tick. */
const MOVE_DURATION_MS = 240

type Facing = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
/** Textura por dirección — LEFT reusa RIGHT con flip horizontal, no hay sprite de perfil izquierdo propio. */
const TRUCK_TEXTURE_BY_FACING: Record<Facing, MazeCollectorAssetKey> = {
  RIGHT: 'truckRight',
  LEFT: 'truckRight',
  DOWN: 'truckDown',
  UP: 'truckUp',
}

function hashCell(row: number, col: number): number {
  return Math.abs(row * 31 + col * 17)
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

type Tween = { from: number; to: number; startTime: number }

/** Sprite dinámico con su estado de interpolación de posición. */
type DynamicSprite = {
  sprite: Sprite
  x: Tween
  y: Tween
  /** Escala base fijada al crear el sprite — las animaciones idle (pulso) escalan a partir de esto, nunca del valor mutado del frame anterior. */
  baseScale: number
}

function createTween(value: number): Tween {
  return { from: value, to: value, startTime: performance.now() }
}

function retarget(tween: Tween, currentValue: number, nextValue: number): Tween {
  if (nextValue === tween.to) return tween
  return { from: currentValue, to: nextValue, startTime: performance.now() }
}

function resolveTween(tween: Tween, now: number): number {
  const t = Math.min(1, (now - tween.startTime) / MOVE_DURATION_MS)
  return lerp(tween.from, tween.to, easeOutQuad(t))
}

function manhattan(a: CellPosition, b: CellPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

export type UseMazeCollectorPixiRendererOptions = {
  hostRef: RefObject<HTMLDivElement | null>
  layout: MazeLayoutDef
  items: MazeCollectorItem[]
  config: MazeCollectorConfig
  playerPos: CellPosition
  facing: Facing
  enemyPositions: CellPosition[]
  remainingItemPositions: Array<{ itemId: string; position: CellPosition }>
  /** > 0 mientras el power-up "Super-Recogida" está activo: nubes huyen, camión brilla dorado. */
  superCollectTicksLeft: number
}

/**
 * Monta un Application de PixiJS dentro de `hostRef` y lo mantiene en sincronía
 * con el estado lógico del juego (que sigue viviendo en useMazeCollectorGame).
 * Separa una capa estática (piso del laberinto, pintado una sola vez por layout)
 * de una dinámica (camión/nubes/ítems/fachadas, interpolada cada frame vía el
 * ticker de Pixi) para evitar el redibujado completo que dejaba el canvas 2D
 * anterior a ~2 FPS.
 */
export function useMazeCollectorPixiRenderer({
  hostRef,
  layout,
  items,
  config,
  playerPos,
  facing,
  enemyPositions,
  remainingItemPositions,
  superCollectTicksLeft,
}: UseMazeCollectorPixiRendererOptions) {
  const appRef = useRef<Application | null>(null)
  const truckRef = useRef<DynamicSprite | null>(null)
  const enemySpritesRef = useRef<DynamicSprite[]>([])
  const itemSpritesRef = useRef<Map<string, Sprite>>(new Map())
  const dynamicLayerRef = useRef<Container | null>(null)
  const texturesRef = useRef<MazeCollectorTextures | null>(null)
  const readyRef = useRef(false)
  const fleeingRef = useRef(false)

  const isCity = config.layout === 'CITY'

  // --- Montaje / desmontaje de la Application ---
  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

    const app = new Application()

    async function setup(hostEl: HTMLDivElement) {
      const textures = await loadMazeCollectorTextures()
      if (cancelled) return
      texturesRef.current = textures

      await app.init({
        width: layout.cols * CELL_SIZE,
        height: layout.rows * CELL_SIZE,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      })
      if (cancelled) {
        app.destroy(true, { children: true, texture: true })
        return
      }

      hostEl.appendChild(app.canvas)
      appRef.current = app

      const staticLayer = new Container()
      const dynamicLayer = new Container()
      app.stage.addChild(staticLayer, dynamicLayer)
      dynamicLayerRef.current = dynamicLayer

      buildStaticLayer(staticLayer, layout, isCity, textures)
      buildFacades(dynamicLayer, layout, isCity, textures)

      const truckTexture = textures[TRUCK_TEXTURE_BY_FACING[facing]]
      const truckSprite = new Sprite(truckTexture)
      truckSprite.anchor.set(0.5)
      sizeSpriteToCell(truckSprite, truckTexture, 0.82)
      truckSprite.x = playerPos.col * CELL_SIZE + CELL_SIZE / 2
      truckSprite.y = playerPos.row * CELL_SIZE + CELL_SIZE / 2
      if (facing === 'LEFT') truckSprite.scale.x *= -1
      dynamicLayer.addChild(truckSprite)
      truckRef.current = {
        sprite: truckSprite,
        x: createTween(truckSprite.x),
        y: createTween(truckSprite.y),
        baseScale: Math.abs(truckSprite.scale.x),
      }

      enemySpritesRef.current = layout.enemySpawns.map((spawn) => {
        const sprite = new Sprite(textures.cloudPatrol)
        sprite.anchor.set(0.5)
        sizeSpriteToCell(sprite, textures.cloudPatrol, 0.78)
        sprite.x = spawn.col * CELL_SIZE + CELL_SIZE / 2
        sprite.y = spawn.row * CELL_SIZE + CELL_SIZE / 2
        dynamicLayer.addChild(sprite)
        return { sprite, x: createTween(sprite.x), y: createTween(sprite.y), baseScale: sprite.scale.x }
      })

      const itemSprites = new Map<string, Sprite>()
      for (const entry of remainingItemPositions) {
        const item = items.find((i) => i.itemId === entry.itemId)
        if (!item) continue
        const sprite = createItemSprite(item, textures)
        sprite.x = entry.position.col * CELL_SIZE + CELL_SIZE / 2
        sprite.y = entry.position.row * CELL_SIZE + CELL_SIZE / 2
        dynamicLayer.addChild(sprite)
        itemSprites.set(item.itemId, sprite)
      }
      itemSpritesRef.current = itemSprites

      readyRef.current = true

      app.ticker.add(() => tick(truckRef, enemySpritesRef, fleeingRef))
    }

    setup(host)

    return () => {
      cancelled = true
      readyRef.current = false
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
      }
      if (host.firstChild) host.removeChild(host.firstChild)
    }
    // Solo se reconstruye si cambia el laberinto en sí — el resto se sincroniza por posiciones abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, isCity, hostRef])

  // --- Sincronización del camión ---
  useEffect(() => {
    const truck = truckRef.current
    const textures = texturesRef.current
    if (!truck || !textures || !readyRef.current) return

    const targetX = playerPos.col * CELL_SIZE + CELL_SIZE / 2
    const targetY = playerPos.row * CELL_SIZE + CELL_SIZE / 2
    const now = performance.now()
    truck.x = retarget(truck.x, resolveTween(truck.x, now), targetX)
    truck.y = retarget(truck.y, resolveTween(truck.y, now), targetY)

    const texture = textures[TRUCK_TEXTURE_BY_FACING[facing]]
    if (truck.sprite.texture !== texture) {
      truck.sprite.texture = texture
      sizeSpriteToCell(truck.sprite, texture, 0.82)
      truck.baseScale = Math.abs(truck.sprite.scale.x)
    }
    truck.sprite.scale.x = facing === 'LEFT' ? -truck.baseScale : truck.baseScale

    triggerBounce(truck.sprite)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos.row, playerPos.col, facing])

  // --- Tint dorado del camión mientras el power-up está activo ---
  useEffect(() => {
    const truck = truckRef.current
    if (!truck) return
    fleeingRef.current = superCollectTicksLeft > 0
    truck.sprite.tint = superCollectTicksLeft > 0 ? 0xffd54a : 0xffffff
  }, [superCollectTicksLeft])

  // --- Sincronización de enemigos (posición + textura según estado de IA) ---
  useEffect(() => {
    if (!readyRef.current) return
    const textures = texturesRef.current
    if (!textures) return
    const now = performance.now()
    const fleeing = superCollectTicksLeft > 0

    enemyPositions.forEach((pos, index) => {
      const enemy = enemySpritesRef.current[index]
      if (!enemy) return
      const targetX = pos.col * CELL_SIZE + CELL_SIZE / 2
      const targetY = pos.row * CELL_SIZE + CELL_SIZE / 2
      enemy.x = retarget(enemy.x, resolveTween(enemy.x, now), targetX)
      enemy.y = retarget(enemy.y, resolveTween(enemy.y, now), targetY)

      const distance = manhattan(pos, playerPos)
      const textureKey = fleeing ? 'cloudPatrol' : distance <= 2 ? 'cloudAlert' : distance <= DETECTION_RADIUS ? 'cloudChase' : 'cloudPatrol'
      const texture = textures[textureKey]
      if (enemy.sprite.texture !== texture) {
        enemy.sprite.texture = texture
        sizeSpriteToCell(enemy.sprite, texture, 0.78)
        enemy.baseScale = enemy.sprite.scale.x
      }
      // Modo huida: la misma nube "patrulla" volteada horizontalmente, como
      // proxy de "está asustada, no amenaza" — no hay sprite dedicado en el set.
      enemy.sprite.scale.x = fleeing ? -Math.abs(enemy.baseScale) : Math.abs(enemy.baseScale)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyPositions, superCollectTicksLeft])

  // --- Sincronización de ítems recolectados ---
  useEffect(() => {
    if (!readyRef.current) return
    const remainingIds = new Set(remainingItemPositions.map((entry) => entry.itemId))
    for (const [itemId, sprite] of itemSpritesRef.current) {
      if (!remainingIds.has(itemId)) {
        spawnCollectEffect(dynamicLayerRef.current, sprite.x, sprite.y)
        sprite.destroy()
        itemSpritesRef.current.delete(itemId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingItemPositions])
}

function createItemSprite(item: MazeCollectorItem, textures: MazeCollectorTextures): Sprite {
  if (item.isPowerUp) {
    const sprite = new Sprite(textures.powerupRecycling)
    sprite.anchor.set(0.5)
    sizeSpriteToCell(sprite, textures.powerupRecycling, 0.6)
    return sprite
  }
  const key = assetKeyForWasteType(item.wasteType)
  const sprite = new Sprite(textures[key])
  sprite.anchor.set(0.5)
  sizeSpriteToCell(sprite, textures[key], 0.55)
  sprite.tint = item.color
  return sprite
}

/** Escala el sprite para que quepa dentro de la celda manteniendo su aspect ratio original. */
function sizeSpriteToCell(sprite: Sprite, texture: { width: number; height: number }, fillRatio: number) {
  const targetSize = CELL_SIZE * fillRatio
  const scale = targetSize / Math.max(texture.width, texture.height)
  sprite.scale.set(scale)
}

/** Agrega un sprite de tile cuadrado que llena exactamente una celda del grid. */
function addTile(layer: Container, texture: Texture, x: number, y: number) {
  const sprite = new Sprite(texture)
  sprite.x = x
  sprite.y = y
  sprite.width = CELL_SIZE
  sprite.height = CELL_SIZE
  layer.addChild(sprite)
}

function buildStaticLayer(staticLayer: Container, layout: MazeLayoutDef, isCity: boolean, textures: MazeCollectorTextures) {
  const decoratedCells = new Set(layout.decorations.map((d) => `${d.row}:${d.col}`))

  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const x = col * CELL_SIZE
      const y = row * CELL_SIZE
      const zone = layout.zones?.[row]?.[col] ?? null

      if (layout.grid[row][col] === 1) {
        // Las celdas de pared "de interés" (recycling_center/school) llevan
        // solo piso de calle aquí — su fachada se superpone en la capa
        // dinámica (buildFacades) con ancla en la base, para mezclar la
        // vista de frente del edificio con el resto del mapa top-down.
        if (isCity && (zone === 'recycling_center' || zone === 'school')) {
          addTile(staticLayer, textures.tileStreet, x, y)
          continue
        }
        const tileKey = isCity ? cityBuildingTileKey(row, col) : 'tileBuildingA'
        addTile(staticLayer, textures[tileKey], x, y)
        continue
      }

      if (isCity && decoratedCells.has(`${row}:${col}`)) {
        addTile(staticLayer, textures.tilePark, x, y)
        continue
      }

      addTile(staticLayer, textures.tileStreet, x, y)
    }
  }

  // Aplana la capa entera a una sola textura en GPU — el layout no vuelve a
  // cambiar durante la partida, así que este costo se paga una sola vez.
  staticLayer.cacheAsTexture(true)
}

/** Fachadas frontales de edificios "de interés", superpuestas con anchor en la base — mezcla vista de frente con el resto del mapa top-down (mismo truco que Pokémon/Stardew Valley). */
function buildFacades(dynamicLayer: Container, layout: MazeLayoutDef, isCity: boolean, textures: MazeCollectorTextures) {
  if (!isCity || !layout.zones) return

  const facadeByZone: Partial<Record<ZoneType, MazeCollectorAssetKey>> = {
    recycling_center: 'buildingRecycling',
    school: 'buildingSchool',
  }

  const placed = new Set<string>()
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      if (layout.grid[row][col] !== 1) continue
      const zone = layout.zones[row][col]
      const assetKey = zone ? facadeByZone[zone] : undefined
      if (!assetKey) continue

      // Una sola fachada por manzana de zona (celda superior-izquierda de un
      // bloque 2x2 de esa zona) — evita empapelar cada celda con la misma imagen.
      const key = `${row}:${col}`
      const alreadyCovered = [-1, 0].some((dr) =>
        [-1, 0].some((dc) => placed.has(`${row + dr}:${col + dc}`)),
      )
      if (alreadyCovered) continue
      placed.add(key)

      const texture = textures[assetKey]
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5, 1)
      const targetWidth = CELL_SIZE * 1.9
      const scale = targetWidth / texture.width
      sprite.scale.set(scale)
      sprite.x = col * CELL_SIZE + CELL_SIZE
      sprite.y = row * CELL_SIZE + CELL_SIZE
      dynamicLayer.addChild(sprite)
    }
  }
}

function cityBuildingTileKey(row: number, col: number): (typeof CITY_BUILDING_TILE_KEYS)[number] {
  const blockRow = Math.floor((row - 1) / CITY_STREET_SPACING)
  const blockCol = Math.floor((col - 1) / CITY_STREET_SPACING)
  return CITY_BUILDING_TILE_KEYS[hashCell(blockRow, blockCol) % CITY_BUILDING_TILE_KEYS.length]
}

/** Rebote "squash & stretch" disparado al llegar a una nueva celda — sensación de vehículo con peso. */
function triggerBounce(sprite: Sprite) {
  const baseScaleY = sprite.scale.y
  const start = performance.now()
  const duration = 160
  function step() {
    const t = Math.min(1, (performance.now() - start) / duration)
    const squash = Math.sin(t * Math.PI) * 0.12
    sprite.scale.y = baseScaleY * (1 - squash)
    if (t < 1) requestAnimationFrame(step)
    else sprite.scale.y = baseScaleY
  }
  requestAnimationFrame(step)
}

/** Ráfaga breve de partículas circulares en el punto de recolección de un ítem. */
function spawnCollectEffect(layer: Container | null, x: number, y: number) {
  if (!layer) return
  const particleCount = 7
  const particles: Array<{ gfx: Graphics; angle: number }> = []
  for (let i = 0; i < particleCount; i++) {
    const gfx = new Graphics().circle(0, 0, 3).fill(0xfacc15)
    gfx.x = x
    gfx.y = y
    layer.addChild(gfx)
    particles.push({ gfx, angle: (Math.PI * 2 * i) / particleCount })
  }

  const start = performance.now()
  const duration = 320
  function step() {
    const t = Math.min(1, (performance.now() - start) / duration)
    for (const { gfx, angle } of particles) {
      const distance = t * CELL_SIZE * 0.6
      gfx.x = x + Math.cos(angle) * distance
      gfx.y = y + Math.sin(angle) * distance
      gfx.alpha = 1 - t
    }
    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      for (const { gfx } of particles) gfx.destroy()
    }
  }
  requestAnimationFrame(step)
}

/** Un tick de animación: interpola posiciones y aplica flotación/pulso idle a las nubes. */
function tick(
  truckRef: RefObject<DynamicSprite | null>,
  enemySpritesRef: RefObject<DynamicSprite[]>,
  fleeingRef: RefObject<boolean>,
) {
  const now = performance.now()

  const truck = truckRef.current
  if (truck) {
    truck.sprite.x = resolveTween(truck.x, now)
    truck.sprite.y = resolveTween(truck.y, now)
  }

  const fleeing = fleeingRef.current
  enemySpritesRef.current.forEach((enemy, index) => {
    const floatOffset = Math.sin(now / 320 + index) * 3
    const pulseFreq = fleeing ? 500 : 260
    const pulse = 1 + Math.sin(now / pulseFreq + index * 1.7) * 0.05
    enemy.sprite.x = resolveTween(enemy.x, now)
    enemy.sprite.y = resolveTween(enemy.y, now) + floatOffset
    const sign = enemy.sprite.scale.x < 0 ? -1 : 1
    enemy.sprite.scale.x = sign * Math.abs(enemy.baseScale) * pulse
    enemy.sprite.scale.y = Math.abs(enemy.baseScale) * pulse
  })
}
