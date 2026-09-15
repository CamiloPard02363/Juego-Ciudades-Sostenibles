import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { getGameBySlug, type GameDetail } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { DualQuestPixiMount } from './dual-quest-pixi/DualQuestPixiMount'
import { adaptGameDetailToLevel } from './dual-quest-pixi/adaptGameDetailToLevel'
import type { LevelDef } from './dual-quest-pixi/dualQuestPixiTypes'

/**
 * Ruta `/dual-quest-pixi/:slug` — carga un juego DUAL_QUEST_PIXI real
 * desde la API por su slug y lo adapta a `LevelDef` (ver
 * adaptGameDetailToLevel.ts), a diferencia de DualQuestPixiDemoPage, que
 * usa un LevelDef fijo importado del código para pruebas locales.
 */
export function DualQuestPixiPlayPage() {
  const { slug } = useParams<{ slug: string }>()
  const { token } = useAuth()
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; level: LevelDef; game: GameDetail }
  >({ status: 'loading' })

  useEffect(() => {
    if (!slug || !token) return
    let cancelled = false
    setState({ status: 'loading' })

    getGameBySlug(token, slug)
      .then((game) => {
        if (cancelled) return
        if (game.gameType !== 'DUAL_QUEST_PIXI') {
          setState({ status: 'error', message: `"${game.title}" no es un juego de Dúo Lógico (motor PixiJS).` })
          return
        }
        const level = adaptGameDetailToLevel(game)
        setState({ status: 'ready', level, game })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? 'No encontramos ese juego — revisa el enlace.'
              : err.message
            : err instanceof Error
              ? err.message
              : 'No se pudo cargar el juego.'
        setState({ status: 'error', message })
      })

    return () => {
      cancelled = true
    }
  }, [slug, token])

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{state.status === 'ready' ? state.game.title : 'Dúo Lógico'}</h1>
          <p className="text-sm text-slate-500">
            Lumen: A/D moverse, W saltar o nadar, S bucear. Gota: flechas izquierda/derecha, arriba saltar o nadar,
            abajo bucear.
          </p>
        </div>
        <Link to="/comunidad" className="text-sm text-emerald-600 hover:underline">
          Volver a la comunidad
        </Link>
      </div>

      {state.status === 'loading' && (
        <div className="flex aspect-[16/10.2] w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-white">
          Cargando nivel…
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex aspect-[16/10.2] w-full flex-col items-center justify-center gap-2 rounded-xl border border-red-800 bg-slate-950 p-6 text-center text-white">
          <p className="text-red-300">{state.message}</p>
        </div>
      )}

      {state.status === 'ready' && <DualQuestPixiMount level={state.level} />}
    </main>
  )
}
