import { useEffect, useState } from 'react'
import { KidsGuideCharacter } from './KidsGuideCharacter'

type KidsGuideEntranceProps = {
  size?: number
  /** Se llama una sola vez, cuando Bubu termina de aterrizar (antes del saludo). */
  onLanded?: () => void
}

type Phase = 'flying' | 'greeting' | 'idle'

const FLY_IN_MS = 900
const GREETING_MS = 1600

const PARTICLES = [...Array(8)].map((_, i) => ({
  id: i,
  left: 30 + Math.sin(i * 2.4) * 34,
  top: 40 + (i % 4) * 10,
  driftX: `${Math.round(Math.sin(i * 1.7) * 40)}px`,
  delay: `${(i * FLY_IN_MS) / 18}ms`,
  size: 5 + (i % 3) * 2,
}))

/**
 * Bubu dentro del modal de bienvenida (`KidsWelcomeGuide`): llega flotando
 * desde arriba soltando un rastro de partículas amarillas, se posa y saluda
 * agitando el brazo derecho con fuerza — después queda con su vaivén de
 * siempre. Vive dentro del recuadro del modal (no en pantalla completa): el
 * "pop" y el desenfoque de fondo ya los da `Modal.tsx` al abrirse.
 */
export function KidsGuideEntrance({ size = 180, onLanded }: KidsGuideEntranceProps) {
  const [phase, setPhase] = useState<Phase>('flying')

  useEffect(() => {
    const toGreeting = setTimeout(() => {
      setPhase('greeting')
      onLanded?.()
    }, FLY_IN_MS)
    return () => clearTimeout(toGreeting)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'greeting') return
    const toIdle = setTimeout(() => setPhase('idle'), GREETING_MS)
    return () => clearTimeout(toIdle)
  }, [phase])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0"
        style={{
          animation: `kids-intro-fly-in-modal ${FLY_IN_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        }}
      >
        {phase === 'flying' &&
          PARTICLES.map((particle) => (
            <span
              key={particle.id}
              aria-hidden="true"
              className="absolute rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
                background: '#ffd23f',
                boxShadow: '0 0 6px 1px rgba(255, 210, 63, 0.7)',
                ['--particle-x' as string]: particle.driftX,
                animation: `kids-intro-particle 800ms ease-out ${particle.delay} infinite`,
              }}
            />
          ))}

        <KidsGuideCharacter size={size} rightArmWave={phase === 'greeting'} />
      </div>
    </div>
  )
}
