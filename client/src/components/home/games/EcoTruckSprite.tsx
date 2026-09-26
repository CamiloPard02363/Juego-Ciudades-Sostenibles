import type { Direction } from './mazeEngine'

/** El SVG del camión viene dibujado orientado hacia ARRIBA (0°) — de ahí este mapa. */
const ROTATION_BY_DIRECTION: Record<Direction, number> = {
  UP: 0,
  RIGHT: 90,
  DOWN: 180,
  LEFT: 270,
}

type EcoTruckSpriteProps = {
  facing: Direction
  size: number
  /** true durante el estado "Purificador" (tras una Caneca de Energía) — se ve con un aura verde. */
  energized?: boolean
  /** true mientras está bajo el efecto de una Bolsa Negra (20% más lento 1s). */
  slowed?: boolean
}

/**
 * Vista superior del camión de reciclaje que subió el profesor — misma
 * ilustración en las 4 orientaciones, rotada por CSS (el arte ya viene
 * "mirando hacia arriba"). El div exterior es el que mueve
 * `useMazeCollectorGame` con transform:translate3d; el interior es el único
 * que gira Y tiene la animación de "andando" — así ninguna de las dos
 * transformaciones se pisa con la otra.
 */
export function EcoTruckSprite({ facing, size, energized, slowed }: EcoTruckSpriteProps) {
  return (
    <div
      className="animate-[maze-truck-drive_0.5s_ease-in-out_infinite]"
      style={{
        width: size,
        height: size,
        transform: `rotate(${ROTATION_BY_DIRECTION[facing]}deg)`,
        filter: energized
          ? 'drop-shadow(0 0 6px #4ade80) drop-shadow(0 0 12px #4ade80)'
          : slowed
            ? 'saturate(0.6) brightness(0.85)'
            : undefined,
      }}
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <filter id="eco-truck-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity="0.5" />
          </filter>
          <linearGradient id="eco-truck-cabin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="eco-truck-container" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id="eco-truck-glass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="eco-truck-solar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="eco-truck-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g filter="url(#eco-truck-shadow)">
          <polygon points="60,25 30,-30 170,-30 140,25" fill="#fef08a" opacity="0.35" filter="url(#eco-truck-glow)" />
          <rect x="42" y="45" width="12" height="18" rx="3" fill="#334155" />
          <rect x="146" y="45" width="12" height="18" rx="3" fill="#334155" />
          <rect x="46" y="50" width="12" height="26" rx="4" fill="#0f172a" />
          <rect x="142" y="50" width="12" height="26" rx="4" fill="#0f172a" />
          <rect x="44" y="125" width="14" height="32" rx="4" fill="#0f172a" />
          <rect x="142" y="125" width="14" height="32" rx="4" fill="#0f172a" />

          <rect x="58" y="80" width="84" height="95" rx="6" fill="url(#eco-truck-container)" stroke="#14532d" strokeWidth="2" />
          <g stroke="#14532d" strokeWidth="2" opacity="0.4">
            <line x1="58" y1="100" x2="142" y2="100" />
            <line x1="58" y1="120" x2="142" y2="120" />
            <line x1="58" y1="140" x2="142" y2="140" />
            <line x1="58" y1="160" x2="142" y2="160" />
          </g>
          <g
            transform="translate(100, 130) scale(0.65)"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.9"
          >
            <path d="M 15,-20 L 25,-5 L 5,-5 Z" fill="#ffffff" />
            <path d="M 0,-10 C 15,-25 35,-15 35,0 C 35,10 25,20 15,20" />
            <path d="M -20,15 L -5,25 L -5,5 Z" fill="#ffffff" />
            <path d="M -10,0 C -25,15 -15,35 0,35 C 10,35 20,25 20,15" />
            <path d="M -5,-20 L -25,-15 L -15,-5 Z" fill="#ffffff" />
            <path d="M 0,10 C -15,10 -25,-10 -15,-25 C -10,-30 0,-30 10,-20" />
          </g>

          <path d="M 62,175 L 138,175 L 132,190 Q 100,195 68,190 Z" fill="#334155" stroke="#0f172a" strokeWidth="2" />
          <rect x="75" y="178" width="50" height="8" rx="2" fill="#475569" />

          <path d="M 56,82 L 144,82 L 140,35 Q 100,20 60,35 Z" fill="url(#eco-truck-cabin)" stroke="#9a3412" strokeWidth="2" />
          <path d="M 64,42 Q 100,28 136,42 L 132,58 Q 100,48 68,58 Z" fill="url(#eco-truck-glass)" stroke="#0284c7" strokeWidth="1.5" />
          <path d="M 72,40 Q 100,32 128,40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />

          <rect x="75" y="62" width="50" height="16" rx="2" fill="url(#eco-truck-solar)" stroke="#38bdf8" strokeWidth="1" />
          <line x1="100" y1="62" x2="100" y2="78" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
          <line x1="75" y1="70" x2="125" y2="70" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />

          <rect x="58" y="26" width="14" height="6" rx="2" fill="#fef08a" stroke="#f59e0b" strokeWidth="1" />
          <rect x="128" y="26" width="14" height="6" rx="2" fill="#fef08a" stroke="#f59e0b" strokeWidth="1" />

          <circle cx="100" cy="50" r="5" fill="#ef4444" filter="url(#eco-truck-glow)" />
          <circle cx="100" cy="50" r="2" fill="#ffffff" />

          <rect x="54" y="22" width="92" height="6" rx="2" fill="#475569" />
        </g>
      </svg>
    </div>
  )
}
