import { describe, expect, it } from 'vitest'
import { pickCardCorner, tourCardBounds } from './tourSpotlightLayout'

const viewport = { width: 1280, height: 800 }
const card = tourCardBounds(viewport)

describe('pickCardCorner (issue #240)', () => {
  it('deja la tarjeta abajo a la derecha si no tapa el elemento iluminado', () => {
    expect(pickCardCorner({ top: 20, left: 20, width: 200, height: 40 }, card, viewport)).toBe('bottom-right')
    expect(pickCardCorner(null, card, viewport)).toBe('bottom-right')
  })

  it('se mueve a la izquierda si el elemento está abajo a la derecha', () => {
    expect(pickCardCorner({ top: 600, left: 1000, width: 200, height: 80 }, card, viewport)).toBe('bottom-left')
  })

  it('sube si el elemento ocupa todo el ancho de abajo', () => {
    expect(pickCardCorner({ top: 560, left: 0, width: 1280, height: 200 }, card, viewport)).toBe('top-right')
  })

  it('en pantallas donde todo choca, elige la esquina que menos tapa', () => {
    const phone = { width: 390, height: 844 }
    const phoneCard = tourCardBounds(phone)
    // Elemento en la mitad de abajo: la tarjeta debe ir arriba.
    expect(pickCardCorner({ top: 500, left: 0, width: 390, height: 300 }, phoneCard, phone, 12)).toMatch(/^top-/)
  })
})

describe('tourCardBounds', () => {
  it('respeta los topes de la tarjeta (360 px de ancho, 440 px o 55% del alto)', () => {
    expect(tourCardBounds({ width: 1280, height: 800 })).toEqual({ width: 360, height: 440 })
    expect(tourCardBounds({ width: 300, height: 600 })).toEqual({ width: 276, height: 330 })
  })
})
