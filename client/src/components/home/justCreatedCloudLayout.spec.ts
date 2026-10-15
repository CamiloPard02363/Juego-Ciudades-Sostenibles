import { describe, expect, it } from 'vitest'
import { pickCloudPlacement } from './justCreatedCloudLayout'

const desktop = { width: 1280, height: 800 }
const mobile = { width: 360, height: 640 }
const cloud = { width: 380, height: 300 }

describe('pickCloudPlacement (issue #2)', () => {
  it('prefiere abajo si hay espacio y centra la cola en la tarjeta', () => {
    const rect = { top: 100, left: 400, width: 300, height: 200 }
    const p = pickCloudPlacement(rect, cloud, desktop)
    expect(p.side).toBe('bottom')
    expect(p.top).toBe(318)
    expect(p.tailOffset).toBe(rect.left + rect.width / 2 - p.left)
  })

  it('pasa arriba si abajo no cabe', () => {
    const p = pickCloudPlacement({ top: 450, left: 400, width: 300, height: 300 }, cloud, desktop)
    expect(p.side).toBe('top')
    expect(p.top + 300).toBeLessThanOrEqual(450 - 18)
  })

  it('usa un lado cuando la tarjeta ocupa casi todo el alto', () => {
    const p = pickCloudPlacement({ top: 20, left: 20, width: 300, height: 760 }, cloud, desktop)
    expect(p.side).toBe('right')
    expect(p.left).toBeGreaterThanOrEqual(20 + 300)
  })

  it('no se sale de la pantalla horizontalmente', () => {
    const p = pickCloudPlacement({ top: 100, left: 1100, width: 160, height: 160 }, cloud, desktop)
    expect(p.left + p.width).toBeLessThanOrEqual(desktop.width - 12)
    expect(p.tailOffset).toBeLessThanOrEqual(p.width - 24)
  })

  it('en móvil ocupa todo el ancho y solo va arriba o abajo', () => {
    const p = pickCloudPlacement({ top: 60, left: 12, width: 336, height: 200 }, cloud, mobile)
    expect(p.width).toBe(336)
    expect(p.left).toBe(12)
    expect(['top', 'bottom']).toContain(p.side)
  })

  it('si nada cabe completo limita el alto para no tapar la tarjeta', () => {
    const rect = { top: 150, left: 12, width: 336, height: 330 }
    const p = pickCloudPlacement(rect, { width: 380, height: 500 }, mobile)
    expect(p.maxHeight).toBeLessThan(500)
    if (p.side === 'bottom') expect(p.top).toBeGreaterThanOrEqual(rect.top + rect.height)
    else expect(p.top + p.maxHeight).toBeLessThanOrEqual(rect.top)
  })
})
