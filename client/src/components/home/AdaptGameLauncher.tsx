import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getGameBySlug,
  listGames,
  type GameDetail,
  type GameSummary,
} from '../../services/game.service'
import { ApiError } from '../../utils/http'
import { AdaptGameModal } from './games/AdaptGameModal'
import { AiSparklesIcon } from './games/AiSparklesIcon'
import { Modal } from './games/Modal'

type Scope = 'mine' | 'community'

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: 'mine', label: 'Mis juegos' },
  { value: 'community', label: 'Comunidad' },
]

/**
 * Acceso global a la adaptación con IA (issue #8) desde la barra superior del
 * Home: un ícono de IA que salta para llamar la atención y, al pulsarlo,
 * pregunta primero QUÉ juego se quiere adaptar y luego a qué tipo
 * (`AdaptGameModal`, que a su vez pide confirmación antes de gastar IA).
 */
export function AdaptGameLauncher() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [source, setSource] = useState<GameDetail | null>(null)

  return (
    <>
      <button
        type="button"
        data-tour="adapt-game"
        onClick={() => setPickerOpen(true)}
        aria-label="Adaptar un juego a otro tipo con IA"
        title="Adaptar un juego a otro tipo con IA"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow)] ring-2 ring-accent/30 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-safe:animate-bounce"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
      >
        <AiSparklesIcon className="h-[18px] w-[18px]" />
      </button>

      {pickerOpen && !source && (
        <GamePickerModal
          onClose={() => setPickerOpen(false)}
          onPicked={(game) => setSource(game)}
        />
      )}
      {source && (
        <AdaptGameModal
          game={source}
          onClose={() => {
            setSource(null)
            setPickerOpen(false)
          }}
        />
      )}
    </>
  )
}

type GamePickerModalProps = {
  onClose: () => void
  onPicked: (game: GameDetail) => void
}

function GamePickerModal({ onClose, onPicked }: GamePickerModalProps) {
  const { token } = useAuth()
  const [scope, setScope] = useState<Scope>('mine')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [games, setGames] = useState<GameSummary[] | null>(null)
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    listGames(token, {
      pageSize: 30,
      search: debouncedSearch || undefined,
      onlyMine: scope === 'mine' || undefined,
      community: scope === 'community' || undefined,
    })
      .then((result) => {
        if (cancelled) return
        setError(null)
        setGames(result.items)
      })
      .catch(() => {
        if (cancelled) return
        setGames([])
        setError('No se pudieron cargar los juegos.')
      })
    return () => {
      cancelled = true
    }
  }, [token, scope, debouncedSearch])

  async function handlePick(game: GameSummary) {
    if (!token || loadingSlug) return
    setLoadingSlug(game.slug)
    setError(null)
    try {
      // El listado no trae `config`, y la adaptación lo necesita para
      // distinguir Parejas de Opuestos dentro de Memoria.
      onPicked(await getGameBySlug(token, game.slug))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo abrir el juego.')
      setLoadingSlug(null)
    }
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[520px]" ariaLabelledBy="adapt-picker-title">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          <AiSparklesIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 id="adapt-picker-title" className="text-[18px] font-semibold text-text-h">
            ¿Qué juego quieres adaptar?
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-text">
            Elige un juego y la IA lo convierte a otro tipo conservando el tema. El original no
            cambia.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Origen de los juegos">
        {SCOPES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={scope === item.value}
            className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              scope === item.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text hover:border-accent/50'
            }`}
            onClick={() => {
              setGames(null)
              setScope(item.value)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 focus-within:border-accent">
        <Search className="h-4 w-4 shrink-0 text-text" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre…"
          aria-label="Buscar juego"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-text-h outline-none"
        />
      </label>

      <ul className="mt-3 flex max-h-[320px] flex-col gap-1.5 overflow-y-auto">
        {games === null && (
          <li className="flex items-center gap-2 py-4 text-[13px] text-text">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando juegos…
          </li>
        )}
        {games?.length === 0 && !error && (
          <li className="py-4 text-[13px] text-text">No encontramos juegos con ese criterio.</li>
        )}
        {games?.map((game) => (
          <li key={game.id}>
            <button
              type="button"
              disabled={loadingSlug !== null}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handlePick(game)}
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold text-text-h">
                  {game.title}
                </span>
                <span className="block truncate text-[12px] text-text">{game.description}</span>
              </span>
              {loadingSlug === game.slug && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
