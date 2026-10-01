type RoleCharacterIllustrationProps = {
  variant: 'student' | 'teacher'
  className?: string
}

/**
 * Personaje ilustrado en SVG inline (sin librería de animación: el proyecto
 * no usa Framer Motion ni Lottie). "student" lleva morral y birrete;
 * "teacher" lleva corbata y porta un puntero/tablero.
 */
export function RoleCharacterIllustration({ variant, className }: RoleCharacterIllustrationProps) {
  const isStudent = variant === 'student'

  return (
    <svg
      viewBox="0 0 160 200"
      className={className}
      role="img"
      aria-label={isStudent ? 'Personaje estudiante' : 'Personaje profesor'}
    >
      {/* sombra */}
      <ellipse cx="80" cy="188" rx="46" ry="8" fill="currentColor" opacity="0.08" />

      {/* piernas */}
      <rect x="62" y="140" width="14" height="42" rx="6" fill="var(--accent-2)" />
      <rect x="84" y="140" width="14" height="42" rx="6" fill="var(--accent-2)" />

      {/* zapatos */}
      <rect x="58" y="176" width="22" height="10" rx="5" fill="var(--text-h)" opacity="0.85" />
      <rect x="80" y="176" width="22" height="10" rx="5" fill="var(--text-h)" opacity="0.85" />

      {/* torso */}
      <rect
        x="50"
        y="92"
        width="60"
        height="54"
        rx="18"
        fill={isStudent ? 'var(--accent)' : '#2b3a55'}
      />

      {isStudent ? (
        <>
          {/* morral de estudiante */}
          <rect x="100" y="98" width="20" height="34" rx="8" fill="var(--accent-2)" />
          <rect x="104" y="92" width="12" height="10" rx="4" fill="var(--accent-2)" />
        </>
      ) : (
        <>
          {/* corbata de profesor */}
          <path d="M80 92 L88 104 L80 118 L72 104 Z" fill="var(--accent-2)" />
          {/* puntero/tablero */}
          <rect x="106" y="108" width="34" height="24" rx="3" fill="#e8edf5" stroke="#2b3a55" strokeWidth="2" />
          <line x1="112" y1="116" x2="134" y2="116" stroke="#2b3a55" strokeWidth="2" />
          <line x1="112" y1="124" x2="128" y2="124" stroke="#2b3a55" strokeWidth="2" />
        </>
      )}

      {/* brazos */}
      <rect x="36" y="98" width="16" height="36" rx="8" fill={isStudent ? 'var(--accent)' : '#2b3a55'} />
      <rect x="98" y="98" width="16" height="36" rx="8" fill={isStudent ? 'var(--accent)' : '#2b3a55'} />

      {/* cabeza */}
      <circle cx="80" cy="66" r="28" fill="#f3c9a0" />

      {/* cabello */}
      <path d="M52 60 Q52 32 80 32 Q108 32 108 60 Q108 46 80 46 Q52 46 52 60 Z" fill="#4a3324" />

      {/* ojos */}
      <circle cx="70" cy="66" r="3.2" fill="#2b2b2b" />
      <circle cx="90" cy="66" r="3.2" fill="#2b2b2b" />

      {/* sonrisa */}
      <path d="M70 76 Q80 84 90 76" stroke="#8a4b32" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {isStudent ? (
        /* birrete de graduación */
        <g>
          <rect x="54" y="30" width="52" height="8" rx="3" fill="#2b3a55" />
          <path d="M44 32 L80 18 L116 32 L80 44 Z" fill="#2b3a55" />
          <line x1="110" y1="30" x2="118" y2="50" stroke="#2b3a55" strokeWidth="2" />
          <circle cx="118" cy="52" r="3.5" fill="var(--accent)" />
        </g>
      ) : (
        /* gafas de profesor */
        <g stroke="#2b2b2b" strokeWidth="2" fill="none">
          <circle cx="70" cy="66" r="8" />
          <circle cx="90" cy="66" r="8" />
          <line x1="78" y1="66" x2="82" y2="66" />
        </g>
      )}
    </svg>
  )
}
