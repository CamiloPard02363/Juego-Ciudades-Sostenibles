import { describe, expect, it } from 'vitest'
import { initialWelcomePhase, phaseAfterGreeting } from './welcomeTourSteps'

describe('initialWelcomePhase', () => {
  it('saluda al entrar al inicio, sea la cuenta nueva o antigua, si aún no ha saludado en esta sesión', () => {
    expect(initialWelcomePhase(true, false, false)).toBe('greeting')
    expect(initialWelcomePhase(true, true, false)).toBe('greeting')
  })

  it('no repite el saludo si ya saludó en esta sesión (navegación interna, no recarga)', () => {
    expect(initialWelcomePhase(true, true, true)).toBe('closed')
    expect(initialWelcomePhase(true, false, true)).toBe('invite')
  })

  it('no interrumpe enlaces fuera del inicio: solo queda la invitación de la primera vez', () => {
    expect(initialWelcomePhase(false, true, false)).toBe('closed')
    expect(initialWelcomePhase(false, false, false)).toBe('invite')
    expect(initialWelcomePhase(false, false, true)).toBe('invite')
  })
})

describe('phaseAfterGreeting', () => {
  it('quien ya hizo la guía vuelve directo al inicio', () => {
    expect(phaseAfterGreeting(true)).toBe('closed')
  })

  it('quien nunca la hizo sigue viendo la invitación obligatoria de siempre', () => {
    expect(phaseAfterGreeting(false)).toBe('invite')
  })
})
