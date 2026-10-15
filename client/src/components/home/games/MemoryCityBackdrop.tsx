import { useTheme } from '../../../hooks/useTheme'

type Palette = {
  skyTop: string
  skyBottom: string
  orb: string
  cloud: string
  far: string
  mid: string
  near: string
  window: string
  ground: string
  tree: string
}

/** De día en los temas claro y niños; de noche (con ventanas encendidas) en el oscuro. */
const DAY: Palette = {
  skyTop: '#8fd3ff',
  skyBottom: '#e6f6ff',
  orb: '#ffd45c',
  cloud: '#ffffff',
  far: '#b8cde6',
  mid: '#8eaed6',
  near: '#5f83b8',
  window: '#e8f3ff',
  ground: '#7bc47f',
  tree: '#4f9a5b',
}

const NIGHT: Palette = {
  skyTop: '#0b1430',
  skyBottom: '#25335e',
  orb: '#f4f1d0',
  cloud: '#3a4775',
  far: '#2b3866',
  mid: '#1f2a52',
  near: '#151d3d',
  window: '#ffd66b',
  ground: '#17304a',
  tree: '#1f4a45',
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

const GROUND_Y = 860

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
            {/* Algunos techos con antena o escalón: rompen la línea recta del horizonte. */}
            {index % 3 === 0 && <rect x={x + width / 2 - 2} y={top - 26} width={4} height={26} fill={color} />}
            {index % 4 === 1 && <rect x={x + width * 0.2} y={top - 14} width={width * 0.6} height={14} fill={color} />}
            {windows &&
              Array.from({ length: Math.floor((height - 30) / 28) }).flatMap((_, row) =>
                Array.from({ length: Math.floor((width - 16) / 22) }).map((__, col) =>
                  // Patrón fijo de ventanas apagadas para que no parezca una cuadrícula perfecta.
                  (row * 7 + col * 3 + index) % 5 === 0 ? null : (
                    <rect
                      key={`${row}-${col}`}
                      x={x + 12 + col * 22}
                      y={top + 18 + row * 28}
                      width={10}
                      height={14}
                      rx={1.5}
                      fill={windowColor}
                      opacity={0.75}
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
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color} opacity={0.85}>
      <ellipse cx={0} cy={0} rx={60} ry={22} />
      <ellipse cx={-30} cy={-12} rx={30} ry={22} />
      <ellipse cx={22} cy={-18} rx={36} ry={28} />
    </g>
  )
}

/**
 * Fondo de ciudad dibujado en SVG para MatchMente: cielo, nubes que se
 * desplazan despacio, tres capas de edificios y un parque al frente. Es solo
 * decoración (aria-hidden, sin eventos) y queda detrás del tablero.
 */
export function MemoryCityBackdrop() {
  const { theme } = useTheme()
  const p = theme === 'dark' ? NIGHT : DAY
  const night = theme === 'dark'

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
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="1440" height="960" fill="url(#memory-city-sky)" />

      {night &&
        Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={(i * 137) % 1440} cy={(i * 71) % 420} r={i % 3 === 0 ? 1.8 : 1.1} fill="#ffffff" opacity={0.7} />
        ))}
      <circle cx={1180} cy={150} r={night ? 46 : 62} fill={p.orb} opacity={night ? 0.95 : 1} />

      <g style={{ animation: 'memory-city-clouds 90s linear infinite alternate' }}>
        <Cloud x={220} y={160} scale={1.2} color={p.cloud} />
        <Cloud x={640} y={110} scale={0.9} color={p.cloud} />
        <Cloud x={980} y={230} scale={1} color={p.cloud} />
      </g>

      <Layer buildings={FAR} color={p.far} windows={false} windowColor={p.window} opacity={0.9} />
      <Layer buildings={MID} color={p.mid} windows windowColor={p.window} opacity={night ? 0.7 : 0.55} />
      <Layer buildings={NEAR} color={p.near} windows windowColor={p.window} />

      <rect y={GROUND_Y} width="1440" height={960 - GROUND_Y} fill={p.ground} />
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 40 + i * 92
        return (
          <g key={i}>
            <rect x={x - 3} y={GROUND_Y - 6} width={6} height={22} fill={p.near} />
            <circle cx={x} cy={GROUND_Y - 18} r={18 + (i % 3) * 4} fill={p.tree} />
          </g>
        )
      })}
    </svg>
  )
}
