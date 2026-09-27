import { describe, expect, it } from 'vitest'
import { initialWelcomePhase, phaseAfterGreeting } from './welcomeTourSteps'

describe('initialWelcomePhase', () => {
  it('siempre saluda al entrar al inicio, sea la cuenta nueva o antigua', () => {
    expect(initialWelcomePhase(true, false)).toBe('greeting')
    expect(initialWelcomePhase(true, true)).toBe('greeting')
  })

  it('no interrumpe enlaces fuera del inicio: solo queda la invitación de la primera vez', () => {
    expect(initialWelcomePhase(false, true)).toBe('closed')
    expect(initialWelcomePhase(false, false)).toBe('invite')
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
