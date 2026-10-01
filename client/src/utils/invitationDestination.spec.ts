import { describe, expect, it } from 'vitest'
import {
  invitationAuthPath,
  invitationDestination,
} from './invitationDestination'

describe('destino de invitación al autenticar', () => {
  it.each([
    'quien-es/sala',
    'quien-es/torneo',
    'domino/sala',
    'escaleras-serpientes/sala',
    'dual-quest/sala',
  ])('conserva %s y normaliza el código', (route) => {
    expect(invitationDestination(`/${route}/abc234`)).toBe(`/${route}/ABC234`)
    const login = invitationAuthPath('/login', `/${route}/ABC234`)
    const target = new URL(login, 'https://example.test').searchParams.get(
      'returnTo',
    )
    expect(invitationDestination(target)).toBe(`/${route}/ABC234`)
    expect(invitationAuthPath('/register', target)).toContain('returnTo=')
  })
  it('conserva códigos genéricos sin parámetros ajenos', () => {
    expect(invitationDestination('/?sala=abc234&otra=cosa')).toBe(
      '/?sala=ABC234',
    )
    expect(
      invitationDestination('/domino/sala/ABC234?gameId=no-crear#fragment'),
    ).toBe('/domino/sala/ABC234')
  })
  it.each([
    null,
    '',
    '/',
    '/login',
    '/register',
    '/juegos/crear',
    '/domino/sala?gameId=123',
    '/?sala=bad',
    'https://evil.test/domino/sala/ABC234',
    '//evil.test/domino/sala/ABC234',
    '/\\evil.test',
    '/domino/sala/%2f%2fevil',
    '/domino/sala/ABC234\n',
    'javascript:alert(1)',
  ])('no redirige a destinos ajenos: %s', (value) => {
    expect(invitationDestination(value)).toBeNull()
    expect(invitationAuthPath('/login', value)).toBe('/login')
  })
})
