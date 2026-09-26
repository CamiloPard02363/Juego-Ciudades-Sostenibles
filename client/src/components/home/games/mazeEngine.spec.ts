import { describe, expect, it } from 'vitest'
import {
  applyTeleport,
  bonusThresholds,
  buildLevelBoard,
  chooseGhostDirection,
  clampToOpenCell,
  comboPointsFor,
  computeGhostTarget,
  isOpen,
  manhattan,
  openDirections,
  stepWithTeleport,
} from './mazeEngine'
import type { MazeLayoutDef } from './mazeCollectorTypes'

/**
 * Laberinto de prueba en cruz, 7x7 — simple pero con al menos una
 * intersección real de 4 vías (el centro) para poder probar la regla de
 * "elige la vecina que minimiza distancia al objetivo".
 *
 *   1 1 1 1 1 1 1
 *   1 0 0 0 0 0 1
 *   1 0 1 0 1 0 1
 *   1 0 0 0 0 0 1
 *   1 0 1 0 1 0 1
 *   1 0 0 0 0 0 1
 *   1 1 1 1 1 1 1
 */
function crossGrid(): number[][] {
  return [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ]
}

function crossLayout(): MazeLayoutDef {
  const grid = crossGrid()
  return {
    cols: 7,
    rows: 7,
    grid,
    playerStart: { row: 3, col: 3 },
    enemySpawns: [
      { row: 1, col: 1 },
      { row: 1, col: 5 },
      { row: 5, col: 1 },
      { row: 5, col: 5 },
    ],
    itemSlots: [],
    tunnelRows: [],
  }
}

describe('isOpen / manhattan / openDirections', () => {
  const grid = crossGrid()

  it('trata las paredes y el borde fuera del grid como no transitables', () => {
    expect(isOpen(grid, 0, 0)).toBe(false)
    expect(isOpen(grid, -1, 3)).toBe(false)
    expect(isOpen(grid, 3, 99)).toBe(false)
    expect(isOpen(grid, 3, 3)).toBe(true)
  })

  it('calcula distancia Manhattan', () => {
    expect(manhattan({ row: 0, col: 0 }, { row: 3, col: 4 })).toBe(7)
  })

  it('en el centro de la cruz las 4 direcciones están abiertas', () => {
    expect(openDirections(grid, { row: 3, col: 3 }).sort()).toEqual(['DOWN', 'LEFT', 'RIGHT', 'UP'])
  })

  it('en una celda con pared a un lado, esa dirección no aparece', () => {
    // (1,1) tiene pared abajo-derecha en (2,2), pero abajo (2,1) y derecha (1,2) están abiertas
    expect(openDirections(grid, { row: 1, col: 1 }).sort()).toEqual(['DOWN', 'RIGHT'])
  })
})

describe('clampToOpenCell', () => {
  it('devuelve la misma celda si ya es transitable', () => {
    const grid = crossGrid()
    expect(clampToOpenCell(grid, { row: 3, col: 3 })).toEqual({ row: 3, col: 3 })
  })

  it('ajusta un punto fuera del grid a la celda abierta más cercana', () => {
    const grid = crossGrid()
    const result = clampToOpenCell(grid, { row: -5, col: 3 })
    expect(isOpen(grid, result.row, result.col)).toBe(true)
  })
})

describe('computeGhostTarget', () => {
  const grid = crossGrid()
  const ghost = { pos: { row: 1, col: 1 }, pivot: { row: 1, col: 1 } }

  it('CHASER (Smog Gris) apunta directo a la casilla del camión', () => {
    const player = { pos: { row: 5, col: 5 }, facing: 'RIGHT' as const }
    expect(computeGhostTarget('CHASER', grid, ghost, player)).toEqual({ row: 5, col: 5 })
  })

  it('AMBUSHER (Gas Tóxico) apunta 4 casillas por delante de hacia dónde va el camión', () => {
    const player = { pos: { row: 3, col: 3 }, facing: 'RIGHT' as const }
    const target = computeGhostTarget('AMBUSHER', grid, ghost, player)
    // 4 a la derecha de (3,3) cae fuera del grid (col 7) -> se ajusta a la celda abierta más cercana.
    expect(isOpen(grid, target.row, target.col)).toBe(true)
    expect(target.col).toBeGreaterThan(3)
  })

  it('PATROLLER (Polución Industrial) patrulla su pivote si el camión está lejos', () => {
    const player = { pos: { row: 5, col: 5 }, facing: 'UP' as const }
    expect(computeGhostTarget('PATROLLER', grid, ghost, player)).toEqual(ghost.pivot)
  })

  it('PATROLLER intercepta si el camión entra en su radio', () => {
    const player = { pos: { row: 1, col: 2 }, facing: 'UP' as const }
    expect(computeGhostTarget('PATROLLER', grid, ghost, player)).toEqual(player.pos)
  })

  it('RANDOM (Lluvia Ácida) no tiene objetivo fijo (se resuelve en chooseGhostDirection)', () => {
    const player = { pos: { row: 5, col: 5 }, facing: 'UP' as const }
    expect(computeGhostTarget('RANDOM', grid, ghost, player)).toEqual(ghost.pos)
  })
})

