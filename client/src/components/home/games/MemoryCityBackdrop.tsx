import { useTheme } from '../../../hooks/useTheme'

type Palette = {
  skyTop: string
  skyMid: string
  skyBottom: string
  star: string
  starOpacity: number
  cloud: string
  hills: string
  far: string
  mid: string
  near: string
  window: string
  ground: string
  tree: string
  lamp: string
}

/**
 * Siempre es de noche, con estrellas y luna llena. En los temas claro y niños
 * es un anochecer suave (azul lavanda que baja a durazno); en el oscuro, una
 * noche profunda.
 */
const DUSK: Palette = {
  skyTop: '#2a3a7a',
  skyMid: '#6f6fb8',
  skyBottom: '#f6c9b0',
  star: '#ffffff',
  starOpacity: 0.85,
  cloud: '#c9c4ec',
  hills: '#8a86c4',
  far: '#9a98cf',
  mid: '#7471b0',
  near: '#4d4a86',
  window: '#ffe08a',
  ground: '#3f6f6a',
  tree: '#2f5a55',
  lamp: '#ffe9a8',
}

const NIGHT: Palette = {
  skyTop: '#050a1f',
  skyMid: '#111c44',
  skyBottom: '#2b3768',
  star: '#ffffff',
  starOpacity: 1,
  cloud: '#2c3866',
  hills: '#1a2450',
  far: '#243063',
  mid: '#1a2350',
  near: '#11183a',
  window: '#ffd66b',
  ground: '#102438',
  tree: '#17383c',
  lamp: '#ffd97a',
}

/** Edificios de cada capa: [x, ancho, alto]. Fijos para que el fondo no cambie entre partidas. */
const FAR: [number, number, number][] = [
  [0, 70, 210], [65, 55, 260], [115, 80, 190], [190, 60, 300], [245, 90, 230], [330, 50, 280],
  [375, 85, 200], [455, 65, 320], [515, 95, 240], [605, 55, 270], [655, 80, 210], [730, 70, 300],
  [795, 90, 250], [880, 60, 220], [935, 85, 290], [1015, 70, 230], [1080, 90, 270], [1165, 60, 200],
  [1220, 80, 310], [1295, 75, 240], [1365, 75, 280],
]
const MID: [number, number, number][] = [
  [-10, 90, 170], [85, 70, 220], [150, 100, 150], [245, 75, 240], [315, 110, 180], [420, 70, 210],
  [485, 95, 160], [575, 80, 250], [650, 110, 170], [755, 75, 220], [825, 100, 190], [920, 80, 240],
  [995, 110, 160], [1100, 75, 210], [1170, 95, 180], [1260, 85, 230], [1340, 110, 170],
]
const NEAR: [number, number, number][] = [
  [-20, 120, 120], [95, 90, 160], [180, 130, 105], [305, 95, 145], [395, 140, 115], [530, 100, 170],
  [625, 135, 110], [755, 95, 150], [845, 140, 120], [980, 100, 165], [1075, 135, 110], [1205, 100, 150],
  [1300, 150, 125],
]

/** Estrellas con posición pseudoaleatoria fija (sin Math.random: no "saltan" al re-renderizar). */
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: (i * 157 + (i % 7) * 31) % 1440,
  y: (i * 89 + (i % 5) * 43) % 520,
  r: i % 9 === 0 ? 2.2 : i % 3 === 0 ? 1.5 : 1,
  twinkle: i % 4 === 0,
  delay: (i % 6) * 0.7,
}))

const GROUND_Y = 860
const MOON = { x: 1150, y: 170, r: 58 }

function Layer({ buildings, color, windows, windowColor, opacity = 1 }: {
  buildings: [number, number, number][]
  color: string
  windows: boolean
  windowColor: string
  opacity?: number
}) {
  return (
    <g opacity={opacity}>
      {buildings.map(([x, width, height], index) => {
        const top = GROUND_Y - height
        return (
          <g key={index}>
            <rect x={x} y={top} width={width} height={height} fill={color} />
            {/* Algunos techos con antena (y luz roja) o escalón: rompen la línea del horizonte. */}
            {index % 3 === 0 && (
              <>
                <rect x={x + width / 2 - 2} y={top - 26} width={4} height={26} fill={color} />
                <circle
                  cx={x + width / 2}
                  cy={top - 28}
                  r={3}
                  fill="#ff5a5a"
                  style={{ animation: `memory-city-twinkle 2.4s ease-in-out ${index * 0.3}s infinite` }}
                />
              </>
            )}
            {index % 4 === 1 && <rect x={x + width * 0.2} y={top - 14} width={width * 0.6} height={14} fill={color} />}
            {windows &&
              Array.from({ length: Math.floor((height - 30) / 28) }).flatMap((_, row) =>
                Array.from({ length: Math.floor((width - 16) / 22) }).map((__, col) =>
                  // Patrón fijo de ventanas apagadas para que no parezca una cuadrícula perfecta.
                  (row * 7 + col * 3 + index) % 4 === 0 ? null : (
                    <rect
                      key={`${row}-${col}`}
                      x={x + 12 + col * 22}
                      y={top + 18 + row * 28}
                      width={10}
                      height={14}
                      rx={1.5}
                      fill={windowColor}
                      opacity={(row + col + index) % 3 === 0 ? 0.45 : 0.85}
                    />
                  ),
                ),
              )}
          </g>
        )
      })}
    </g>
  )
}

