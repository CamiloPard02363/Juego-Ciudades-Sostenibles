import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useToast } from '../../../hooks/useToast'
import { getGameBySlug, type GameDetail, type GameSummary } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { AdaptGameModal } from './AdaptGameModal'
import { AiSparklesIcon } from './AiSparklesIcon'

type AdaptGameCornerButtonProps = {
  game: GameSummary
  /** Distancia desde arriba (clase `top-*`); baja si la tarjeta lleva un banner superior. */
  topClassName?: string
}

/**
 * Ícono de IA en la esquina de cada tarjeta de juego (issue #8): un toque
 * abre la adaptación a otro tipo de juego, sin entrar al detalle. Salta para
 * que se note. El listado no trae `config` (hace falta para distinguir
 * Parejas de Opuestos), así que el detalle se pide recién al pulsar.
 */
export function AdaptGameCornerButton({ game, topClassName = 'top-2' }: AdaptGameCornerButtonProps) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<GameDetail | null>(null)

  async function handleClick() {
    if (!token || loading) return
    setLoading(true)
    try {
      setDetail(await getGameBySlug(token, game.slug))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'No se pudo abrir el juego.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={`Adaptar «${game.title}» a otro tipo de juego con IA`}
        title="Adaptar con IA a otro tipo de juego"
        className={`absolute right-2 ${topClassName} z-30 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white/70 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          loading ? '' : 'motion-safe:animate-bounce'
        }`}
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AiSparklesIcon className="h-[18px] w-[18px]" />}
      </button>
      {detail && <AdaptGameModal game={detail} onClose={() => setDetail(null)} />}
    </>
  )
}
