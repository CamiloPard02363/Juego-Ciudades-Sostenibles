import { describe, expect, it } from 'vitest'
import { resolveDominoBoardPresentation } from './dominoBoardRenderMode'

const board = Array.from({ length: 15 }, (_, index) => ({ id: `tile-${index}`, isDouble: index === 4 }))

describe('resolveDominoBoardPresentation', () => {
  it('conserva el modo lineal cuando se solicita explícitamente', () => {
    expect(resolveDominoBoardPresentation('linear', board, { width: 800, height: 600 })).toEqual({ kind: 'linear' })
  })

  it('activa serpentine solo con un trazado viable', () => {
    expect(resolveDominoBoardPresentation('serpentine', board, { width: 800, height: 700 }).kind).toBe('serpentine')
  })

  it('vuelve al modo lineal cuando no hay espacio suficiente', () => {
    expect(resolveDominoBoardPresentation('serpentine', board, { width: 180, height: 400 })).toEqual({ kind: 'linear' })
  })
})
