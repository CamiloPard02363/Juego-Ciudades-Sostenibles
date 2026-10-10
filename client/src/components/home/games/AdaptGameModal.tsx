import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { adaptGame } from '../../../services/game-adaptation.service'
import type { GameDetail } from '../../../services/game.service'
import { ApiError } from '../../../utils/http'
import { Modal } from './Modal'

type AdaptTarget = {
  key: string
  title: string
  description: string
  targetType: string
  mode?: string
  route: string
}

const TARGETS: AdaptTarget[] = [
  {
    key: 'DOMINO',
    title: 'Dominó',
    description: 'Cada mitad de ficha es un concepto del tema.',
    targetType: 'DOMINO',
    route: '/juegos/crear/domino',
  },
  {
    key: 'MAZE_COLLECTOR',
    title: 'Recolector de laberinto',
    description: 'Recolecta los conceptos del tema esquivando enemigos.',
    targetType: 'MAZE_COLLECTOR',
    route: '/juegos/crear/laberinto',
  },
  {
    key: 'SNAKES_LADDERS',
    title: 'Escaleras y Serpientes',
    description: 'El avance depende de responder preguntas del tema.',
    targetType: 'SNAKES_LADDERS',
    route: '/juegos/crear/escaleras-serpientes',
  },
  {
    key: 'GUESS_WHO',
    title: '¿Quién Es?',
    description: 'Adivina la tarjeta secreta del otro jugador.',
    targetType: 'GUESS_WHO',
    route: '/juegos/crear/quien-es',
  },
  {
    key: 'PAIRS',
    title: 'Memoria: parejas',
    description: 'Une cada imagen con su concepto.',
    targetType: 'MEMORY_MATCH',
    mode: 'PAIRS',
    route: '/juegos/crear/cartas/parejas',
  },
  {
    key: 'OPPOSITES',
    title: 'Memoria: opuestos',
    description: 'Une cada concepto con su opuesto.',
    targetType: 'MEMORY_MATCH',
    mode: 'OPPOSITES',
    route: '/juegos/crear/cartas/opuestos',
  },
  {
    key: 'DUAL_QUEST',
    title: 'Dúo Lógico',
    description: 'Dos personajes resuelven retos del tema en cooperación.',
    targetType: 'DUAL_QUEST',
    route: '/juegos/crear/dual-quest',
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

/**
 * Elige el tipo de juego destino y pide el borrador al servidor (issue #8).
 * El borrador viaja por `location.state` al formulario del tipo elegido, que
 * lo aplica con las mismas funciones del asistente de IA. Nada se guarda
 * hasta que el usuario crea el juego nuevo desde ese formulario.
 */
export function AdaptGameModal({ game, onClose }: AdaptGameModalProps) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePick(target: AdaptTarget) {
    if (!token || pendingKey) return
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

  return (
    <Modal
      onClose={busy ? () => {} : onClose}
      maxWidthClassName="max-w-[520px]"
      ariaLabelledBy="adapt-game-title"
    >
      <h2 id="adapt-game-title" className="text-[18px] font-semibold text-text-h">
        Adaptar «{game.title}» a otro tipo de juego
      </h2>
      <p className="mt-1.5 text-[13px] text-text">
        Usamos el mismo tema y conceptos para armar un borrador en otra mecánica. Lo revisas antes
        de guardarlo y queda como un juego nuevo a tu nombre; el original no cambia.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {TARGETS.filter((target) => !isSameTarget(game, target)).map((target) => (
          <button
            key={target.key}
            type="button"
            disabled={busy}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handlePick(target)}
          >
            <span>
              <span className="block text-[14px] font-semibold text-text-h">{target.title}</span>
              <span className="block text-[12.5px] text-text">{target.description}</span>
            </span>
            {pendingKey === target.key && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
          </button>
        ))}
      </div>

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

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-text-h disabled:opacity-50"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
