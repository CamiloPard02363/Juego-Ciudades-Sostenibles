import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import {
  archiveGameType,
  unarchiveGameType,
  updateGameTypeSetting,
  type GameTypeSetting,
} from '../../../services/game.service'
import { ApiError } from '../../../utils/http'

type GameTypeSettingEditModalProps = {
  setting: GameTypeSetting
  onClose: () => void
  onSaved: (updated: GameTypeSetting) => void
}

/**
 * Modal de gobernanza de un tipo de juego (issue #156), abierto desde el
 * engranaje de `GameTypesCatalogPage`. Solo ADMIN llega a montar este
 * componente (el engranaje ni se muestra a otro rol), pero el backend
 * revalida igual — este modal no es la única barrera de seguridad.
 */
export function GameTypeSettingEditModal({ setting, onClose, onSaved }: GameTypeSettingEditModalProps) {
  const { token } = useAuth()
  const [displayName, setDisplayName] = useState(setting.displayName)
  const [description, setDescription] = useState(setting.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateGameTypeSetting(token, setting.gameType, {
        displayName: displayName.trim(),
        description: description.trim() || undefined,
      })
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el tipo de juego.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleArchive() {
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const updated = setting.isArchived
        ? await unarchiveGameType(token, setting.gameType)
        : await archiveGameType(token, setting.gameType)
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del tipo de juego.')
    } finally {
      setSaving(false)
      setConfirmingArchive(false)
    }
  }

  return (
    <div className="mx-auto max-w-[480px] p-8">
      <h2 className="mb-1 text-[20px] tracking-tight text-text-h">Editar tipo de juego</h2>
      <p className="mb-6 text-[13px] text-text">
        {setting.gameType} · {setting.isArchived ? 'Archivado' : 'Activo'}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      )}

      <label className="mb-3 block">
        <span className="mb-1 block text-[13px] font-medium text-text-h">Nombre visible</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="w-full rounded-lg border border-border px-3 py-2 text-[14px]"
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-1 block text-[13px] font-medium text-text-h">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 text-[14px]"
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={saving || !displayName.trim()}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          onClick={handleSave}
        >
          Guardar
        </button>

        {confirmingArchive ? (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-[13px] text-text-h">
              {setting.isArchived
                ? '¿Desarchivar este tipo de juego? Volverá a ser visible y creable.'
                : '¿Archivar este tipo de juego? Sus juegos existentes quedarán ocultos y nadie podrá crear nuevos hasta desarchivarlo.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                onClick={handleToggleArchive}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-text-h"
                onClick={() => setConfirmingArchive(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h disabled:opacity-50"
            onClick={() => setConfirmingArchive(true)}
          >
            {setting.isArchived ? 'Desarchivar' : 'Archivar'}
          </button>
        )}

        <button
          type="button"
          className="w-full rounded-lg px-4 py-2.5 text-[14px] font-medium text-text"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
