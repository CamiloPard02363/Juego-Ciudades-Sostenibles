import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  listGames,
  getGameBySlug,
  type GameSummary,
  type GameDetail,
} from '../../services/game.service'
import { ApiError } from '../../utils/http'
import { GameCard } from './games/GameCard'
import { GameDetailModal } from './games/GameDetailModal'
import { PlayOptionsPopup } from './games/PlayOptionsPopup'
import type { Difficulty } from './games/PlayOptionsPopup'
import { MemoryMatchGame } from './games/MemoryMatchGame'
import { CreateGameForm } from './games/CreateGameForm'
import type { MemoryMatchPair, MemoryMatchConfig } from './games/memoryMatchTypes'

type GamesSectionProps = {
  searchQuery: string
}

type PlaySession = {
  game: GameDetail
  pairCount: number
  difficulty: Difficulty
  showPreview: boolean
}

const DEFAULT_MEMORY_CONFIG: MemoryMatchConfig = {
  perZone: 8,
  timePerZoneSeconds: 90,
  previewSeconds: 5,
}

export function GamesSection({ searchQuery }: GamesSectionProps) {
  const { token } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedGame, setSelectedGame] = useState<GameDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [showPlayOptions, setShowPlayOptions] = useState(false)
  const [playSession, setPlaySession] = useState<PlaySession | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listGames(token, { search: searchQuery || undefined, pageSize: 40 })
      .then((result) => setGames(result.items))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los juegos.')
      })
      .finally(() => setLoading(false))
  }, [token, searchQuery])

  useEffect(() => {
    reload()
  }, [reload])

  async function openGame(summary: GameSummary) {
    if (!token) return
    setDetailError(null)
    try {
      const detail = await getGameBySlug(token, summary.slug)
      setSelectedGame(detail)
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'No se pudo abrir el juego.')
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Juegos</h2>
          <p className="text-[14px] text-text">Elige un juego para empezar a aprender jugando.</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white dark:text-bg"
          onClick={() => setShowCreateForm(true)}
        >
          + Crear nuevo
        </button>
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {detailError && (
        <p
          className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
          role="alert"
        >
          {detailError}
        </p>
      )}

      {loading ? (
        <p className="text-[14px] text-text">Cargando juegos…</p>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl text-accent"
            aria-hidden="true"
          >

          </span>
          <p className="text-[15px] font-medium text-text-h">
            {searchQuery
              ? `Sin resultados para "${searchQuery}".`
              : 'Aún no hay juegos disponibles.'}
          </p>
          <p className="mt-1 max-w-[320px] text-[13px] text-text">
            {searchQuery
              ? 'Prueba con otro término de búsqueda.'
              : 'Sé la primera persona en crear uno.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onClick={() => openGame(game)} />
          ))}
        </div>
      )}

      {selectedGame && !showPlayOptions && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onPlay={() => setShowPlayOptions(true)}
        />
      )}

      {selectedGame && showPlayOptions && (
        <PlayOptionsPopup
          game={selectedGame}
          onClose={() => setShowPlayOptions(false)}
          onStart={(options) => {
            setPlaySession({ game: selectedGame, ...options })
            setShowPlayOptions(false)
            setSelectedGame(null)
          }}
        />
      )}

      {playSession && (
        <MemoryMatchGame
          title={playSession.game.title}
          primaryColor={playSession.game.theme.primaryColor}
          pairs={playSession.game.content as MemoryMatchPair[]}
          pairCount={playSession.pairCount}
          difficulty={playSession.difficulty}
          showPreview={playSession.showPreview}
          perZone={(playSession.game.config as Partial<MemoryMatchConfig>).perZone ?? DEFAULT_MEMORY_CONFIG.perZone}
          timePerZoneSeconds={
            (playSession.game.config as Partial<MemoryMatchConfig>).timePerZoneSeconds ??
            DEFAULT_MEMORY_CONFIG.timePerZoneSeconds
          }
          previewSeconds={
            (playSession.game.config as Partial<MemoryMatchConfig>).previewSeconds ??
            DEFAULT_MEMORY_CONFIG.previewSeconds
          }
          onExit={() => setPlaySession(null)}
        />
      )}

      {showCreateForm && (
        <CreateGameForm
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false)
            reload()
          }}
        />
      )}
    </section>
  )
}
