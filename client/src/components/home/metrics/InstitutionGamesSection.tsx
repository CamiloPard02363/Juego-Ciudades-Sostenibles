import { useInstitutionGames } from './useInstitutionGames'

/** "Juegos de la institución" (issue #226): solo lectura, catálogo publicado de la organización. */
export function InstitutionGamesSection({ organizationId }: { organizationId: string }) {
  const { games, loading, error } = useInstitutionGames(organizationId)

  if (loading) return <p className="text-[14px] text-text">Cargando juegos…</p>
  if (error) return <p className="text-[14px] text-red-600">{error}</p>
  if (games.length === 0) {
    return <p className="text-[14px] text-text/70">Esta institución todavía no tiene juegos propios.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <div key={game.id} className="rounded-2xl border border-border p-4">
          <h4 className="text-[15px] font-semibold text-text-h">{game.title}</h4>
          <p className="mt-1 line-clamp-2 text-[13px] text-text">{game.description}</p>
          <span className="mt-2 inline-block rounded-full bg-code-bg px-2.5 py-1 text-[11.5px] font-medium text-text-h">
            {game.gameType}
          </span>
        </div>
      ))}
    </div>
  )
}
