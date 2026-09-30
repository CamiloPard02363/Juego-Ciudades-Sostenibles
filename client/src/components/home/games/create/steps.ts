import type { SubPhaseProgress } from './CreateGameProgressContext'

export type CreateGameStep = {
  label: string
  step: number
  total: number
}

const TOTAL_STEPS = 2

/**
 * Deriva el paso actual del wizard de creación a partir de la URL, para el
 * indicador de progreso del header. Cuando el formulario del paso 2 reporta
 * su propia sub-fase (ver `CreateGameProgressContext`), el total y el paso
 * mostrado incluyen esas sub-fases en vez de quedarse en "2 de 2" durante
 * todo el formulario — issue #218.
 */
export function stepFromPath(pathname: string, subPhase: SubPhaseProgress | null = null): CreateGameStep {
  if (pathname === '/juegos/crear' || pathname === '/juegos/crear/') {
    return { label: 'Elige el tipo de juego', step: 1, total: subPhase ? 1 + subPhase.totalPhases : TOTAL_STEPS }
  }
  if (pathname === '/juegos/crear/cartas') {
    return { label: 'Elige el modo de juego', step: 1, total: subPhase ? 1 + subPhase.totalPhases : TOTAL_STEPS }
  }
  if (subPhase) {
    return {
      label: subPhase.phaseLabel,
      step: 1 + subPhase.phase,
      total: 1 + subPhase.totalPhases,
    }
  }
  return { label: 'Completa los datos del juego', step: 2, total: TOTAL_STEPS }
}
