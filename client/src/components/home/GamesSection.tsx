import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listGames } from '../../services/game.service'
import type { GameSummary } from '../../services/game.service'

type GamesSectionProps = {
  searchQuery: string
}

/**
 * Busca en GET /games cada vez que cambia `searchQuery` (solo se actualiza
 * al enviar la barra de búsqueda, no en cada tecla). El catálogo todavía no
 * tiene juegos publicados, así que hoy siempre se ve el estado vacío — pero
 * ya es el resultado real de una búsqueda, no un mensaje fijo.
 */
export function GamesSection({ searchQuery }: GamesSectionProps) {
  const { token } = useAuth()
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    setLoading(true)
    setError(false)

    listGames(token, searchQuery, controller.signal)
      .then((result) => setGames(result.items))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [token, searchQuery])

  return (
    <section>
      <h2 className="mb-1 text-[22px] tracking-tight text-text-h">Juegos</h2>
      <p className="mb-6 text-[14px] text-text">
        Elige un juego para empezar a aprender jugando.
      </p>

      {!loading && !error && games.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {games.map((game) => (
            <li
              key={game.id}
              className="rounded-xl border border-border bg-code-bg p-4 text-[14px] font-medium text-text-h"
            >
              {game.title}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl text-accent"
            aria-hidden="true"
          >

          </span>

          {loading ? (
            <p className="text-[15px] font-medium text-text-h">Buscando…</p>
          ) : error ? (
            <p className="text-[15px] font-medium text-text-h">
              No se pudo completar la búsqueda. Intenta de nuevo.
            </p>
          ) : (
            <>
              <p className="text-[15px] font-medium text-text-h">
                {searchQuery.trim()
                  ? `No se encontraron resultados para "${searchQuery.trim()}".`
                  : 'Aún no hay juegos disponibles.'}
              </p>
              <p className="mt-1 max-w-[320px] text-[13px] text-text">
                Muy pronto vas a encontrar aquí los juegos de la plataforma.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
