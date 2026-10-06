import { describe, expect, it } from 'vitest'
import { summarizeCreatedGame, type CreatedGameKind } from './createdGameSummary'

const EXPECTED: Record<CreatedGameKind, { typeLabel: string; isMultiplayer: boolean }> = {
  PAIRS: { typeLabel: 'Pares', isMultiplayer: false },
  OPPOSITES: { typeLabel: 'Conceptos opuestos', isMultiplayer: false },
  GUESS_WHO: { typeLabel: '¿Quién Es?', isMultiplayer: true },
  DOMINO: { typeLabel: 'Dominó', isMultiplayer: true },
  MAZE_COLLECTOR: { typeLabel: 'Recolector de laberinto', isMultiplayer: false },
  SNAKES_LADDERS: { typeLabel: 'Escaleras y Serpientes', isMultiplayer: true },
  DUAL_QUEST: { typeLabel: 'Dúo Lógico', isMultiplayer: true },
}

describe('summarizeCreatedGame (issue #245)', () => {
  for (const [kind, expected] of Object.entries(EXPECTED) as [CreatedGameKind, (typeof EXPECTED)[CreatedGameKind]][]) {
    it(`${kind}: tipo, modo y frases cortas`, () => {
      const summary = summarizeCreatedGame(kind)
      expect(summary.typeLabel).toBe(expected.typeLabel)
      expect(summary.isMultiplayer).toBe(expected.isMultiplayer)
      expect(summary.purpose.length).toBeGreaterThan(0)
      expect(summary.purpose.length).toBeLessThanOrEqual(140)
      expect(summary.howTo.length).toBeGreaterThan(0)
      expect(summary.howTo.length).toBeLessThanOrEqual(140)
    })
  }
})
