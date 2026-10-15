import { describe, expect, it } from 'vitest'
import { playTargetFor } from './gamePlayRoute'

const game = (gameType: string) => ({ id: 'abc123', slug: 'mi-juego', gameType })

describe('playTargetFor', () => {
  it.each([
    ['DOMINO', '/domino/sala?gameId=abc123'],
    ['MAZE_COLLECTOR', '/jugar/laberinto/mi-juego'],
    ['TRUE_FALSE_MAZE', '/jugar/laberinto-vf/mi-juego'],
    ['SNAKES_LADDERS', '/escaleras-serpientes/sala?gameId=abc123'],
    ['DUAL_QUEST', '/dual-quest/sala?gameId=abc123'],
    ['DUAL_QUEST_PIXI', '/dual-quest-pixi/mi-juego'],
    ['MEMORY_MATCH', '/jugar/memoria/mi-juego'],
  ])('%s se abre en %s', (gameType, path) => {
    expect(playTargetFor(game(gameType))).toEqual({ kind: 'navigate', path })
  })

  it('¿Quién Es? se abre como sala en vivo', () => {
    expect(playTargetFor(game('GUESS_WHO'))).toEqual({ kind: 'guess-who-room' })
  })

  it('el Laberinto Verdadero o Falso NUNCA se abre como Memoria', () => {
    const target = playTargetFor(game('TRUE_FALSE_MAZE'))
    expect(target.kind === 'navigate' && target.path).not.toContain('/jugar/memoria/')
  })

  it.each(['JUEGO_NUEVO', '', 'memory_match'])('un tipo desconocido (%j) no cae en Memoria: se marca como no soportado', (gameType) => {
    expect(playTargetFor(game(gameType))).toEqual({ kind: 'unsupported' })
  })

  it('escapa el slug y el id en la URL', () => {
    expect(playTargetFor({ id: 'a b', slug: 'x/y', gameType: 'TRUE_FALSE_MAZE' })).toEqual({
      kind: 'navigate',
      path: '/jugar/laberinto-vf/x%2Fy',
    })
    expect(playTargetFor({ id: 'a b', slug: 'x', gameType: 'DOMINO' })).toEqual({
      kind: 'navigate',
      path: '/domino/sala?gameId=a%20b',
    })
  })
})
