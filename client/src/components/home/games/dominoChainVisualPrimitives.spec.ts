import { describe, expect, it } from 'vitest'
import { connectorPoints } from './DominoChainConnector'
import { boardTilePresentation } from './DominoRoomPage'

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

  it('serializa conectores rectos y de giro usando exactamente sus coordenadas', () => {
    expect(connectorPoints([{ x: 2, y: 3 }, { x: 8, y: 3 }])).toBe('2,3 8,3')
    expect(connectorPoints([{ x: 8, y: 3 }, { x: 12, y: 3 }, { x: 12, y: 18 }, { x: 8, y: 18 }])).toBe('8,3 12,3 12,18 8,18')
  })
})
