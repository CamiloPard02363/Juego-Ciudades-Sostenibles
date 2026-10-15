import { createContext, useContext } from 'react'

/**
 * Lo provee GameFormShell: AiGameAssistantPanel lo llama cuando la IA ya
 * llenó el formulario, para que el shell muestre el aviso de qué falta
 * completar a mano (nombre, descripción, materia). `null` fuera de un shell.
 */
export const AiDraftAppliedContext = createContext<(() => void) | null>(null)

export function useMarkAiDraftApplied(): (() => void) | null {
  return useContext(AiDraftAppliedContext)
}
