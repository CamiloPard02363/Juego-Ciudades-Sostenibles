import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type SubPhaseProgress = {
  /** Fase actual del sub-wizard dentro del paso 2 (1-indexado). */
  phase: number
  /** Total de fases del sub-wizard del formulario actual. */
  totalPhases: number
  /** Nombre corto de la fase, ej. "Identidad del juego". */
  phaseLabel: string
}

type CreateGameProgressContextValue = {
  subPhase: SubPhaseProgress | null
  setSubPhase: (value: SubPhaseProgress | null) => void
}

const CreateGameProgressContext = createContext<CreateGameProgressContextValue | null>(null)

/**
 * Permite que un formulario de creación (ej. GuessWhoGameForm, fragmentado en
 * fases) le informe al header del wizard (`CreateGameLayout`) en qué fase
 * está, para que "Paso X de Y" cuente también las sub-fases en vez de
 * quedarse fijo en "Paso 2 de 2" durante todo el formulario. Se limpia al
 * desmontar el formulario (cambiar de tipo de juego, volver, etc.).
 */
export function CreateGameProgressProvider({ children }: { children: ReactNode }) {
  const [subPhase, setSubPhase] = useState<SubPhaseProgress | null>(null)
  return (
    <CreateGameProgressContext.Provider value={{ subPhase, setSubPhase }}>
      {children}
    </CreateGameProgressContext.Provider>
  )
}

export function useCreateGameProgress() {
  const context = useContext(CreateGameProgressContext)
  if (!context) {
    throw new Error('useCreateGameProgress debe usarse dentro de CreateGameProgressProvider')
  }
  return context
}
