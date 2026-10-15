import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useToast } from '../../../hooks/useToast'
import type { AdaptedGameDraft } from '../../../services/game-adaptation.service'

/**
 * Borrador de adaptación (issue #8) que llega por `location.state` cuando el
 * usuario viene de "Adaptar a otro tipo de juego" en el detalle de un juego.
 * `undefined` si el formulario se abrió por el flujo normal de creación.
 */
export function useAdaptationFromLocation(): AdaptedGameDraft | undefined {
  const location = useLocation()
  return (location.state as { adaptation?: AdaptedGameDraft } | null)?.adaptation
}

/**
 * Aplica UNA sola vez el borrador de adaptación al formulario: `apply`
 * rellena título/descripción/materia/portada y el contenido con las mismas
 * funciones que ya usa el asistente de IA. El aviso de la IA (qué falta
 * completar) se muestra como toast.
 */
export function useApplyAdaptation(
  adaptation: AdaptedGameDraft | undefined,
  apply: (adaptation: AdaptedGameDraft) => void,
): void {
  const { showToast } = useToast()
  const applied = useRef(false)

  useEffect(() => {
    if (!adaptation || applied.current) return
    applied.current = true
    apply(adaptation)
    if (adaptation.notice) showToast(adaptation.notice, 'success', 8000)
    // `apply` solo se ejecuta al montar; depender de ella lo repetiría en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaptation])
}
