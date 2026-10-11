import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../hooks/useAuth'
import { getGameBySlug, type GameDetail } from '../../../../services/game.service'
import { trackEvent } from '../../../../services/analytics.service'
import { ApiError } from '../../../../utils/http'
import { TrueFalseMazeGame } from './TrueFalseMazeGame'
import { resolveTrueFalseMazeConfig, resolveTrueFalseMazeQuestions } from './trueFalseMazeTypes'

/**
 * Ruta `/jugar/laberinto-vf/:slug` (ver App.tsx): carga un juego
 * TRUE_FALSE_MAZE por su slug y lo juega a pantalla completa, fuera de
 * HomeLayout — mismo criterio que MazeCollectorPlayPage.
 */
export function TrueFalseMazePlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; game: GameDetail }
  >({ status: 'loading' })

  useEffect(() => {
    if (!token || !slug) return
    let cancelled = false
    getGameBySlug(token, slug)
      .then((game) => {
        if (cancelled) return
        if (game.gameType !== 'TRUE_FALSE_MAZE') {
          setState({ status: 'error', message: `"${game.title}" no es un Laberinto Verdadero o Falso.` })
          return
        }
        setState({ status: 'ready', game })
        trackEvent(token, 'game_opened', { gameId: game.id, metadata: { section: 'play-page' } })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? 'No encontramos ese juego — revisa el enlace.'
              : err.message
            : 'No se pudo abrir el juego.'
        setState({ status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [token, slug])

  const game = state.status === 'ready' ? state.game : null
  const questions = useMemo(() => resolveTrueFalseMazeQuestions(game?.content), [game])
  const config = useMemo(() => resolveTrueFalseMazeConfig(game?.config), [game])

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

  if (state.status === 'error' || !game || questions.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[14px] text-danger">
          {state.status === 'error' ? state.message : 'Este juego no tiene afirmaciones para jugar.'}
        </p>
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

  return <TrueFalseMazeGame key={game.id} title={game.title} questions={questions} config={config} onExit={handleExit} />
}
