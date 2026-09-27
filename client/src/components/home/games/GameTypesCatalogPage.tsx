import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ghost, Layers, Puzzle, UserRoundSearch, Dices, Flame, Settings, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { listGameTypeSettings, type GameTypeSetting } from '../../../services/game.service'
import { useHomeSearch } from '../homeSearchContext'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'
import { GameTypeSettingEditModal } from './GameTypeSettingEditModal'

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
 * Grilla del catálogo de tipos de juego (issue #156). El backend ya filtra
 * los tipos ARCHIVED para no-ADMIN (quedan ausentes, no solo marcados); acá
 * solo se pinta lo que llega. El engranaje (gestión) solo se muestra a ADMIN.
 */
export function GameTypesCatalogPage() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { onSectionViewed } = useHomeSearch()
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN'

  const [settings, setSettings] = useState<GameTypeSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSetting, setEditingSetting] = useState<GameTypeSetting | null>(null)

  useEffect(() => {
    onSectionViewed('game-types-catalog')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    listGameTypeSettings(token)
      .then(setSettings)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los tipos de juego.')
      })
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    reload()
  }, [reload])

  function handleCardClick(setting: GameTypeSetting) {
    navigate(`/tipos-de-juego/${encodeURIComponent(setting.gameType)}`)
  }

  function handleSettingSaved(updated: GameTypeSetting) {
    setSettings((prev) =>
      prev.map((s) => (s.gameType === updated.gameType ? updated : s)),
    )
    setEditingSetting(null)
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <h1 className="mb-1 text-[22px] tracking-tight text-text-h">Tipos de juego</h1>
      <p className="mb-7 text-[14px] text-text">Explora los juegos disponibles por mecánica.</p>

      {loading && <p className="text-[13px] text-text">Cargando…</p>}
      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.map((setting) => {
            const Icon = ICON_BY_GAME_TYPE[setting.gameType] ?? Layers
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

                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-text-h">{setting.displayName}</span>
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
