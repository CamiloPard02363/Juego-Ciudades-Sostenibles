import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { listGames, type GameSummary } from '../../../services/game.service'
import type { SubjectWithGameCount as CategoryWithGameCount } from '../../../services/subject.service'
import { colorForCategory } from '../gamesCatalogVisuals'
import { KidsGameCard } from './KidsGameCard'

type KidsGameGridProps = {
  token: string
  category: CategoryWithGameCount
  onBack: () => void
  onPlay: (game: GameSummary) => void
}

/**
 * Grilla de juegos dentro de un "mundo" (materia) del Modo Kids. Reusa el
 * mismo `listGames` de siempre (sin filtro adicional = solo publicados,
 * ver game.service.ts) — nada de lógica de catálogo propia, solo una
 * presentación distinta pensada para tocar y no para leer.
 */
export function KidsGameGrid({ token, category, onBack, onPlay }: KidsGameGridProps) {
  const [games, setGames] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listGames(token, { categoryId: category.id, pageSize: 60 })
      .then((result) => {
        if (!cancelled) setGames(result.items)
      })
      .catch(() => {
        if (!cancelled) setGames([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, category.id])

  const color = colorForCategory(category.name)

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        data-tour="worlds-back"
        onClick={onBack}
        className="flex w-fit items-center gap-2 rounded-full border-4 px-4 py-2.5 text-[15px] font-extrabold text-text-h transition-transform hover:-translate-y-0.5 active:translate-y-0"
        style={{ borderColor: color, background: 'var(--surface)' }}
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
        Volver
      </button>

      <h2 className="text-[24px] font-extrabold text-text-h">{category.name}</h2>

      {loading ? (
        <p className="text-[15px] text-text">Cargando…</p>
      ) : games.length === 0 ? (
        <p className="text-[15px] text-text">Todavía no hay juegos aquí.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((game) => (
            <KidsGameCard key={game.id} game={game} color={color} onClick={() => onPlay(game)} />
          ))}
        </div>
      )}
    </div>
  )
}
