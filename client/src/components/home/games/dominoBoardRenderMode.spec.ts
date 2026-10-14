import { describe, expect, it } from 'vitest'
import { DEFAULT_DOMINO_BOARD_RENDER_MODE, resolveDominoBoardPresentation } from './dominoBoardRenderMode'

const board = Array.from({ length: 15 }, (_, index) => ({ id: `tile-${index}`, isDouble: index === 4 }))

describe('resolveDominoBoardPresentation', () => {
  it('solicita bidirectional por defecto, sin depender del entorno de build', () => {
    expect(DEFAULT_DOMINO_BOARD_RENDER_MODE).toBe('bidirectional')
  })

  it('conserva el modo lineal cuando se solicita explícitamente', () => {
    expect(resolveDominoBoardPresentation('linear', board, { width: 800, height: 600 })).toEqual({ kind: 'linear' })
  })

  it('activa serpentine solo con un trazado viable', () => {
    expect(resolveDominoBoardPresentation('serpentine', board, { width: 800, height: 700 }).kind).toBe('serpentine')
  })

  it('activa el modo bidireccional con su ficha inicial real', () => {
    const presentation = resolveDominoBoardPresentation('bidirectional', board, { width: 1440, height: 900 }, 'tile-7')
    expect(presentation.kind).toBe('bidirectional')
    if (presentation.kind !== 'bidirectional') return
    const opening = presentation.layout.tiles.find((tile) => tile.id === 'tile-7')!
    expect(opening.x + opening.width / 2).toBeCloseTo(720)
    expect(opening.y + opening.height / 2).toBeCloseTo(450)
  })

  it('usa linear si falta o no existe la ficha inicial del modo bidireccional', () => {
    expect(resolveDominoBoardPresentation('bidirectional', board, { width: 800, height: 700 })).toEqual({ kind: 'linear' })
    expect(resolveDominoBoardPresentation('bidirectional', board, { width: 800, height: 700 }, 'unknown')).toEqual({ kind: 'linear' })
  })

  it('recalcula el ancla bidireccional al cambiar el tamaño del tablero', () => {
    const compact = resolveDominoBoardPresentation('bidirectional', board, { width: 1200, height: 820 }, 'tile-7')
    expect(compact.kind).toBe('bidirectional')
    if (compact.kind !== 'bidirectional') return
    const opening = compact.layout.tiles.find((tile) => tile.id === 'tile-7')!
    expect(opening.x + opening.width / 2).toBeCloseTo(600)
    expect(opening.y + opening.height / 2).toBeCloseTo(410)
  })

  it('vuelve al modo lineal cuando no hay espacio suficiente', () => {
    expect(resolveDominoBoardPresentation('serpentine', board, { width: 180, height: 400 })).toEqual({ kind: 'linear' })
  })
})
