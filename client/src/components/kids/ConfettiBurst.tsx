import { useTheme } from '../../hooks/useTheme'

const COLORS = ['#ff7a1a', '#06b6d4', '#ffcc4d', '#ff4d6d', '#22c55e', '#a78bfa']
const PIECE_COUNT = 18

/**
 * Estímulo visual de refuerzo positivo para el modo niños: una lluvia de
 * confeti que estalla desde el centro al acertar. Sube el "engagement"
 * dándole a cada acierto una recompensa visual inmediata y llamativa, en
 * vez de solo un cambio de texto/puntaje — clave para mantener enganchados
 * a niños de 3-10 años en juegos de repetición (memoria, adivinanzas).
 *
 * `trigger` cambia (p. ej. cardas emparejadas, ronda ganada) para que React
 * remonte el burst con una key nueva y la animación se repita cada vez.
 * No renderiza nada fuera del tema 'kids'.
 */
export function ConfettiBurst({ trigger }: { trigger: number | string }) {
  const { theme } = useTheme()
  if (theme !== 'kids') return null

  return (
    <div
      key={trigger}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {[...Array(PIECE_COUNT)].map((_, i) => {
        const angle = (360 / PIECE_COUNT) * i + (i % 2 === 0 ? 6 : -6)
        const distance = 70 + (i % 4) * 22
        const dx = Math.cos((angle * Math.PI) / 180) * distance
        const dy = Math.sin((angle * Math.PI) / 180) * distance
        return (
          <span
            key={i}
            className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-sm"
            style={{
              background: COLORS[i % COLORS.length],
              animation: `kids-confetti-piece 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards`,
              // Variables por-pieza: leídas por el keyframe compartido.
              ['--kids-confetti-dx' as string]: `${dx}px`,
              ['--kids-confetti-dy' as string]: `${dy}px`,
              animationDelay: `${(i % 5) * 15}ms`,
            }}
          />
        )
      })}
    </div>
  )
}
