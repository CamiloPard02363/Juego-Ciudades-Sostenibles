import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { listGameTypeSettings, type GameTypeSetting } from '../../../services/game.service'
import { useHomeSearch } from '../homeSearchContext'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'
import { GameTypeSettingEditModal } from './GameTypeSettingEditModal'

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
      <p className="mb-6 text-[13px] text-text">Explora los juegos disponibles por mecánica.</p>

      {loading && <p className="text-[13px] text-text">Cargando…</p>}
      {error && <p className="text-[13px] text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.map((setting) => (
            <div
              key={setting.gameType}
              role="button"
              tabIndex={0}
              className="relative flex flex-col gap-2 rounded-xl border border-border p-5 text-left transition-colors hover:border-accent hover:bg-accent/5"
              onClick={() => handleCardClick(setting)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCardClick(setting)
              }}
            >
              {isAdmin && (
                <button
                  type="button"
                  aria-label={`Gestionar ${setting.displayName}`}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-text hover:bg-border"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingSetting(setting)
                  }}
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}

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
          ))}
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
