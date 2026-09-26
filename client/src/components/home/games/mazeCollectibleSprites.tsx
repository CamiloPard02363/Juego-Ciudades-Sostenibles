/**
 * Coleccionables del laberinto — versiones simplificadas del arte que
 * mandó el profesor (botella PET, caneca verde, bolsa negra, celular
 * e-waste), livianas para poder repetirse decenas de veces por tablero sin
 * pesar el DOM.
 */

export function PetSprite({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size }} className="animate-[maze-pet-bob_1.8s_ease-in-out_infinite]">
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <path d="M9 3h6v2.5l2 3V21a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8.5l2-3Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.2" />
        <rect x="9" y="11" width="6" height="3" fill="#22c55e" />
        <path d="M10 9.5l2-1.5 2 1.5" stroke="#ffffff" strokeWidth="1" fill="none" />
      </svg>
    </div>
  )
}

export function PowerPelletSprite({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, color: '#4ade80' }} className="animate-[maze-pellet-pulse_1s_ease-in-out_infinite]">
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <path
          d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
          fill="currentColor"
          stroke="#14532d"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  )
}

export function TrashBagSprite({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size }} className="animate-[maze-bag-jitter_0.4s_ease-in-out_infinite]">
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <path
          d="M7 8c-1.5 3-2 6-1.5 9 .3 2 2 3 6.5 3s6.2-1 6.5-3c.5-3 0-6-1.5-9-2 .6-3 .6-5 0-2 .6-3 .6-5 0Z"
          fill="#1e293b"
          stroke="#020617"
          strokeWidth="1"
        />
        <path d="M9.5 8 8 4l4 1.5L16 4l-1.5 4" fill="#0f172a" stroke="#020617" strokeWidth="1" />
      </svg>
    </div>
  )
}

export function BonusSprite({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size }} className="animate-[maze-bonus-spark_0.9s_ease-in-out_infinite]">
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <rect x="6" y="2" width="12" height="20" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
        <rect x="7.5" y="4.5" width="9" height="14" rx="1" fill="#0f172a" />
        <path d="M9 8l3 2-1 1.5 3 2-4.5 4.5 1-4-3-2 1.5-1.5-3-1Z" fill="#fef08a" />
        <circle cx="12" cy="20" r="0.9" fill="#334155" />
      </svg>
    </div>
  )
}
