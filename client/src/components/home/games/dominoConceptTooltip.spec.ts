import { describe, expect, it } from 'vitest'
import { resolveDominoTooltipPlacement } from './dominoConceptTooltip'

const viewport = { width: 420, height: 280 }
const tooltip = { width: 180, height: 54 }

describe('posicionamiento del tooltip de Dominexo', () => {
  it('mantiene el tooltip dentro de los bordes horizontales del viewport', () => {
    const placement = resolveDominoTooltipPlacement(
      { left: 2, top: 100, right: 30, bottom: 128, width: 28, height: 28 },
      tooltip,
      viewport,
    )

    expect(placement.left).toBeGreaterThanOrEqual(12)
    expect(placement.left + tooltip.width).toBeLessThanOrEqual(viewport.width - 12)
  })

  it('muestra el tooltip arriba si no cabe debajo del icono', () => {
    const placement = resolveDominoTooltipPlacement(
      { left: 180, top: 234, right: 208, bottom: 262, width: 28, height: 28 },
      tooltip,
      viewport,
    )

    expect(placement.side).toBe('top')
    expect(placement.top + tooltip.height).toBeLessThanOrEqual(234 - 10)
  })

  it('muestra el tooltip abajo cerca del borde superior', () => {
    const placement = resolveDominoTooltipPlacement(
      { left: 180, top: 12, right: 208, bottom: 40, width: 28, height: 28 },
      tooltip,
      viewport,
    )

    expect(placement.side).toBe('bottom')
    expect(placement.top).toBeGreaterThanOrEqual(50)
  })
})