describe('chooseGhostDirection', () => {
  const grid = crossGrid()

  it('en un pasillo (una sola no-reversa) sigue de largo sin importar el objetivo', () => {
    // Desde (1,2) solo LEFT/RIGHT están abiertas; viniendo con facing RIGHT,
    // LEFT es la reversa, así que la única no-reversa es seguir de largo a RIGHT
    // aunque el objetivo esté lejísimos en la dirección contraria.
    const direction = chooseGhostDirection(grid, { row: 1, col: 2 }, 'RIGHT', { row: 6, col: 0 }, 'CHASER', false)
    expect(direction).toBe('RIGHT')
  })

  it('en una intersección elige la vecina que minimiza distancia al objetivo (persecución directa)', () => {
    // Centro (3,3), objetivo bien a la derecha -> debe elegir RIGHT, nunca la reversa (LEFT).
    const direction = chooseGhostDirection(grid, { row: 3, col: 3 }, 'DOWN', { row: 3, col: 6 }, 'CHASER', false)
    expect(direction).toBe('RIGHT')
  })

  it('nunca reversa si hay otra opción disponible', () => {
    const reverseChoices = Array.from({ length: 50 }, () =>
      chooseGhostDirection(grid, { row: 3, col: 3 }, 'RIGHT', { row: 3, col: 0 }, 'RANDOM', false, Math.random),
    )
    // El objetivo está a la izquierda, pero RANDOM no debería nunca elegir LEFT (reversa de RIGHT)
    // salvo que fuera la única salida — en el centro de la cruz hay 4 salidas.
    expect(reverseChoices.every((d) => d !== 'LEFT')).toBe(true)
  })

  it('si es callejón sin salida, sí reversa (única opción)', () => {
    const deadEndGrid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
    ]
    // (2,1) es la punta del callejón: su única vecina abierta es (1,1), que
    // es exactamente la reversa de "llegué moviéndome hacia abajo" — no hay
    // otra opción, así que debe reversar en vez de quedarse quieta.
    const direction = chooseGhostDirection(deadEndGrid, { row: 2, col: 1 }, 'DOWN', { row: 0, col: 0 }, 'CHASER', false)
    expect(direction).toBe('UP')
  })

  it('RANDOM ignora el objetivo y reparte entre todas las opciones no-reversa', () => {
    let seed = 0
    const fakeRandom = () => {
      seed += 1
      return seed % 2 === 0 ? 0.1 : 0.9
    }
    const first = chooseGhostDirection(grid, { row: 3, col: 3 }, 'DOWN', { row: 0, col: 0 }, 'RANDOM', false, fakeRandom)
    const second = chooseGhostDirection(grid, { row: 3, col: 3 }, 'DOWN', { row: 0, col: 0 }, 'RANDOM', false, fakeRandom)
    // facing DOWN -> la reversa es UP, así que las opciones son DOWN/LEFT/RIGHT.
    expect(['DOWN', 'LEFT', 'RIGHT']).toContain(first)
    expect(['DOWN', 'LEFT', 'RIGHT']).toContain(second)
  })

  it('una nube asustada se mueve al azar sin importar su personalidad', () => {
    let calls = 0
    const fakeRandom = () => {
      calls += 1
      return 0.99
    }
    chooseGhostDirection(grid, { row: 3, col: 3 }, 'DOWN', { row: 3, col: 6 }, 'CHASER', true, fakeRandom)
    expect(calls).toBeGreaterThan(0)
  })
})

