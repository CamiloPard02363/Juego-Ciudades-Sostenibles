type KidsGuideCharacterProps = {
  size?: number
  className?: string
}

/**
 * Personaje guía del Modo Kids ("Bubu"): saluda con el brazo, respira con un
 * vaivén suave, parpadea y su estrella late — todo en bucle CSS (ver
 * @keyframes kids-guide-* en index.css), sin depender de una librería de
 * animación. Se usa en `KidsWelcomeGuide` para presentar la zona de juegos,
 * pero es un componente aparte por si más adelante aparece en otras
 * pantallas del Modo Kids.
 */
export function KidsGuideCharacter({ size = 200, className }: KidsGuideCharacterProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Bubu, tu guía"
    >
      <defs>
        <radialGradient id="kg-bg-glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f4ff" />
        </radialGradient>
        <filter id="kg-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#005580" floodOpacity="0.15" />
        </filter>
      </defs>

      <rect width="400" height="400" fill="url(#kg-bg-glow)" rx="40" />
      <ellipse cx="200" cy="340" rx="70" ry="12" fill="#cbe6f7" />

      <g filter="url(#kg-shadow)" style={{ animation: 'kids-guide-bob 2.8s ease-in-out infinite', transformOrigin: '200px 250px' }}>
        {/* Piernas */}
        <rect x="175" y="270" width="16" height="45" rx="8" fill="#00b4d8" />
        <rect x="209" y="270" width="16" height="45" rx="8" fill="#00b4d8" />

        {/* Zapatos */}
        <ellipse cx="183" cy="320" rx="22" ry="14" fill="#0077b6" />
        <ellipse cx="217" cy="320" rx="22" ry="14" fill="#0077b6" />
        <ellipse cx="178" cy="314" rx="8" ry="4" fill="#ffffff" opacity="0.3" />
        <ellipse cx="212" cy="314" rx="8" ry="4" fill="#ffffff" opacity="0.3" />

        {/* Cuerpo */}
        <path d="M 155 220 Q 200 190, 245 220 L 235 290 Q 200 300, 165 290 Z" fill="#00b4d8" />
        <path d="M 200 210 L 200 295" stroke="#0096c7" strokeWidth="2.5" strokeLinecap="round" />

        {/* Brazo izquierdo saludando — gira solo, con eje en el hombro */}
        <g style={{ transformOrigin: '160px 220px', animation: 'kids-guide-wave 3.6s ease-in-out infinite' }}>
          <path
            d="M 160 220 C 120 220, 110 180, 125 160"
            fill="none"
            stroke="#00b4d8"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <circle cx="127" cy="155" r="11" fill="#ffd5ba" />
        </g>

        {/* Brazo derecho sosteniendo la estrella */}
        <path
          d="M 240 220 C 270 230, 280 260, 265 285"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <circle cx="262" cy="288" r="11" fill="#ffd5ba" />

        {/* Estrella: late y gira suavemente para sentirse un premio/logro */}
        <g style={{ transformOrigin: '262px 275px', animation: 'kids-guide-star-pulse 1.8s ease-in-out infinite' }}>
          <g transform="translate(262, 275) scale(0.6)">
            <polygon
              points="0,-25 8,-8 26,-5 13,8 16,26 0,17 -16,26 -13,8 -26,-5 -8,-8"
              fill="#FFD700"
              stroke="#DAA520"
              strokeWidth="2"
            />
            <polygon
              points="0,-25 8,-8 26,-5 13,8 16,26 0,17 -16,26 -13,8 -26,-5 -8,-8"
              fill="#ffee66"
              transform="scale(0.7)"
            />
          </g>
        </g>

        {/* Cabeza */}
        <circle cx="200" cy="155" r="68" fill="#ffd5ba" />

        {/* Gorro */}
        <path d="M 132 150 C 132 70, 268 70, 268 150 Z" fill="#00b4d8" />
        <path d="M 160 110 Q 200 90, 240 110 Q 200 135, 160 110 Z" fill="#0096c7" />
        <path d="M 132 140 C 115 190, 145 210, 150 165 Z" fill="#00b4d8" />
        <path d="M 268 140 C 285 190, 255 210, 250 165 Z" fill="#00b4d8" />

        {/* Ojos: parpadean juntos cada tanto */}
        <g style={{ transformOrigin: '178px 160px', animation: 'kids-guide-blink 4.2s ease-in-out infinite' }}>
          <circle cx="178" cy="160" r="8" fill="#111111" />
          <circle cx="175" cy="157" r="3" fill="#ffffff" />
        </g>
        <g style={{ transformOrigin: '222px 160px', animation: 'kids-guide-blink 4.2s ease-in-out infinite' }}>
          <circle cx="222" cy="160" r="8" fill="#111111" />
          <circle cx="219" cy="157" r="3" fill="#ffffff" />
        </g>

        {/* Nariz */}
        <circle cx="200" cy="172" r="4.5" fill="#f0a585" />

        {/* Mejillas */}
        <circle cx="163" cy="175" r="10" fill="#ff9999" opacity="0.6" />
        <circle cx="237" cy="175" r="10" fill="#ff9999" opacity="0.6" />

        {/* Boca sonriente */}
        <path d="M 185 186 Q 200 200, 215 186" fill="none" stroke="#a05a4a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 195 194 Q 200 200, 205 194 Z" fill="#ff6666" />
      </g>

      {/* Chispas de fondo: titilan a distinto ritmo para no verse sincronizadas */}
      <g style={{ transformOrigin: '60px 80px', animation: 'kids-guide-twinkle 1.6s ease-in-out infinite' }}>
        <circle cx="60" cy="80" r="6" fill="#ffcc00" opacity="0.8" />
      </g>
      <g style={{ transformOrigin: '340px 120px', animation: 'kids-guide-twinkle 2s ease-in-out infinite 0.3s' }}>
        <circle cx="340" cy="120" r="4" fill="#ff5588" opacity="0.8" />
      </g>
      <g style={{ transformOrigin: '90px 300px', animation: 'kids-guide-twinkle 1.8s ease-in-out infinite 0.6s' }}>
        <circle cx="90" cy="300" r="5" fill="#00cc88" opacity="0.8" />
      </g>
      <g style={{ transformOrigin: '320px 310px', animation: 'kids-guide-twinkle 2.2s ease-in-out infinite 0.9s' }}>
        <circle cx="320" cy="310" r="7" fill="#aa66cc" opacity="0.8" />
      </g>
    </svg>
  )
}
