import { KidsGuideCharacter } from '../../kids/KidsGuideCharacter'
import { Modal } from '../games/Modal'

type KidsWelcomeGuideProps = {
  displayName: string
  onClose: () => void
}

/**
 * Ventana de bienvenida que recibe a un STUDENT en el Modo Kids: Bubu se
 * presenta y explica, con pocas palabras y un dibujo animado en vez de un
 * párrafo, que esta zona es para jugar y aprender. Aparece una vez por
 * sesión (se monta/desmonta desde `KidsHomeShell`, sin persistirse en
 * localStorage a propósito — así vuelve a saludar en cada inicio de
 * sesión, que es cuando más ayuda un niño pequeño a "no perderse").
 */
export function KidsWelcomeGuide({ displayName, onClose }: KidsWelcomeGuideProps) {
  const firstName = displayName.split(' ')[0]

  return (
    <Modal onClose={onClose} maxWidthClassName="max-w-[420px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <KidsGuideCharacter size={180} />

        <div
          className="relative rounded-3xl border-4 px-5 py-4"
          style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}
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
          className="mt-1 w-full rounded-2xl px-6 py-3.5 text-[17px] font-extrabold text-white shadow-[0_10px_0_-2px_rgba(0,0,0,0.15)]"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          ¡Vamos a jugar! 🎮
        </button>
      </div>
    </Modal>
  )
}