describe('buildLevelBoard', () => {
  it('llena todas las calles libres (menos arranques/canecas/bolsas) con PET', () => {
    const layout = crossLayout()
    const board = buildLevelBoard(layout)

    const petCount = board.pickups.filter((p) => p.kind === 'PET').length
    const powerCount = board.pickups.filter((p) => p.kind === 'POWER').length
    const openCellCount = layout.grid.flat().filter((cell) => cell === 0).length

    expect(powerCount).toBe(4)
    expect(board.bags).toHaveLength(3)
    // playerStart + 4 enemySpawns + 4 power + 3 bags quedan reservados, el resto es PET.
    expect(petCount).toBe(openCellCount - 1 - 4 - 4 - 3)
  })

  it('nunca coloca una caneca de energía sobre el arranque del jugador o de una nube', () => {
    const layout = crossLayout()
    const board = buildLevelBoard(layout)
    const reserved = [layout.playerStart, ...layout.enemySpawns]

    for (const power of board.pickups.filter((p) => p.kind === 'POWER')) {
      expect(reserved.some((cell) => cell.row === power.pos.row && cell.col === power.pos.col)).toBe(false)
    }
  })

  it('el punto de aparición del E-Waste es una celda transitable cerca del centro', () => {
    const layout = crossLayout()
    const board = buildLevelBoard(layout)
    expect(isOpen(layout.grid, board.bonusSpawnPoint.row, board.bonusSpawnPoint.col)).toBe(true)
  })
})

describe('túnel de teletransporte', () => {
  const layout = { ...crossLayout(), tunnelRows: [3] }

  it('sin filas de túnel, salirse del mapa no envuelve', () => {
    const noTunnel = { ...layout, tunnelRows: [] }
    expect(applyTeleport(noTunnel, { row: 3, col: -1 })).toEqual({ row: 3, col: -1 })
  })

  it('salir por la izquierda en una fila de túnel envuelve al extremo derecho', () => {
    expect(applyTeleport(layout, { row: 3, col: -1 })).toEqual({ row: 3, col: 6 })
  })

  it('salir por la derecha en una fila de túnel envuelve al extremo izquierdo', () => {
    expect(applyTeleport(layout, { row: 3, col: 7 })).toEqual({ row: 3, col: 0 })
  })

  it('salirse del mapa en una fila que NO es de túnel no envuelve', () => {
    expect(applyTeleport(layout, { row: 1, col: -1 })).toEqual({ row: 1, col: -1 })
  })

  it('un layout puede tener varias filas de túnel a la vez (ej. varias avenidas)', () => {
    const multiTunnel = { ...layout, tunnelRows: [1, 3, 5] }
    expect(applyTeleport(multiTunnel, { row: 1, col: -1 })).toEqual({ row: 1, col: 6 })
    expect(applyTeleport(multiTunnel, { row: 5, col: 7 })).toEqual({ row: 5, col: 0 })
  })

  it('stepWithTeleport combina el paso y el envoltorio en una sola llamada', () => {
    expect(stepWithTeleport({ row: 3, col: 0 }, 'LEFT', 7, [3])).toEqual({ row: 3, col: 6 })
    expect(stepWithTeleport({ row: 3, col: 0 }, 'UP', 7, [3])).toEqual({ row: 2, col: 0 })
  })

  it('openDirections reconoce el túnel como una salida válida en los extremos', () => {
    // Grid dedicado con la fila de túnel abierta HASTA el borde (así se ve
    // de verdad una vez que carveTunnels la talla) — la cruz de arriba no
    // sirve para esto porque sus columnas de borde son pared.
    const tunnelGrid = [
      [1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    expect(openDirections(tunnelGrid, { row: 1, col: 0 }, [1])).toContain('LEFT')
    expect(openDirections(tunnelGrid, { row: 1, col: 4 }, [1])).toContain('RIGHT')
  })
})

describe('bonusThresholds', () => {
  it('con 1 objeto configurado, aparece una sola vez al 30%', () => {
    expect(bonusThresholds(1)).toEqual([0.3])
  })

  it('con varios objetos, se reparte cada 30% sin pasar de 100%', () => {
    expect(bonusThresholds(4)).toEqual([0.3, 0.6, 0.9])
  })
})

describe('comboPointsFor', () => {
  it('sigue la escalera 200/400/800/1600', () => {
    expect(comboPointsFor(0)).toBe(200)
    expect(comboPointsFor(1)).toBe(400)
    expect(comboPointsFor(2)).toBe(800)
    expect(comboPointsFor(3)).toBe(1600)
  })

  it('a partir de la 5ª nube en la misma racha, se mantiene en 1600', () => {
    expect(comboPointsFor(4)).toBe(1600)
    expect(comboPointsFor(10)).toBe(1600)
  })
})
