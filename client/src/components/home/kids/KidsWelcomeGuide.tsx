import { useState } from 'react'
import { FLY_IN_MS, KidsGuideEntrance } from '../../kids/KidsGuideEntrance'
import { Modal } from '../games/Modal'

type KidsWelcomeGuideProps = {
  displayName: string
  onClose: () => void
}

/**
 * Ventana de bienvenida que recibe a un STUDENT en el Modo Kids: el modal
 * aparece de inmediato con su "pop" y desenfoque de fondo de siempre (ver
 * Modal.tsx). Bubu (KidsGuideEntrance), el cartel de bienvenida y el botón
 * entran los tres a la vez, con la misma duración/curva (`FLY_IN_MS`, ver
 * kids-intro-card-in en index.css), para que se sientan como una sola
 * animación en vez de piezas desfasadas; el botón sí sigue deshabilitado
 * hasta que Bubu aterrice y salude (`onLanded`) — solo su entrada visual
 * está sincronizada, no su habilitación. Aparece una vez por sesión (se
 * monta/desmonta desde `KidsHomeShell`, sin persistirse en localStorage a
 * propósito — así vuelve a saludar en cada inicio de sesión, que es cuando
 * más ayuda a un niño pequeño a "no perderse").
 */
export function KidsWelcomeGuide({ displayName, onClose }: KidsWelcomeGuideProps) {
  const firstName = displayName.split(' ')[0]
  const [bubuLanded, setBubuLanded] = useState(false)

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[420px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <KidsGuideEntrance size={180} onLanded={() => setBubuLanded(true)} />

        <div
          className="relative rounded-3xl border-4 px-5 py-4"
          style={{
            borderColor: 'var(--accent)',
            background: 'var(--surface)',
            animation: `kids-intro-card-in ${FLY_IN_MS}ms cubic-bezier(0.22, 0.9, 0.32, 1) forwards`,
          }}
        >
          <p className="text-[19px] leading-snug font-extrabold text-text-h">¡Hola, {firstName}! 👋 Soy Bubu</p>
          <p className="mt-2 text-[15px] leading-relaxed text-text">
            En esta zona puedes <strong className="text-text-h">jugar y aprender</strong> tocando tus materias.
            ¡Elige un mundo para empezar la aventura! 🚀
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-1 w-full rounded-2xl px-6 py-3.5 text-[17px] font-extrabold text-white shadow-[0_10px_0_-2px_rgba(0,0,0,0.15)] ${
            bubuLanded ? 'kids-cta-wiggle-always' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            animation: `kids-intro-card-in ${FLY_IN_MS}ms cubic-bezier(0.22, 0.9, 0.32, 1) forwards`,
          }}
          disabled={!bubuLanded}
        >
          ¡Vamos a jugar! 🎮
        </button>
      </div>
    </Modal>
  )
}
