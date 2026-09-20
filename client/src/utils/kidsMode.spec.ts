import { describe, expect, it, vi, afterEach } from 'vitest'
import { calculateAge, isKidsMode } from './kidsMode'

describe('calculateAge', () => {
  afterEach(() => vi.useRealTimers())

  it('devuelve null sin fecha de nacimiento', () => {
    expect(calculateAge(null)).toBeNull()
  })

  it('calcula la edad exacta el día del cumpleaños', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(calculateAge('2016-06-15')).toBe(10)
  })

  it('todavía no suma el año un día antes del cumpleaños', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14'))
    expect(calculateAge('2016-06-15')).toBe(9)
  })

  it('ya suma el año un día después del cumpleaños', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-16'))
    expect(calculateAge('2016-06-15')).toBe(10)
  })
})

describe('isKidsMode', () => {
  afterEach(() => vi.useRealTimers())

  it('nunca es Kids Mode para roles distintos de STUDENT', () => {
    expect(isKidsMode({ role: 'TEACHER', birthDate: '2020-01-01' })).toBe(false)
    expect(isKidsMode({ role: 'ADMIN', birthDate: '2020-01-01' })).toBe(false)
  })

  it('STUDENT sin fecha de nacimiento no es Kids Mode (se trata como adulto)', () => {
    expect(isKidsMode({ role: 'STUDENT', birthDate: null })).toBe(false)
  })

  it('STUDENT menor de 10 años es Kids Mode', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(isKidsMode({ role: 'STUDENT', birthDate: '2020-01-01' })).toBe(true)
  })

  it('STUDENT de 10 años o más ya no es Kids Mode', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(isKidsMode({ role: 'STUDENT', birthDate: '2016-01-01' })).toBe(false)
  })

  it('acepta user null/undefined (no lanza)', () => {
    expect(isKidsMode(null)).toBe(false)
    expect(isKidsMode(undefined)).toBe(false)
  })
})
