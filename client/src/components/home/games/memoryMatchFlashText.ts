import type { CardData } from './useMemoryMatchGame'

/** Frase de 4-5 palabras como máximo: se ve de un vistazo, no se lee. */
export function matchFlashText(first: CardData, second: CardData): { headline: string; detail: string } {
  if (first.badge || second.badge) {
    const [pos, neg] = first.badge === 'positive' ? [first, second] : [second, first]
    return { headline: '¡Opuestos!', detail: `${pos.title} ↔ ${neg.title}` }
  }
  const label = first.title || second.title
  return { headline: '¡Pareja!', detail: label ? `¡Es ${label}!` : '' }
}
