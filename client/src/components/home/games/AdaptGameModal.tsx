import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Dices,
  Flame,
  Ghost,
  Layers,
  Loader2,
  Puzzle,
  UserRoundSearch,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { adaptGame } from '../../../services/game-adaptation.service'
import { listAllGameTypeSettings, type GameDetail } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { AiSparklesIcon } from './AiSparklesIcon'
import { Modal } from './Modal'

type AdaptTarget = {
  key: string
  title: string
  description: string
  targetType: string
  mode?: string
  route: string
  icon: LucideIcon
}

const TARGETS: AdaptTarget[] = [
  {
    key: 'DOMINO',
    title: 'Dominó',
    description: 'Cada mitad de ficha es un concepto del tema.',
    targetType: 'DOMINO',
    route: '/juegos/crear/domino',
    icon: Puzzle,
  },
  {
    key: 'MAZE_COLLECTOR',
    title: 'Recolector de laberinto',
    description: 'Recolecta los conceptos del tema esquivando enemigos.',
    targetType: 'MAZE_COLLECTOR',
    route: '/juegos/crear/laberinto',
    icon: Ghost,
  },
  {
    key: 'SNAKES_LADDERS',
    title: 'Escaleras y Serpientes',
    description: 'El avance depende de responder preguntas del tema.',
    targetType: 'SNAKES_LADDERS',
    route: '/juegos/crear/escaleras-serpientes',
    icon: Dices,
  },
  {
    key: 'GUESS_WHO',
    title: '¿Quién Es?',
    description: 'Adivina la tarjeta secreta del otro jugador.',
    targetType: 'GUESS_WHO',
    route: '/juegos/crear/quien-es',
    icon: UserRoundSearch,
  },
  {
    key: 'PAIRS',
    title: 'Memoria: parejas',
    description: 'Une cada imagen con su concepto.',
    targetType: 'MEMORY_MATCH',
    mode: 'PAIRS',
    route: '/juegos/crear/cartas/parejas',
    icon: Layers,
  },
  {
    key: 'OPPOSITES',
    title: 'Memoria: opuestos',
    description: 'Une cada concepto con su opuesto.',
    targetType: 'MEMORY_MATCH',
    mode: 'OPPOSITES',
    route: '/juegos/crear/cartas/opuestos',
    icon: Layers,
  },
  {
    key: 'DUAL_QUEST',
    title: 'Dúo Lógico',
    description: 'Dos personajes resuelven retos del tema en cooperación.',
    targetType: 'DUAL_QUEST',
    route: '/juegos/crear/dual-quest',
    icon: Flame,
  },
]

type AdaptGameModalProps = {
  game: GameDetail
  onClose: () => void
}

function isSameTarget(game: GameDetail, target: AdaptTarget): boolean {
  if (game.gameType !== target.targetType) return false
  if (game.gameType !== 'MEMORY_MATCH') return true
  return (game.config as { mode?: string }).mode === target.mode
}

const ACCENT_GRADIENT = 'linear-gradient(135deg, var(--accent), var(--accent-2))'

/**
 * Elige el tipo de juego destino y pide el borrador al servidor (issue #8).
 * El borrador viaja por `location.state` al formulario del tipo elegido, que
 * lo aplica con las mismas funciones del asistente de IA. Nada se guarda
 * hasta que el usuario crea el juego nuevo desde ese formulario.
 *
 * Cada generación consume cuota de IA, por eso elegir un tipo solo abre una
 * confirmación y la llamada al servidor ocurre únicamente al confirmarla.
 * Los tipos de juego inactivos (archivados) aparecen deshabilitados; el
 * servidor los rechaza igual, antes de gastar IA.
 */
export function AdaptGameModal({ game, onClose }: AdaptGameModalProps) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<AdaptTarget | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // `null` mientras carga o si la consulta falla: en ese caso no se bloquea
  // nada en pantalla y la validación definitiva la hace el servidor.
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    listAllGameTypeSettings(token)
      .then((settings) => {
        if (cancelled) return
        setActiveTypes(new Set(settings.filter((s) => !s.isArchived).map((s) => s.gameType)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token])

  function isUnavailable(target: AdaptTarget): boolean {
    return activeTypes !== null && !activeTypes.has(target.targetType)
  }

  async function handleConfirm() {
    if (!token || !candidate || pendingKey) return
    const target = candidate
    setPendingKey(target.key)
    setError(null)
    try {
      const adaptation = await adaptGame(token, game.id, {
        targetType: target.targetType,
        mode: target.mode,
      })
      navigate(target.route, { state: { adaptation } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo adaptar el juego.')
      setPendingKey(null)
    }
  }

  const busy = pendingKey !== null
  const options = TARGETS.filter((target) => !isSameTarget(game, target))
  const CandidateIcon = candidate?.icon

  return (
    <Modal
      onClose={busy ? () => {} : onClose}
      maxWidthClassName="max-w-[560px]"
      ariaLabelledBy="adapt-game-title"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: ACCENT_GRADIENT }}
        >
          <AiSparklesIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 id="adapt-game-title" className="text-[18px] font-semibold text-text-h">
            Adaptar con IA «{game.title}»
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-text">
            Conserva el tema y los conceptos, y los convierte a otra mecánica de juego. Lo revisas
            antes de guardarlo y queda como un juego nuevo a tu nombre; el original no cambia.
          </p>
        </div>
      </div>

      {candidate === null ? (
        <>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-text">
            Elige el tipo de juego
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((target) => {
              const Icon = target.icon
              const unavailable = isUnavailable(target)
              return (
                <button
                  key={target.key}
                  type="button"
                  disabled={unavailable}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
                  onClick={() => {
                    setError(null)
                    setCandidate(target)
                  }}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
                  <span>
                    <span className="block text-[14px] font-semibold text-text-h">{target.title}</span>
                    <span className="block text-[12.5px] leading-snug text-text">
                      {unavailable
                        ? 'No disponible por ahora: este tipo de juego está inactivo.'
                        : target.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            {CandidateIcon && (
              <CandidateIcon className="mt-0.5 h-6 w-6 shrink-0 text-accent" strokeWidth={2} />
            )}
            <div>
              <p className="text-[15px] font-semibold text-text-h">¿Adaptar a «{candidate.title}»?</p>
              <p className="mt-1 text-[12.5px] leading-snug text-text">{candidate.description}</p>
            </div>
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-text">
            Al confirmar, la IA generará el borrador y consumirá cuota. Si no es el tipo que
            buscabas, vuelve atrás y elige otro.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h disabled:opacity-50"
              disabled={busy}
              onClick={() => setCandidate(null)}
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
              Elegir otro tipo
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: ACCENT_GRADIENT }}
              disabled={busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AiSparklesIcon className="h-4 w-4" />}
              {busy ? 'Generando…' : 'Sí, adaptar con IA'}
            </button>
          </div>
        </div>
      )}

      {busy && (
        <p className="mt-3 text-[12.5px] text-text" role="status">
          Armando el borrador con IA… puede tardar unos segundos.
        </p>
      )}
      {error && (
        <p className="mt-3 text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
