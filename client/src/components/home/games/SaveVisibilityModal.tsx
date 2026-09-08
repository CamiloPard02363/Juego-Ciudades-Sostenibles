import { useState } from 'react'
import { Lock, Users2 } from 'lucide-react'
import { Modal } from './Modal'

type SaveVisibilityModalProps = {
  onChoose: (visibility: 'private' | 'community') => Promise<void>
}

/**
 * Aparece justo después de crear un juego (Opuestos, Pares o Quién Es): el
 * juego ya quedó guardado en DRAFT, y aquí se decide si se queda privado o
 * se publica para toda la comunidad. No tiene botón de cerrar — el juego ya
 * existe, así que hay que elegir una de las dos opciones para continuar.
 */
export function SaveVisibilityModal({ onChoose }: SaveVisibilityModalProps) {
  const [submitting, setSubmitting] = useState<'private' | 'community' | null>(null)

  async function handleChoose(visibility: 'private' | 'community') {
    setSubmitting(visibility)
    await onChoose(visibility)
  }

  return (
    <Modal onClose={() => {}} maxWidthClassName="max-w-[440px]">
      <h2 className="mb-1 text-[19px] tracking-tight text-text-h">¿Dónde quieres guardarlo?</h2>
      <p className="mb-6 text-[13px] text-text">Puedes cambiar esto más adelante desde el juego.</p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting !== null}
          onClick={() => handleChoose('private')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-code-bg text-text-h">
            <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-text-h">
              {submitting === 'private' ? 'Guardando…' : 'Guardar en mis juegos privados'}
            </span>
            <span className="text-[12px] text-text">Solo tú lo ves; compartes el código para jugar.</span>
          </span>
        </button>
        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          disabled={submitting !== null}
          onClick={() => handleChoose('community')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Users2 className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span>
            <span className="block text-[14px] font-semibold">
              {submitting === 'community' ? 'Publicando…' : 'Publicar en la comunidad'}
            </span>
            <span className="text-[12px] text-white/85">Visible para todos, con tu nombre como creador.</span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
