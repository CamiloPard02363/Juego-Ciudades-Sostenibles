import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MemoryMatchPair } from './memoryMatchTypes'
import type { Difficulty } from './PlayOptionsPopup'
import { DIFFICULTIES } from './PlayOptionsPopup'
import { zonePairSizes } from './memoryMatchLayout'
import { celebrateMatch, primeGameFeedback, signalMismatch } from '../../../utils/gameFeedback'

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

/** Última pareja acertada: alimenta el destello visual que explica el acierto. */
export type LastMatch = { key: number; first: CardData; second: CardData; streak: number }

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

  // Zonas parejas entre sí y de máximo 6 parejas, para que quepan sin scroll.
  let start = 0
  for (const size of zonePairSizes(chosen.length, perZone)) {
    const slice = chosen.slice(start, start + size)
    start += size
    zones.push({ level: zones.length + 1, cards: shuffle(slice.flatMap(cardsForPair)) })
  }

  return zones
}

/** Portado de la lógica de juego del index.html original, parametrizado por contenido real. */
export function useMemoryMatchGame(options: UseMemoryMatchGameOptions) {
  const { pairs, pairCount, difficulty, showPreview, perZone, baseTimePerZoneSeconds } = options

  const difficultyConfig = DIFFICULTIES.find((d) => d.id === difficulty)
  const timeMultiplier = difficultyConfig?.timeMultiplier ?? 1
  // La vista previa la fija la dificultad (Relajado 30 s, Normal 15 s,
  // Desafiante 7 s), no el juego: antes siempre eran los 5 s guardados.
  const previewSeconds = difficultyConfig?.previewSeconds ?? options.previewSeconds
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
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null)
  const [bestStreak, setBestStreak] = useState(0)
  // En Opuestos, cada acierto pausa el reloj hasta que se cierra la explicación
  // (los conceptos merecen leerse). Los puntos ya se sumaron al acertar.
  const [pausedForInfo, setPausedForInfo] = useState(false)
  const lockRef = useRef(false)

  // Tracking para métricas (issue #226): aciertos/errores de toda la
  // partida (no solo de la zona activa, que se resetea en `advanceZone`) y
  // tiempo total jugado desde que se montó el hook. `startedAtRef` no usa
  // estado porque no necesita re-render — solo se lee al terminar.
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const startedAtRef = useRef(Date.now())

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
    if (phase !== 'playing' || pausedForInfo) return
    if (timeLeft <= 0) {
      setPhase('time-up')
      return
    }
    const timeout = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timeout)
  }, [phase, timeLeft, pausedForInfo])

  const flipCard = useCallback(
    (cardId: string) => {
      if (phase !== 'playing' || pausedForInfo || lockRef.current) return
      if (flippedIds.includes(cardId) || flippedIds.length === 2) return

      // Se llama dentro del clic (gesto real del usuario) para que el
      // AudioContext ya esté listo cuando, ~550ms después, se resuelva el
      // acierto o fallo y toque reproducir el sonido.
      primeGameFeedback()

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

            celebrateMatch(nextCombo)
            setLastMatch({ key: Date.now(), first, second, streak: nextCombo })
            setBestStreak((best) => Math.max(best, nextCombo))
            if (first.badge !== null) setPausedForInfo(true)
            setMatchedPairIds((current) => [...current, first.pairId])
            setCombo(nextCombo)
            setTotalScore((score) => score + points)
            setCorrectCount((count) => count + 1)
            setFlippedIds([])
            lockRef.current = false
          } else {
            signalMismatch()
            setShakingIds([firstId, secondId])
            setCombo(0)
            setTotalScore((score) => Math.max(0, score - 10))
            setIncorrectCount((count) => count + 1)
            setTimeout(() => {
              setShakingIds([])
              setFlippedIds([])
              lockRef.current = false
            }, 700)
          }
        }, 550)
      }
    },
    [phase, pausedForInfo, flippedIds, currentZone, matchedPairIds, combo, timeLeft],
  )

  // Zona completada.
  useEffect(() => {
    // Espera a que se cierre la explicación del último acierto antes de cerrar la zona.
    if (phase === 'playing' && !pausedForInfo && totalPairsInZone > 0 && matchedInZone === totalPairsInZone) {
      setPhase('zone-cleared')
    }
  }, [phase, pausedForInfo, matchedInZone, totalPairsInZone])

  const resumeAfterInfo = useCallback(() => setPausedForInfo(false), [])

  /** Termina la vista previa antes de tiempo (con 30 s en Relajado, no obligar a esperar). */
  const skipPreview = useCallback(() => {
    setPhase((current) => (current === 'preview' ? 'playing' : current))
  }, [])

  const advanceZone = useCallback(() => {
    const nextIndex = zoneIndex + 1
    if (nextIndex >= zones.length) {
      setPhase('finished')
      return
    }
    setZoneIndex(nextIndex)
    setMatchedPairIds([])
    setFlippedIds([])
    setPausedForInfo(false)
    setShakingIds([])
    setCombo(0)
    setTimeLeft(timePerZone)
    setPreviewSecondsLeft(previewSeconds)
    setPhase(showPreview && previewSeconds > 0 ? 'preview' : 'playing')
  }, [zoneIndex, zones.length, timePerZone, previewSeconds, showPreview])

  const retryZone = useCallback(() => {
    setMatchedPairIds([])
    setFlippedIds([])
    setPausedForInfo(false)
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
    bestStreak,
    lastMatch,
    pausedForInfo,
    resumeAfterInfo,
    skipPreview,
    timeLeft,
    previewSecondsLeft,
    totalPairsInZone,
    matchedInZone,
    correctCount,
    incorrectCount,
    /** Milisegundos transcurridos desde que se montó el hook (issue #226, métricas). */
    getTimePlayedMs: () => Date.now() - startedAtRef.current,
    flipCard,
    advanceZone,
    retryZone,
  }
}
