import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MemoryMatchPair } from './memoryMatchTypes'
import type { Difficulty } from './PlayOptionsPopup'
import { DIFFICULTIES } from './PlayOptionsPopup'
import { celebrateMatch, signalMismatch } from '../../../utils/gameFeedback'

export type CardData = {
  cardId: string
  pairId: string
  title: string
  description: string
  imageUrl: string | null
  badge: 'positive' | 'negative' | null
}

type ZoneConfig = {
  level: number
  cards: CardData[]
}

type GamePhase = 'preview' | 'playing' | 'zone-cleared' | 'time-up' | 'finished'

export type UseMemoryMatchGameOptions = {
  pairs: MemoryMatchPair[]
  pairCount: number
  difficulty: Difficulty
  showPreview: boolean
  perZone: number
  baseTimePerZoneSeconds: number
  previewSeconds: number
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function cardsForPair(pair: MemoryMatchPair): CardData[] {
  if (pair.mode === 'PAIRS') {
    return [
      {
        cardId: `${pair.pairId}-img`,
        pairId: pair.pairId,
        title: '',
        description: '',
        imageUrl: pair.imageUrl,
        badge: null,
      },
      {
        cardId: `${pair.pairId}-label`,
        pairId: pair.pairId,
        title: pair.label,
        description: '',
        imageUrl: null,
        badge: null,
      },
    ]
  }

  return [
    {
      cardId: `${pair.pairId}-pos`,
      pairId: pair.pairId,
      title: pair.posTitle,
      description: pair.posDescription,
      imageUrl: pair.posImageUrl,
      badge: 'positive',
    },
    {
      cardId: `${pair.pairId}-neg`,
      pairId: pair.pairId,
      title: pair.negTitle,
      description: pair.negDescription,
      imageUrl: pair.negImageUrl,
      badge: 'negative',
    },
  ]
}

function buildZones(pairs: MemoryMatchPair[], pairCount: number, perZone: number): ZoneConfig[] {
  const chosen = shuffle(pairs).slice(0, pairCount)
  const zones: ZoneConfig[] = []

  for (let i = 0; i < chosen.length; i += perZone) {
    const slice = chosen.slice(i, i + perZone)
    const cards: CardData[] = slice.flatMap(cardsForPair)
    zones.push({ level: zones.length + 1, cards: shuffle(cards) })
  }

  return zones
}

/** Portado de la lógica de juego del index.html original, parametrizado por contenido real. */
export function useMemoryMatchGame(options: UseMemoryMatchGameOptions) {
  const { pairs, pairCount, difficulty, showPreview, perZone, baseTimePerZoneSeconds, previewSeconds } =
    options

  const timeMultiplier = DIFFICULTIES.find((d) => d.id === difficulty)?.timeMultiplier ?? 1
  const timePerZone = Math.max(15, Math.round(baseTimePerZoneSeconds * timeMultiplier))

  const zones = useMemo(
    () => buildZones(pairs, pairCount, perZone),
    // Solo se recalcula al montar (nueva partida), no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [zoneIndex, setZoneIndex] = useState(0)
  const [flippedIds, setFlippedIds] = useState<string[]>([])
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([])
  const [shakingIds, setShakingIds] = useState<string[]>([])
  const [totalScore, setTotalScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timePerZone)
  const [phase, setPhase] = useState<GamePhase>(showPreview && previewSeconds > 0 ? 'preview' : 'playing')
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(previewSeconds)
  const lockRef = useRef(false)

  const currentZone = zones[zoneIndex]
  const totalPairsInZone = currentZone ? currentZone.cards.length / 2 : 0
  const matchedInZone = matchedPairIds.length

  // Vista previa: muestra todas las cartas boca arriba unos segundos.
  useEffect(() => {
    if (phase !== 'preview') return
    if (previewSecondsLeft <= 0) {
      setPhase('playing')
      return
    }
    const timeout = setTimeout(() => setPreviewSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, previewSecondsLeft])

  // Timer de la zona activa.
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      setPhase('time-up')
      return
    }
    const timeout = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, timeLeft])

  const flipCard = useCallback(
    (cardId: string) => {
      if (phase !== 'playing' || lockRef.current) return
      if (flippedIds.includes(cardId) || flippedIds.length === 2) return

      const card = currentZone?.cards.find((c) => c.cardId === cardId)
      if (!card || matchedPairIds.includes(card.pairId)) return

      const nextFlipped = [...flippedIds, cardId]
      setFlippedIds(nextFlipped)

      if (nextFlipped.length === 2) {
        lockRef.current = true
        const [firstId, secondId] = nextFlipped
        const first = currentZone?.cards.find((c) => c.cardId === firstId)
        const second = currentZone?.cards.find((c) => c.cardId === secondId)

        setTimeout(() => {
          if (first && second && first.pairId === second.pairId) {
            const nextCombo = combo + 1
            const multiplier = nextCombo >= 4 ? 1.5 : nextCombo >= 2 ? 1.2 : 1
            const points = Math.round((100 + timeLeft * 4) * multiplier)

            celebrateMatch()
            setMatchedPairIds((current) => [...current, first.pairId])
            setCombo(nextCombo)
            setTotalScore((score) => score + points)
            setFlippedIds([])
            lockRef.current = false
          } else {
            signalMismatch()
            setShakingIds([firstId, secondId])
            setCombo(0)
            setTotalScore((score) => Math.max(0, score - 10))
            setTimeout(() => {
              setShakingIds([])
              setFlippedIds([])
              lockRef.current = false
            }, 700)
          }
        }, 550)
      }
    },
    [phase, flippedIds, currentZone, matchedPairIds, combo, timeLeft],
  )

  // Zona completada.
  useEffect(() => {
    if (phase === 'playing' && totalPairsInZone > 0 && matchedInZone === totalPairsInZone) {
      setPhase('zone-cleared')
    }
  }, [phase, matchedInZone, totalPairsInZone])

  const advanceZone = useCallback(() => {
    const nextIndex = zoneIndex + 1
    if (nextIndex >= zones.length) {
      setPhase('finished')
      return
    }
    setZoneIndex(nextIndex)
    setMatchedPairIds([])
    setFlippedIds([])
    setShakingIds([])
    setCombo(0)
    setTimeLeft(timePerZone)
    setPreviewSecondsLeft(previewSeconds)
    setPhase(showPreview && previewSeconds > 0 ? 'preview' : 'playing')
  }, [zoneIndex, zones.length, timePerZone, previewSeconds, showPreview])

  const retryZone = useCallback(() => {
    setMatchedPairIds([])
    setFlippedIds([])
    setShakingIds([])
    setCombo(0)
    setTimeLeft(timePerZone)
    setPreviewSecondsLeft(previewSeconds)
    setPhase(showPreview && previewSeconds > 0 ? 'preview' : 'playing')
  }, [timePerZone, previewSeconds, showPreview])

  return {
    zones,
    zoneIndex,
    currentZone,
    phase,
    flippedIds,
    matchedPairIds,
    shakingIds,
    totalScore,
    combo,
    timeLeft,
    previewSecondsLeft,
    totalPairsInZone,
    matchedInZone,
    flipCard,
    advanceZone,
    retryZone,
  }
}
