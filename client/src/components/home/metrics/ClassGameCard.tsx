import type { ClassGameSummary } from '../../../services/class.service'

/**
 * Única responsabilidad: una card de un juego dentro del contexto de una
 * clase, con las acciones de gestión del issue #226 (eliminar / archivar).
 */
export function ClassGameCard({
  game,
  onRemove,
  onToggleArchived,
}: {
  game: ClassGameSummary
  onRemove: (gameId: string) => void
  onToggleArchived: (gameId: string, isArchived: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[15px] font-semibold text-text">{game.title}</h4>
        {game.isArchived && (
          <span className="rounded-full bg-text/10 px-2 py-0.5 text-[12px] text-text/70">
            Archivado
          </span>
        )}
      </div>
      <p className="text-[13px] text-text/70">{game.description}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onToggleArchived(game.id, !game.isArchived)}
          className="rounded-md border border-border px-3 py-1 text-[13px] hover:bg-text/5"
        >
          {game.isArchived ? 'Desarchivar' : 'Archivar'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Eliminar "${game.title}" de esta clase?`)) {
              onRemove(game.id)
            }
          }}
          className="rounded-md border border-red-600 px-3 py-1 text-[13px] text-red-600 hover:bg-red-50"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}
