import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Ghost,
  Layers,
  Puzzle,
  UserRoundSearch,
  Dices,
  Flame,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { listGameTypeSettings, type GameTypeSetting } from '../../../services/game.service'
import { useHomeSearch } from '../homeSearchContext'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'
import { GameTypeSettingEditModal } from './GameTypeSettingEditModal'
import { LIVE_ROOM_GAME_TYPES } from './resolveRoomCode'
import { modeColorForGameType } from './gameModeVisuals'

/** Mismo ícono por mecánica que usa el picker de creación (GameTypePicker.tsx). */
const ICON_BY_GAME_TYPE: Record<string, LucideIcon> = {
  MEMORY_MATCH: Layers,
  GUESS_WHO: UserRoundSearch,
  DOMINO: Puzzle,
  MAZE_COLLECTOR: Ghost,
  SNAKES_LADDERS: Dices,
  DUAL_QUEST: Flame,
  DUAL_QUEST_PIXI: Flame,
}

/**
 * 2 filas x 3 columnas: cabe sin scroll en una pantalla de laptop estándar.
 * Con 6 por página, el catálogo actual (5 tipos para no-admin, 7 para admin)
 * cabe casi siempre en una sola página — el paginado por flecha existe para
 * cuando la plataforma agregue más mecánicas sin volver a depender de scroll.
 */
const PAGE_SIZE = 6

/**
 * Catálogo de tipos de juego (issue #156). Muchas quejas de usuarios por el
 * scroll largo en listados de home llevaron a paginar esta vista en vez de
 * apilar todo verticalmente: se pide una página a la vez al backend
 * (GET /game-types?page&pageSize) y se avanza con una flecha animada, en vez
 * de traer y renderizar el catálogo completo de una sola vez.
 */
