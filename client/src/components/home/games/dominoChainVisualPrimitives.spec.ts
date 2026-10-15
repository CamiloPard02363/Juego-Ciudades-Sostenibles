import { describe, expect, it } from 'vitest'
import { connectorPoints } from './DominoChainConnector'
import { demoTileHalfPresentation } from './DominoVisualDemo'
import {
  BOARD_TILE_CONTENT,
  boardConceptAccessibility,
  boardTileContentPresentation,
  boardTilePresentation,
  dominoConceptHalfPresentation,
} from './DominoRoomPage'

describe('primitivas visuales de cadena Dominexo', () => {
  it('mantiene horizontal como orientación predeterminada de una ficha normal', () => {
    expect(boardTilePresentation(false)).toMatchObject({ orientation: 'horizontal', width: 136, height: 68, axis: 'row' })
  })

  it('representa fichas normales verticales sin rotar su contenido', () => {
    expect(boardTilePresentation(false, 'vertical')).toMatchObject({ orientation: 'vertical', width: 68, height: 136, axis: 'column' })
  })

  it('conserva el formato vertical predeterminado de una doble y admite la variante horizontal', () => {
    expect(boardTilePresentation(true)).toMatchObject({ orientation: 'double-vertical', width: 68, height: 124, axis: 'column' })
    expect(boardTilePresentation(true, 'double-horizontal')).toMatchObject({ orientation: 'double-horizontal', width: 124, height: 68, axis: 'row' })
  })

  it('reserva espacio para el ícono protagonista en todas las orientaciones del tablero', () => {
    for (const orientation of ['horizontal', 'vertical', 'double-horizontal', 'double-vertical'] as const) {
      const content = boardTileContentPresentation(orientation)
      expect(content.iconFits).toBe(true)
      expect(content.contentWidth).toBeGreaterThanOrEqual(BOARD_TILE_CONTENT.icon)
      expect(content.contentHeight).toBeGreaterThanOrEqual(BOARD_TILE_CONTENT.icon)
    }
  })

  it('mantiene texto e ícono en mano, pero presenta solo ícono accesible en tablero', () => {
    expect(dominoConceptHalfPresentation('lg')).toMatchObject({ showLabel: true, iconSize: 'h-8 w-8' })
    expect(dominoConceptHalfPresentation('board')).toMatchObject({ showLabel: false, iconSize: 'h-7 w-7 shrink-0' })
    expect(boardConceptAccessibility('Purificación de Agua')).toEqual({
      ariaLabel: 'Concepto: Purificación de Agua',
    })
  })

  it('mantiene la misma diferencia de contexto en el tutorial', () => {
    expect(demoTileHalfPresentation('hand', 'A')).toMatchObject({ showLabel: true, ariaLabel: 'Concepto A' })
    expect(demoTileHalfPresentation('board', 'A')).toMatchObject({ showLabel: false, ariaLabel: 'Concepto A' })
  })

  it('serializa conectores rectos y de giro usando exactamente sus coordenadas', () => {
    expect(connectorPoints([{ x: 2, y: 3 }, { x: 8, y: 3 }])).toBe('2,3 8,3')
    expect(connectorPoints([{ x: 8, y: 3 }, { x: 12, y: 3 }, { x: 12, y: 18 }, { x: 8, y: 18 }])).toBe('8,3 12,3 12,18 8,18')
  })
})
