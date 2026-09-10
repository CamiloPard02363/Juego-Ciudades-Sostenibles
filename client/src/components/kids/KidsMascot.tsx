import { useTheme } from '../../hooks/useTheme'

/**
 * Mascota flotante del modo niños: un solecito con carita amigable que
 * saluda desde la esquina, fijo en toda la app (se monta una sola vez en
 * HomeLayout). Puramente decorativa (pointer-events-none, aria-hidden) —
 * el objetivo es dar un "personaje" reconocible que acompañe a niños de
 * 3-10 años en vez de una interfaz sin rostro, reforzando que este modo es
 * "para ellos" en cada pantalla, no solo en la pantalla de temas.
 * No se renderiza en ningún otro tema.
 */
export function KidsMascot() {
  const { theme } = useTheme()
  if (theme !== 'kids') return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-4 bottom-4 z-40 hidden sm:block"
      style={{ animation: 'kids-mascot-bob 3.2s ease-in-out infinite' }}
    >
      <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
        <g style={{ transformOrigin: '50px 92px', animation: 'kids-mascot-sway 3.2s ease-in-out infinite' }}>
          {[...Array(8)].map((_, i) => (
            <rect
              key={i}
              x="47"
              y="6"
              width="6"
              height="18"
              rx="3"
              fill="#ffb020"
              transform={`rotate(${i * 45} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="26" fill="#ffcc4d" stroke="#e8960a" strokeWidth="3" />
          <circle cx="41" cy="46" r="4" fill="#3a2a6d" />
          <circle cx="59" cy="46" r="4" fill="#3a2a6d" />
          <path
            d="M39 58c4 6 18 6 22 0"
            stroke="#3a2a6d"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="33" cy="54" r="4" fill="#ff7a1a" opacity="0.55" />
          <circle cx="67" cy="54" r="4" fill="#ff7a1a" opacity="0.55" />
        </g>
      </svg>
    </div>
  )
}
