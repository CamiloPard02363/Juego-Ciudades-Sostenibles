import { describe, expect, it } from 'vitest'
import { MAX_DOMINO_CONCEPTS, MIN_DOMINO_CONCEPTS } from './dominoTypes'
import {
  DOMINO_TILE_CATEGORY_COLORS,
  DOMINO_TILE_SUGGESTED_COLORS,
  DOMINO_TILE_VISUAL_TOKENS,
  dominoTileCategoryInk,
  dominoTileContrast,
} from './dominoTileVisualTokens'

describe('tokens visuales de fichas Dominexo', () => {
  it('ofrece diez tonos sugeridos suaves y distintos sin cambiar el rango de conceptos', () => {
    expect(DOMINO_TILE_CATEGORY_COLORS).toHaveLength(10)
    expect(DOMINO_TILE_SUGGESTED_COLORS).toHaveLength(10)
    expect(new Set(DOMINO_TILE_SUGGESTED_COLORS)).toHaveLength(10)
    expect(MIN_DOMINO_CONCEPTS).toBe(6)
    expect(MAX_DOMINO_CONCEPTS).toBe(10)
  })

  it('prioriza una base viva y diferenciable para las seis categorias iniciales', () => {
    expect(DOMINO_TILE_CATEGORY_COLORS.slice(0, 6).map(({ soft }) => soft)).toEqual([
      '#22a95a', '#18a8e0', '#3d7bff', '#8b5cf6', '#e3a008', '#14b89a',
    ])
  })

  it('mantiene contraste AA para texto sobre la superficie neutra', () => {
    expect(dominoTileContrast(DOMINO_TILE_VISUAL_TOKENS.textPrimary, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(4.5)
    expect(dominoTileContrast(DOMINO_TILE_VISUAL_TOKENS.textSecondary, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('usa tintas de categoria contrastadas para iconos esenciales', () => {
    for (const category of DOMINO_TILE_CATEGORY_COLORS) {
      expect(dominoTileContrast(category.ink, DOMINO_TILE_VISUAL_TOKENS.surface), category.name).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('mantiene contrastes de estado para foco y ficha jugable', () => {
    expect(dominoTileContrast(DOMINO_TILE_VISUAL_TOKENS.focus, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(3)
    expect(dominoTileContrast(DOMINO_TILE_VISUAL_TOKENS.playable, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(3)
  })

  it('presenta colores personalizados con una tinta AA sin cambiar su valor persistido', () => {
    const storedColor = '#f7d34c'
    const visibleInk = dominoTileCategoryInk(storedColor)

    expect(storedColor).toBe('#f7d34c')
    expect(dominoTileContrast(visibleInk, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('da una salida viva y diferenciable a los colores de una edicion existente', () => {
    const storedColors = ['#22c55e', '#14b8a6', '#3b82f6', '#06b6d4']
    const renderedInks = storedColors.map(dominoTileCategoryInk)

    expect(new Set(renderedInks)).toHaveLength(storedColors.length)
    expect(renderedInks).not.toEqual(storedColors)
    for (const ink of renderedInks) {
      expect(dominoTileContrast(ink, DOMINO_TILE_VISUAL_TOKENS.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