function Cloud({ x, y, scale, color }: { x: number; y: number; scale: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color} opacity={0.55}>
      <ellipse cx={0} cy={0} rx={60} ry={18} />
      <ellipse cx={-30} cy={-10} rx={30} ry={18} />
      <ellipse cx={22} cy={-14} rx={36} ry={22} />
    </g>
  )
}

/**
 * Fondo de ciudad dibujado en SVG para MatchMente: cielo estrellado con luna
 * llena, estrella fugaz, nubes que pasan despacio, colinas, tres capas de
 * edificios con ventanas encendidas y un parque con faroles al frente. Es
 * solo decoración (aria-hidden, sin eventos) y queda detrás del tablero.
 */
export function MemoryCityBackdrop() {
  const { theme } = useTheme()
  const p = theme === 'dark' ? NIGHT : DUSK

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full"
      viewBox="0 0 1440 960"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="memory-city-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="55%" stopColor={p.skyMid} />
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
        <radialGradient id="memory-city-moon-glow">
          <stop offset="0%" stopColor="#fff8dc" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fff8dc" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="memory-city-moon" cx="40%" cy="38%">
          <stop offset="0%" stopColor="#fffdf0" />
          <stop offset="100%" stopColor="#ece4c4" />
        </radialGradient>
        <radialGradient id="memory-city-lamp-glow">
          <stop offset="0%" stopColor={p.lamp} stopOpacity={0.7} />
          <stop offset="100%" stopColor={p.lamp} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="1440" height="960" fill="url(#memory-city-sky)" />

      {/* Estrellas: algunas titilan. */}
      {STARS.map((star, i) => (
        <circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill={p.star}
          opacity={p.starOpacity * (star.r > 1.4 ? 1 : 0.7)}
          style={star.twinkle ? { animation: `memory-city-twinkle 3s ease-in-out ${star.delay}s infinite` } : undefined}
        />
      ))}
      {/* Estrellas grandes en forma de destello. */}
      {[[220, 90], [610, 60], [880, 140], [1340, 80], [420, 230]].map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y - 8} L${x + 2} ${y - 2} L${x + 8} ${y} L${x + 2} ${y + 2} L${x} ${y + 8} L${x - 2} ${y + 2} L${x - 8} ${y} L${x - 2} ${y - 2} Z`}
          fill={p.star}
          style={{ animation: `memory-city-twinkle 4s ease-in-out ${i * 0.8}s infinite` }}
        />
      ))}
      {/* Estrella fugaz que cruza de vez en cuando. */}
      <line
        x1={0}
        y1={0}
        x2={90}
        y2={30}
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{ animation: 'memory-city-shooting-star 9s ease-in 2s infinite' }}
      />

      {/* Luna llena con halo y cráteres. */}
      <circle cx={MOON.x} cy={MOON.y} r={MOON.r * 2.6} fill="url(#memory-city-moon-glow)" />
      <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill="url(#memory-city-moon)" />
      <g fill="#d9cfa8" opacity={0.6}>
        <circle cx={MOON.x - 18} cy={MOON.y - 14} r={11} />
        <circle cx={MOON.x + 20} cy={MOON.y + 8} r={8} />
        <circle cx={MOON.x - 6} cy={MOON.y + 24} r={6} />
        <circle cx={MOON.x + 14} cy={MOON.y - 26} r={4.5} />
      </g>

      <g style={{ animation: 'memory-city-clouds 90s linear infinite alternate' }}>
        <Cloud x={220} y={300} scale={1.2} color={p.cloud} />
        <Cloud x={700} y={250} scale={0.9} color={p.cloud} />
        <Cloud x={1000} y={330} scale={1} color={p.cloud} />
      </g>

      {/* Colinas lejanas detrás de la ciudad. */}
      <path d={`M0 ${GROUND_Y - 170} Q 240 ${GROUND_Y - 300} 480 ${GROUND_Y - 190} T 960 ${GROUND_Y - 200} T 1440 ${GROUND_Y - 180} V ${GROUND_Y} H0 Z`} fill={p.hills} opacity={0.7} />

      <Layer buildings={FAR} color={p.far} windows={false} windowColor={p.window} opacity={0.9} />
      <Layer buildings={MID} color={p.mid} windows windowColor={p.window} opacity={0.75} />
      <Layer buildings={NEAR} color={p.near} windows windowColor={p.window} />

      <rect y={GROUND_Y} width="1440" height={960 - GROUND_Y} fill={p.ground} />
      {/* Parque: árboles y faroles encendidos alternados. */}
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 40 + i * 92
        if (i % 4 === 2) {
          return (
            <g key={i}>
              <circle cx={x} cy={GROUND_Y - 44} r={26} fill="url(#memory-city-lamp-glow)" />
              <rect x={x - 2} y={GROUND_Y - 44} width={4} height={60} fill={p.near} />
              <circle cx={x} cy={GROUND_Y - 46} r={6} fill={p.lamp} />
            </g>
          )
        }
        return (
          <g key={i}>
            <rect x={x - 3} y={GROUND_Y - 6} width={6} height={22} fill={p.near} />
            <circle cx={x} cy={GROUND_Y - 18} r={18 + (i % 3) * 4} fill={p.tree} />
          </g>
        )
      })}
      {/* Luciérnagas sobre el pasto. */}
      {[[130, 905], [390, 925], [610, 900], [880, 930], [1120, 910], [1330, 925]].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2.5}
          fill="#fff3a0"
          style={{ animation: `memory-city-twinkle 2.2s ease-in-out ${i * 0.5}s infinite` }}
        />
      ))}
    </svg>
  )
}
