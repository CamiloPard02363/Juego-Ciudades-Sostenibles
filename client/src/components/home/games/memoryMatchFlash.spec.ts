import { describe, expect, it } from 'vitest'
import { matchFlashText } from './memoryMatchFlashText'
import type { CardData } from './useMemoryMatchGame'

const card = (over: Partial<CardData>): CardData => ({
  cardId: 'c', pairId: 'p', title: '', description: '', imageUrl: null, badge: null, ...over,
})

describe('matchFlashText', () => {
  it('en Parejas nombra el concepto', () => {
    expect(matchFlashText(card({ imageUrl: 'x.png' }), card({ title: 'Perro' }))).toEqual({ headline: '¡Pareja!', detail: '¡Es Perro!' })
  })

  it('en Opuestos muestra los dos conceptos, el positivo primero', () => {
    const neg = card({ title: 'Contaminar', badge: 'negative' })
    const pos = card({ title: 'Reciclar', badge: 'positive' })
    expect(matchFlashText(neg, pos)).toEqual({ headline: '¡Opuestos!', detail: 'Reciclar ↔ Contaminar' })
  })
})
