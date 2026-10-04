import { useState } from 'react'
import { CheckCircle2, Lock, Users2 } from 'lucide-react'
import { Modal } from './Modal'

type SaveVisibilityModalProps = {
  onChoose: (visibility: 'private' | 'community') => Promise<void>
  /** Se llama al aceptar el aviso "Juego guardado"; normalmente redirige al listado. */
  onDone: (visibility: 'private' | 'community') => void
}

/**
 * Aparece justo después de crear un juego (Opuestos, Pares o Quién Es): el
 * juego ya quedó guardado en DRAFT, y aquí se decide si se queda privado o
 * se publica para toda la comunidad. No tiene botón de cerrar — el juego ya
 * existe, así que hay que elegir una de las dos opciones para continuar.
 */
export function SaveVisibilityModal({ onChoose, onDone }: SaveVisibilityModalProps) {
  const [submitting, setSubmitting] = useState<'private' | 'community' | null>(null)
  const [saved, setSaved] = useState<'private' | 'community' | null>(null)

  async function handleChoose(visibility: 'private' | 'community') {
    setSubmitting(visibility)
    try {
      await onChoose(visibility)
      setSaved(visibility)
    } catch {
      setSubmitting(null)
    }
  }

  if (saved) {
    const isCommunity = saved === 'community'
    return (
      <Modal onClose={() => onDone(saved)} maxWidthClassName="max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-code-bg text-text-h">
            <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="mb-1 text-[19px] tracking-tight text-text-h">
            {isCommunity ? 'Juego guardado en Comunidad' : 'Juego guardado en Mis juegos privados'}
          </h2>
          <p className="mb-6 text-[13px] text-text">
            {isCommunity
              ? 'Ya es visible para todos. Te llevamos a Comunidad para que lo veas.'
              : 'Solo tú lo ves. Te llevamos a Mis juegos para que lo veas.'}
          </p>
          <button
            type="button"
            className="rounded-lg px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            onClick={() => onDone(saved)}
          >
            Aceptar
          </button>
        </div>
      </Modal>
    )
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
