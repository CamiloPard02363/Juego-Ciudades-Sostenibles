import { describe, expect, it } from 'vitest'
import { CELL, clampCameraAxis, fitShipScale, MAX_ZOOM, PAD } from './TrueFalseMazeRenderer'
import { SPACESHIP_MAP } from './spaceshipMap'

const SHIP_WIDTH = SPACESHIP_MAP.cols * CELL + PAD.left + PAD.right
const SHIP_HEIGHT = SPACESHIP_MAP.rows * CELL + PAD.top + PAD.bottom

describe('cámara del Laberinto V/F', () => {
  it('si el espacio libre tiene la proporción de la nave, la nave cabe justa', () => {
    const scale = fitShipScale(SHIP_WIDTH * 1.3, SHIP_HEIGHT * 1.3, SHIP_WIDTH, SHIP_HEIGHT)
    expect(scale).toBeCloseTo(1.3)
  })

  it('en una pantalla más ancha que la nave, la nave cubre todo el ancho (sin franjas a los lados)', () => {
    // Ventana de navegador típica de un portátil con Windows al 125%: 1536x730 menos el HUD.
    const availWidth = 1520
    const availHeight = 608
    const scale = fitShipScale(availWidth, availHeight, SHIP_WIDTH, SHIP_HEIGHT)
    expect(SHIP_WIDTH * scale).toBeCloseTo(availWidth)
    expect(SHIP_HEIGHT * scale).toBeGreaterThan(availHeight)
  })

  it('no agranda la nave más de MAX_ZOOM veces sobre "cabe entera"', () => {
    const contain = Math.min(4000 / SHIP_WIDTH, 300 / SHIP_HEIGHT)
    expect(fitShipScale(4000, 300, SHIP_WIDTH, SHIP_HEIGHT)).toBeCloseTo(contain * MAX_ZOOM)
  })

  it('si en un eje la nave cabe, la cámara la deja centrada', () => {
    expect(clampCameraAxis(0, 800, 600)).toBe(300)
    expect(clampCameraAxis(9999, 800, 600)).toBe(300)
  })

  it('sigue al objetivo sin mostrar más allá de los bordes de la nave', () => {
    expect(clampCameraAxis(500, 400, 1000)).toBe(500)
    expect(clampCameraAxis(50, 400, 1000)).toBe(200)
    expect(clampCameraAxis(980, 400, 1000)).toBe(800)
  })

  it('con la nave más grande que la vista, nunca queda espacio vacío dentro de la vista', () => {
    const view = 608 / 1.397
    for (let target = -100; target <= SHIP_HEIGHT + 100; target += 7) {
      const center = clampCameraAxis(target, view, SHIP_HEIGHT)
      expect(center - view / 2).toBeGreaterThanOrEqual(0)
      expect(center + view / 2).toBeLessThanOrEqual(SHIP_HEIGHT + 1e-9)
    }
  })
})
