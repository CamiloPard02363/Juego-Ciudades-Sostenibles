import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryWithGameCount } from '../../../services/category.service'
import { Modal } from './Modal'

type CategoriesManagerModalProps = {
  categories: CategoryWithGameCount[]
  colorFor: (index: number) => string
  iconFor: (name: string) => LucideIcon
  canDelete: (category: CategoryWithGameCount) => boolean
  deleting: boolean
  onSelect: (categoryId: string) => void
  onDelete: (category: CategoryWithGameCount) => Promise<boolean>
  onClose: () => void
}

/** Panel con todas las materias creadas, con el mismo estilo del home, desde donde también se eliminan. */
export function CategoriesManagerModal({
  categories,
  colorFor,
  iconFor,
  canDelete,
  deleting,
  onSelect,
  onDelete,
  onClose,
}: CategoriesManagerModalProps) {
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<CategoryWithGameCount | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = categories.filter((category) =>
    category.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  async function confirmDelete() {
    if (!pendingDelete) return
    setError(null)
    const ok = await onDelete(pendingDelete)
    if (ok) {
      setPendingDelete(null)
    } else {
      setError('No se pudo eliminar la materia.')
    }
  }

  if (pendingDelete) {
    return (
      <Modal onClose={() => (deleting ? null : setPendingDelete(null))} maxWidthClassName="max-w-[420px]">
        <h2 className="mb-2 text-[18px] tracking-tight text-text-h">Eliminar materia</h2>
        <p className="mb-6 text-[14px] leading-relaxed text-text">
          ¿Eliminar "{pendingDelete.name}"? Esta acción no se puede deshacer.
        </p>

        {error && (
          <p
            className="mb-4 rounded-lg border border-danger/35 bg-danger/10 px-[13px] py-[11px] text-sm leading-snug text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-danger px-4 py-3 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-3 text-[15px] font-medium text-text-h disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setPendingDelete(null)}
            disabled={deleting}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[560px]">
      <h2 className="mb-1 text-[18px] tracking-tight text-text-h">Todas las materias</h2>
      <p className="mb-4 text-[13px] text-text">
        Elige una para filtrar los juegos, o elimina las que ya no necesites.
      </p>

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar materia…"
        className="mb-4 w-full rounded-lg border border-border bg-bg px-[13px] py-2.5 text-[13px] text-text-h outline-none focus:border-accent"
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-text">No hay materias que coincidan.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {filtered.map((category) => {
            const originalIndex = categories.indexOf(category)
            const color = colorFor(originalIndex)
            const Icon = iconFor(category.name)

            return (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <button
                  type="button"
                  onClick={() => onSelect(category.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: color }}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold text-text-h">
                      {category.name}
                    </span>
                    <span className="text-[11.5px] text-text">
                      {category.gameCount} {category.gameCount === 1 ? 'juego' : 'juegos'}
                    </span>
                  </span>
                </button>

                {canDelete(category) && (
                  <button
                    type="button"
                    aria-label={`Eliminar materia ${category.name}`}
                    title="Eliminar materia"
                    className="shrink-0 rounded-lg border border-border p-2 text-text/70 transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => setPendingDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-[14px] font-medium text-text-h"
        onClick={onClose}
      >
        Cerrar
      </button>
    </Modal>
  )
}
