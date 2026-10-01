import { useClassGamesManagement } from './useClassGamesManagement'
import { ClassGameCard } from './ClassGameCard'

/**
 * "Juegos de la clase" del drill-down (issue #226). Compone el hook de
 * gestión + una card por juego — no conoce el detalle de cómo se persiste
 * cada acción.
 */
export function ClassGamesManagement({ classId }: { classId: string }) {
  const { games, loading, error, remove, toggleArchived } = useClassGamesManagement(classId)

  if (loading) return <p className="text-[14px] text-text">Cargando juegos…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (games.length === 0) {
    return <p className="text-[14px] text-text/70">Esta clase todavía no tiene juegos asignados.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <ClassGameCard
          key={game.id}
          game={game}
          onRemove={remove}
          onToggleArchived={toggleArchived}
        />
      ))}
    </div>
  )
}