export function GameTypesCatalogPage() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { onSectionViewed } = useHomeSearch()
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN'

  const [page, setPage] = useState(1)
  const [items, setItems] = useState<GameTypeSetting[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSetting, setEditingSetting] = useState<GameTypeSetting | null>(null)
  /**
   * Dirección de la transición de deslizamiento ('next' | 'prev'). Se aplica
   * junto con `items` en el mismo `then()` de la petición (ver `reload`) para
   * que la animación arranque exactamente cuando llegan las tarjetas nuevas
   * — antes se disparaba al hacer click (cambiaba `page`, que era la `key`),
   * así que corría sobre las tarjetas viejas y luego pegaba un salto brusco
   * cuando la respuesta llegaba ~1s después.
   */
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next')
  const [renderKey, setRenderKey] = useState(0)
  const pendingDirectionRef = useRef<'next' | 'prev'>('next')
  /**
   * Solo tiene efecto real para ADMIN (issue #156): un no-ADMIN nunca ve
   * ARCHIVED sin importar este filtro, así que el selector ni se muestra
   * para ese rol.
   */
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    onSectionViewed('game-types-catalog')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce de la búsqueda: espera a que la persona deje de escribir antes
  // de disparar la petición, en vez de una por cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listGameTypeSettings(token, { page, pageSize: PAGE_SIZE, statusFilter, search })
      .then((result) => {
        setItems(result.items)
        setTotal(result.total)
        setSlideDirection(pendingDirectionRef.current)
        setRenderKey((k) => k + 1)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los tipos de juego.')
      })
      .finally(() => setLoading(false))
  }, [token, page, statusFilter, search])

  function handleStatusFilterChange(next: 'ACTIVE' | 'ARCHIVED' | 'ALL') {
    setStatusFilter(next)
    setPage(1)
  }

  useEffect(() => {
    reload()
  }, [reload])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  function goToPage(next: number) {
    pendingDirectionRef.current = next > page ? 'next' : 'prev'
    setPage(next)
  }

  function handleCardClick(setting: GameTypeSetting) {
    navigate(`/tipos-de-juego/${encodeURIComponent(setting.gameType)}`)
  }

  function handleSettingSaved(updated: GameTypeSetting) {
    setItems((prev) => prev.map((s) => (s.gameType === updated.gameType ? updated : s)))
    setEditingSetting(null)
  }

  return (
    <div className="mx-auto -mt-6 max-w-[1100px] px-4 sm:-mt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] tracking-tight text-text-h">Tipos de juego</h1>
          <p className="text-[14px] text-text">Explora los juegos disponibles por mecánica.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/60"
              strokeWidth={2}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar tipo de juego…"
              aria-label="Buscar tipo de juego"
              className="w-[200px] rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-[13px] text-text-h placeholder:text-text/60 focus:border-accent focus:outline-none"
            />
          </div>

          {isAdmin && (
            <div className="flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Filtrar por estado">
              {(
                [
                  { value: 'ALL', label: 'Todos' },
                  { value: 'ACTIVE', label: 'Activos' },
                  { value: 'ARCHIVED', label: 'Archivados' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusFilterChange(value)}
                  className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusFilter === value
                      ? 'bg-accent text-white'
                      : 'text-text hover:bg-code-bg hover:text-text-h'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && items.length === 0 && <p className="text-[13px] text-text">Cargando…</p>}
      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {!error && items.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={!hasPrev}
            onClick={() => goToPage(page - 1)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border transition-all duration-200 ${
              hasPrev
                ? 'text-text-h hover:-translate-x-0.5 hover:border-accent hover:text-accent hover:shadow-[0_8px_20px_-10px_var(--accent)]'
                : 'cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <div className="overflow-hidden">
            <div
              key={renderKey}
              className={`grid grid-cols-1 gap-4 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 ${
                loading ? 'opacity-50' : 'opacity-100'
              } ${
                slideDirection === 'next'
                  ? 'animate-[slide-in-right_0.25s_ease-out]'
                  : 'animate-[slide-in-left_0.25s_ease-out]'
              }`}
            >
              {items.map((setting) => {
                const Icon = ICON_BY_GAME_TYPE[setting.gameType] ?? Layers
                const isMultiplayer = LIVE_ROOM_GAME_TYPES.includes(setting.gameType)
                return (
                  <div
                    key={setting.gameType}
                    role="button"
                    tabIndex={0}
                    className={`group relative flex flex-col gap-3 rounded-2xl border border-border p-5 text-left shadow-[var(--shadow)] transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-16px_var(--accent)] focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                      setting.isArchived ? 'opacity-70' : ''
                    }`}
                    onClick={() => handleCardClick(setting)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCardClick(setting)
                    }}
                  >
                    {isAdmin && (
                      <button
                        type="button"
                        aria-label={`Gestionar ${setting.displayName}`}
                        className="absolute right-3 top-3 rounded-full p-1.5 text-text transition-colors hover:bg-border hover:text-text-h"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingSetting(setting)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    )}

                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_20px_-10px_var(--accent)] transition-transform duration-200 group-hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-text-h">{setting.displayName}</span>
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
                        style={{ background: modeColorForGameType(setting.gameType) }}
                      >
                        {isMultiplayer ? <Users className="h-3 w-3" strokeWidth={2.5} /> : <User className="h-3 w-3" strokeWidth={2.5} />}
                        {isMultiplayer ? 'Multijugador' : '1 jugador'}
                      </span>
                      {setting.isArchived && (
                        <span className="rounded-full bg-border px-2 py-0.5 text-[10.5px] font-medium text-text">
                          Archivado
                        </span>
                      )}
                    </div>

                    {setting.description && (
                      <p className="text-[12.5px] leading-snug text-text">{setting.description}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            aria-label="Página siguiente"
            disabled={!hasNext}
            onClick={() => goToPage(page + 1)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border transition-all duration-200 ${
              hasNext
                ? 'animate-[pulse-attention_2s_ease-in-out_infinite] text-text-h hover:translate-x-0.5 hover:border-accent hover:text-accent hover:shadow-[0_8px_20px_-10px_var(--accent)]'
                : 'cursor-not-allowed opacity-30'
            }`}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-[13px] text-text">
          {search
            ? `Sin resultados para "${search}".`
            : statusFilter === 'ARCHIVED'
              ? 'No hay tipos de juego archivados.'
              : statusFilter === 'ACTIVE'
                ? 'No hay tipos de juego activos.'
                : 'No hay tipos de juego disponibles todavía.'}
        </p>
      )}

      {totalPages > 1 && items.length > 0 && (
        <p className="mt-4 text-center text-[12px] text-text">
          Página {page} de {totalPages}
        </p>
      )}

      {editingSetting && (
        <Modal onClose={() => setEditingSetting(null)} maxWidthClassName="max-w-[480px]">
          <GameTypeSettingEditModal
            setting={editingSetting}
            onClose={() => setEditingSetting(null)}
            onSaved={handleSettingSaved}
          />
        </Modal>
      )}
    </div>
  )
}
