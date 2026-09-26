import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { getGameBySlug, type GameDetail } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { trackEvent } from '../../../services/analytics.service'
import { colorForCategory, DEFAULT_CATEGORY_COLOR } from '../gamesCatalogVisuals'
import { listSubjects as listCategories, type SubjectWithGameCount } from '../../../services/subject.service'
import { PlayOptionsPopup, type Difficulty } from './PlayOptionsPopup'
import { MemoryMatchGame } from './MemoryMatchGame'
import type { MemoryMatchConfig, MemoryMatchPair } from './memoryMatchTypes'

const DEFAULT_MEMORY_CONFIG: MemoryMatchConfig = {
  mode: 'OPPOSITES',
  perZone: 8,
  timePerZoneSeconds: 90,
  previewSeconds: 5,
}

type PlaySession = { pairCount: number; difficulty: Difficulty; showPreview: boolean }

/**
 * Vista dedicada de Memory Match (Parejas/Opuestos) en ruta propia
 * (`/jugar/memoria/:slug`, ver App.tsx), fuera de HomeLayout — sin
 * Sidebar/header detrás. Reemplaza el overlay que antes montaba
 * GamesSection al hacer clic en "Jugar" (ver PlayOptionsPopup +
 * MemoryMatchGame, que siguen igual: solo cambió quién los monta).
 */
export function MemoryMatchPlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [categories, setCategories] = useState<SubjectWithGameCount[]>([])
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; game: GameDetail }
  >({ status: 'loading' })
  const [playSession, setPlaySession] = useState<PlaySession | null>(null)

  useEffect(() => {
    if (!token) return
    listCategories(token).then(setCategories).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token || !slug) return
    let cancelled = false
    setState({ status: 'loading' })
    getGameBySlug(token, slug)
      .then((game) => {
        if (cancelled) return
        setState({ status: 'ready', game })
        trackEvent(token, 'game_opened', { gameId: game.id, metadata: { section: 'play-page' } })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState({ status: 'error', message: err instanceof ApiError ? err.message : 'No se pudo abrir el juego.' })
      })
    return () => {
      cancelled = true
    }
  }, [token, slug])

  function handleExit() {
    navigate('/')
  }

  if (state.status === 'loading') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-[14px] text-text">Cargando juego…</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[14px] text-danger">{state.message}</p>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
          onClick={handleExit}
        >
          Volver al inicio
        </button>
      </main>
    )
  }

  const { game } = state
  const category = categories.find((c) => c.id === game.categoryId)
  const primaryColor = category ? colorForCategory(category.name) : DEFAULT_CATEGORY_COLOR

  if (!playSession) {
    return (
      <PlayOptionsPopup
        game={game}
        onClose={handleExit}
        onStart={(options) => setPlaySession(options)}
      />
    )
  }

  const config = game.config as Partial<MemoryMatchConfig>

  return (
    <MemoryMatchGame
      title={game.title}
      primaryColor={primaryColor}
      pairs={game.content as MemoryMatchPair[]}
      pairCount={playSession.pairCount}
      difficulty={playSession.difficulty}
      showPreview={playSession.showPreview}
      perZone={config.perZone ?? DEFAULT_MEMORY_CONFIG.perZone}
      timePerZoneSeconds={config.timePerZoneSeconds ?? DEFAULT_MEMORY_CONFIG.timePerZoneSeconds}
      previewSeconds={config.previewSeconds ?? DEFAULT_MEMORY_CONFIG.previewSeconds}
      onExit={handleExit}
    />
  )
}
