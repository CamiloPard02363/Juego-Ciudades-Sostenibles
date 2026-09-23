import type { GhostPersonality } from './mazeEngine'
import type { GhostMode } from './useMazeCollectorGame'

/**
 * Un color por personalidad (no un arcoíris de fantasmas de juguete): cada
 * nube de contaminación se reconoce por su color sin necesidad de leer su
 * nombre, igual que en el arcade original.
 */
const PERSONALITY_COLORS: Record<GhostPersonality, { body: string; dark: string }> = {
  CHASER: { body: '#78716c', dark: '#292524' }, // Smog Gris
  AMBUSHER: { body: '#a3e635', dark: '#3f6212' }, // Gas Tóxico
  PATROLLER: { body: '#b45309', dark: '#451a03' }, // Polución Industrial
  RANDOM: { body: '#eab308', dark: '#713f12' }, // Lluvia Ácida
}

const FRIGHTENED_COLOR = { body: '#bfdbfe', dark: '#1d4ed8' }

type PollutionGhostSpriteProps = {
  personality: GhostPersonality
  mode: GhostMode
  size: number
  /** true cuando ya casi se acaba el estado energizado — dispara el parpadeo de aviso. */
  warning?: boolean
}

/**
 * Nube de contaminación vista desde arriba: silueta abultada (nunca el
 * borde ondulado de un fantasma clásico — sigue siendo la amenaza
 * ambiental, no algo simpático) con dos ojos. "Asustada" se pone pálida y
 * con los ojos preocupados; "comida" son solo los ojos volviendo a casa,
 * como en el arcade original.
 */
export function PollutionGhostSprite({ personality, mode, size, warning }: PollutionGhostSpriteProps) {
  const colors = mode === 'FRIGHTENED' ? FRIGHTENED_COLOR : PERSONALITY_COLORS[personality]
  const animationClass =
    mode === 'FRIGHTENED' && warning
      ? 'animate-[maze-ghost-float_0.6s_ease-in-out_infinite,maze-ghost-frightened-flash_0.35s_step-end_infinite]'
      : 'animate-[maze-ghost-float_1.4s_ease-in-out_infinite]'

  if (mode === 'EATEN') {
    return (
      <div style={{ width: size, height: size }} className="animate-[maze-ghost-float_0.5s_ease-in-out_infinite]">
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <ellipse cx="35" cy="46" rx="9" ry="11" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
          <ellipse cx="65" cy="46" rx="9" ry="11" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
          <circle cx="36" cy="48" r="4" fill="#0f172a" />
          <circle cx="66" cy="48" r="4" fill="#0f172a" />
        </svg>
      </div>
    )
  }

  return (
    <div style={{ width: size, height: size }} className={animationClass}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <ellipse cx="50" cy="88" rx="26" ry="5" fill="#000000" opacity="0.25" />
        <path
          d="M 20,70 Q 12,45 25,28 Q 32,14 50,14 Q 68,14 75,28 Q 88,45 80,70 Q 70,80 60,72 Q 55,80 50,72 Q 45,80 40,72 Q 30,80 20,70 Z"
          fill={colors.body}
          stroke={colors.dark}
          strokeWidth="3"
        />
        <circle cx="24" cy="30" r="8" fill={colors.body} opacity="0.8" />
        <circle cx="76" cy="34" r="7" fill={colors.body} opacity="0.7" />
        <circle cx="50" cy="18" r="9" fill={colors.body} opacity="0.85" />

        {mode === 'FRIGHTENED' ? (
          <>
            <path d="M 32,46 L 42,46 M 58,46 L 68,46" stroke={colors.dark} strokeWidth="3" strokeLinecap="round" />
            <path d="M 34,60 Q 42,54 50,60 Q 58,54 66,60" stroke={colors.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="38" cy="46" rx="7" ry="9" fill="#0f172a" />
            <ellipse cx="62" cy="46" rx="7" ry="9" fill="#0f172a" />
            <circle cx="40" cy="43" r="2.4" fill="#ffffff" />
            <circle cx="64" cy="43" r="2.4" fill="#ffffff" />
          </>
        )}
      </svg>
    </div>
  )
}
