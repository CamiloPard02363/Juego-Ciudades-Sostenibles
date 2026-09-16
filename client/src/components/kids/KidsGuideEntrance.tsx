import { useEffect, useState } from 'react'
import { KidsGuideCharacter } from './KidsGuideCharacter'

type KidsGuideEntranceProps = {
  onDone: () => void
}

type Phase = 'flying' | 'greeting' | 'leaving'

const FLY_IN_MS = 1400
const GREETING_MS = 1800
const LEAVE_MS = 450

const PARTICLES = [...Array(10)].map((_, i) => ({
  id: i,
  left: 38 + Math.sin(i * 2.4) * 42,
  top: 55 + (i % 4) * 8,
  driftX: `${Math.round(Math.sin(i * 1.7) * 60)}px`,
  delay: `${(i * FLY_IN_MS) / 22}ms`,
  size: 6 + (i % 3) * 3,
}))

/**
 * Aterrizaje de Bubu al abrir el Home del Modo Kids: entra flotando desde
 * arriba soltando un rastro de partículas amarillas, se posa en el centro
 * de la pantalla y saluda agitando el brazo derecho con fuerza antes de
 * desaparecer — inmediatamente después, `KidsHomeShell` abre el modal de
 * bienvenida de siempre (`KidsWelcomeGuide`). Puramente decorativo
 * (pointer-events-none, aria-hidden): no bloquea ninguna interacción.
 */
export function KidsGuideEntrance({ onDone }: KidsGuideEntranceProps) {
  const [phase, setPhase] = useState<Phase>('flying')

  useEffect(() => {
    const toGreeting = setTimeout(() => setPhase('greeting'), FLY_IN_MS)
    const toLeaving = setTimeout(() => setPhase('leaving'), FLY_IN_MS + GREETING_MS)
    const finish = setTimeout(onDone, FLY_IN_MS + GREETING_MS + LEAVE_MS)
    return () => {
      clearTimeout(toGreeting)
      clearTimeout(toLeaving)
      clearTimeout(finish)
    }
  }, [onDone])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          animation:
            phase === 'leaving'
              ? `kids-intro-fade-out ${LEAVE_MS}ms ease-in forwards`
              : `kids-intro-fly-in ${FLY_IN_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
        }}
      >
        {phase === 'flying' &&
          PARTICLES.map((particle) => (
            <span
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: particle.size,
                height: particle.size,
                background: '#ffd23f',
                boxShadow: '0 0 6px 1px rgba(255, 210, 63, 0.7)',
                ['--particle-x' as string]: particle.driftX,
                animation: `kids-intro-particle 900ms ease-out ${particle.delay} infinite`,
              }}
            />
          ))}

        <KidsGuideCharacter size={190} rightArmWave={phase === 'greeting'} />
      </div>
    </div>
  )
}
