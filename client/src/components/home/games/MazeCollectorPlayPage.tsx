import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { getGameBySlug, type GameDetail } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { trackEvent } from '../../../services/analytics.service'
import { colorForCategory, DEFAULT_CATEGORY_COLOR } from '../gamesCatalogVisuals'
import { listSubjects as listCategories, type SubjectWithGameCount } from '../../../services/subject.service'
import { MazeCollectorGame } from './MazeCollectorGame'
import { MAZE_LAYOUTS, DEFAULT_MAZE_CONFIG } from './mazeCollectorTypes'
import type { MazeCollectorConfig, MazeCollectorItem } from './mazeCollectorTypes'

/**
 * Vista dedicada de Maze Collector en ruta propia (`/jugar/laberinto/:slug`,
 * ver App.tsx), fuera de HomeLayout — sin Sidebar/header detrás. La
 * configuración (vidas, velocidad, laberinto) ya quedó fija al crear el
 * juego, así que no hay pop-up de opciones previo (mismo criterio que tenía
 * el overlay que montaba GamesSection).
 */
export function MazeCollectorPlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [categories, setCategories] = useState<SubjectWithGameCount[]>([])
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; game: GameDetail }
  >({ status: 'loading' })

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
  const config = { ...DEFAULT_MAZE_CONFIG, ...(game.config as Partial<MazeCollectorConfig>) }

  return (
    <MazeCollectorGame
      title={game.title}
      primaryColor={primaryColor}
      layout={MAZE_LAYOUTS[config.layout]}
      items={game.content as MazeCollectorItem[]}
      config={config}
      onExit={handleExit}
    />
  )
}
