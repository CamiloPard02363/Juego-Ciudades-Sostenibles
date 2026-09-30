import { describe, expect, it } from 'vitest'
import { Password } from './password.vo.js'
import { InvalidPasswordError } from '../errors/user.errors.js'

describe('Password', () => {
  it('fromHash reconstruye el VO a partir de un hash no vacío', () => {
    const password = Password.fromHash('hash-123')
    expect(password.hasPassword()).toBe(true)
    expect(password.getHashedValue()).toBe('hash-123')
  })

  it('fromHash lanza si el hash viene vacío', () => {
    expect(() => Password.fromHash('')).toThrow(InvalidPasswordError)
  })

  it('none() representa un usuario sin contraseña local (issue #197)', () => {
    const password = Password.none()
    expect(password.hasPassword()).toBe(false)
  })

  it('none().getHashedValue() lanza — quien compare debe chequear hasPassword() primero', () => {
    const password = Password.none()
    expect(() => password.getHashedValue()).toThrow(InvalidPasswordError)
  })
})
