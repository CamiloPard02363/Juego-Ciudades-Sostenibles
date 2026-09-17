import { useId } from 'react'

type KidsPlanetIconProps = {
  size?: number
  className?: string
}

/**
 * Planeta kawaii que representa cada "mundo" (materia) en `KidsWorldGrid`,
 * reemplazando la burbuja de color + ícono de antes. Los ids de gradiente/
 * clip-path se generan con `useId` porque el grid renderiza varias
 * instancias a la vez y los ids de un `<defs>` de SVG son globales al DOM.
 */
export function KidsPlanetIcon({ size = 80, className }: KidsPlanetIconProps) {
  const uid = useId()
  const gradId = `kids-planet-grad-${uid}`
  const shadowId = `kids-planet-shadow-${uid}`
  const clipId = `kids-planet-clip-${uid}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Planeta"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4fc3f7" />
          <stop offset="70%" stopColor="#0288d1" />
          <stop offset="100%" stopColor="#01579b" />
        </radialGradient>

        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.2" />
        </filter>

        <clipPath id={clipId}>
          <circle cx="250" cy="260" r="110" />
        </clipPath>
      </defs>

      <g filter={`url(#${shadowId})`}>
        {/* Cuerpo base del planeta */}
        <circle cx="250" cy="260" r="110" fill={`url(#${gradId})`} stroke="#01579b" strokeWidth="3" />
      </g>

      {/* Continentes estilizados */}
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M 170 310 Q 220 370 290 320 Q 330 290 310 240 Q 270 220 220 250 Q 160 250 170 310 Z"
          fill="#2ecc71"
          opacity="0.9"
        />
        <path
          d="M 230 180 Q 280 150 310 190 Q 340 230 290 240 Q 240 250 230 180 Z"
          fill="#27ae60"
          opacity="0.9"
        />
      </g>

      {/* Órbita / Anillo brillante sutil */}
      <path d="M 100 250 Q 250 210 400 250" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" opacity="0.85" />

      {/* Plantita brotando en el polo superior */}
      <g transform="translate(250, 150)">
        <rect x="-3" y="0" width="6" height="15" fill="#795548" rx="2" stroke="#3e2723" strokeWidth="1.5" />
        <path d="M 0 0 C -15 -10, -20 -25, -5 -25 C 5 -25, 0 -10, 0 0 Z" fill="#2ecc71" stroke="#3e2723" strokeWidth="1.5" />
        <path d="M 0 0 C 15 -10, 20 -25, 5 -25 C -5 -25, 0 -10, 0 0 Z" fill="#27ae60" stroke="#3e2723" strokeWidth="1.5" />
      </g>

      {/* Cara kawaii del planeta */}
      <g transform="translate(250, 260)">
        <circle cx="-26" cy="-2" r="5.5" fill="#2f3542" />
        <circle cx="-28" cy="-4" r="2" fill="#ffffff" />

        <circle cx="26" cy="-2" r="5.5" fill="#2f3542" />
        <circle cx="24" cy="-4" r="2" fill="#ffffff" />

        <path d="M -8 8 Q 0 16 8 8" fill="none" stroke="#2f3542" strokeWidth="3.5" strokeLinecap="round" />

        <circle cx="-35" cy="5" r="5" fill="#ff7675" opacity="0.85" />
        <circle cx="35" cy="5" r="5" fill="#ff7675" opacity="0.85" />
      </g>
    </svg>
  )
}
