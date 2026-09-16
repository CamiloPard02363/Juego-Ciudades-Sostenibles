import { useState } from 'react'
import { KidsGuideEntrance } from '../../kids/KidsGuideEntrance'
import { Modal } from '../games/Modal'

type KidsWelcomeGuideProps = {
  displayName: string
  onClose: () => void
}

/**
 * Ventana de bienvenida que recibe a un STUDENT en el Modo Kids: el modal
 * aparece de inmediato con su "pop" y desenfoque de fondo de siempre (ver
 * Modal.tsx), y recién ahí Bubu llega volando dentro del recuadro
 * (KidsGuideEntrance) y saluda — el texto de bienvenida se revela cuando
 * Bubu aterriza, no antes, para que el saludo se sienta como lo primero
 * que pasa. Aparece una vez por sesión (se monta/desmonta desde
 * `KidsHomeShell`, sin persistirse en localStorage a propósito — así
 * vuelve a saludar en cada inicio de sesión, que es cuando más ayuda a un
 * niño pequeño a "no perderse").
 */
export function KidsWelcomeGuide({ displayName, onClose }: KidsWelcomeGuideProps) {
  const firstName = displayName.split(' ')[0]
  const [bubuLanded, setBubuLanded] = useState(false)

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[420px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <KidsGuideEntrance size={180} onLanded={() => setBubuLanded(true)} />

        <div
          className="relative rounded-3xl border-4 px-5 py-4 transition-all duration-300 ease-out"
          style={{
            borderColor: 'var(--accent)',
            background: 'var(--surface)',
            opacity: bubuLanded ? 1 : 0,
            transform: bubuLanded ? 'translateY(0)' : 'translateY(8px)',
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
          className="mt-1 w-full rounded-2xl px-6 py-3.5 text-[17px] font-extrabold text-white shadow-[0_10px_0_-2px_rgba(0,0,0,0.15)] transition-all duration-300 ease-out"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            opacity: bubuLanded ? 1 : 0,
            transform: bubuLanded ? 'translateY(0)' : 'translateY(8px)',
          }}
          disabled={!bubuLanded}
        >
          ¡Vamos a jugar! 🎮
        </button>
      </div>
    </Modal>
  )
}
