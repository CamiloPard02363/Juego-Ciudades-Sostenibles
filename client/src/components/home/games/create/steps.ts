export type CreateGameStep = {
  label: string
  step: number
  total: number
}

const TOTAL_STEPS = 2

/** Deriva el paso actual del wizard de creación a partir de la URL, para el indicador de progreso del header. */
export function stepFromPath(pathname: string): CreateGameStep {
  if (pathname === '/juegos/crear' || pathname === '/juegos/crear/') {
    return { label: 'Elige el tipo de juego', step: 1, total: TOTAL_STEPS }
  }
  if (pathname === '/juegos/crear/cartas') {
    return { label: 'Elige el modo de juego', step: 1, total: TOTAL_STEPS }
  }
  return { label: 'Completa los datos del juego', step: 2, total: TOTAL_STEPS }
}
