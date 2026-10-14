import { describe, expect, it } from 'vitest'
import { connectorPoints } from './DominoChainConnector'
import { BOARD_TILE_CONTENT, boardTileContentPresentation, boardTilePresentation } from './DominoRoomPage'

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

  it.each([
    'Energía Eólica',
    'Movilidad Eléctrica',
    'Purificación de Agua',
    'Paneles Solares',
    'Zonas Verdes',
    'Reciclaje',
  ])('reserva hasta tres líneas compactas para %s en todas las orientaciones', (label) => {
    for (const orientation of ['horizontal', 'vertical', 'double-horizontal', 'double-vertical'] as const) {
      const content = boardTileContentPresentation(orientation)
      const estimatedCharactersPerLine = Math.floor(content.contentWidth / (BOARD_TILE_CONTENT.textFont * 0.52))
      const estimatedLines = Math.ceil(label.length / estimatedCharactersPerLine)
      expect(content.maxLines).toBeGreaterThanOrEqual(estimatedLines)
      expect(content.contentHeight).toBeGreaterThanOrEqual(
        BOARD_TILE_CONTENT.icon + BOARD_TILE_CONTENT.gap + estimatedLines * BOARD_TILE_CONTENT.textLineHeight,
      )
    }
  })

  it('serializa conectores rectos y de giro usando exactamente sus coordenadas', () => {
    expect(connectorPoints([{ x: 2, y: 3 }, { x: 8, y: 3 }])).toBe('2,3 8,3')
    expect(connectorPoints([{ x: 8, y: 3 }, { x: 12, y: 3 }, { x: 12, y: 18 }, { x: 8, y: 18 }])).toBe('8,3 12,3 12,18 8,18')
  })
})
