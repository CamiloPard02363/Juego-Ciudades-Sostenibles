import { describe, expect, it } from 'vitest'
import { buildJustCreatedRedirect, parseCreatedKind } from './justCreatedRedirect'

describe('buildJustCreatedRedirect (issue #2)', () => {
  it('manda a comunidad o a mis juegos según la visibilidad', () => {
    expect(buildJustCreatedRedirect('a1', 'community')).toBe('/comunidad?justCreated=a1')
    expect(buildJustCreatedRedirect('a1', 'private', 'DOMINO')).toBe('/mis-juegos?justCreated=a1&kind=DOMINO')
  })

  it('parseCreatedKind solo acepta tipos conocidos', () => {
    expect(parseCreatedKind('OPPOSITES')).toBe('OPPOSITES')
    expect(parseCreatedKind('MEMORY_MATCH')).toBeNull()
    expect(parseCreatedKind(null)).toBeNull()
  })
})
