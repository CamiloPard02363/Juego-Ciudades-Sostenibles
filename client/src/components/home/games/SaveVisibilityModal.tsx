import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CheckCircle2, Lock, User, Users, Users2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { Modal } from './Modal'
import { modeColorForGameType } from './gameModeVisuals'
import { summarizeCreatedGame, type CreatedGameKind } from './createdGameSummary'

type Visibility = 'private' | 'community'

type SaveVisibilityModalProps = {
  onChoose: (visibility: Visibility) => Promise<void>
  /** Se llama al continuar desde la pantalla de éxito; normalmente redirige al listado. */
  onDone: (visibility: Visibility) => void
  /** Qué formulario creó el juego: define tipo, modo y textos del resumen (issue #245). */
  gameKind: CreatedGameKind
  /** Nombre que el usuario le puso al juego. */
  gameTitle: string
}

/**
 * Aparece justo después de crear un juego (cualquiera de los 7 formularios):
 * el juego ya quedó guardado en DRAFT, y aquí se decide si se queda privado o
 * se publica para toda la comunidad. No tiene botón de cerrar — el juego ya
 * existe, así que hay que elegir una de las dos opciones para continuar.
 *
 * Tras guardar, el mismo modal pasa a una pantalla de éxito (issue #245) que
 * recuerda qué se creó, para qué sirve, cómo se juega y su modo. Un solo CTA;
 * Escape y clic fuera equivalen a él.
 */
export function SaveVisibilityModal({ onChoose, onDone, gameKind, gameTitle }: SaveVisibilityModalProps) {
  const [submitting, setSubmitting] = useState<Visibility | null>(null)
  const [saved, setSaved] = useState<Visibility | null>(null)

  async function handleChoose(visibility: Visibility) {
    setSubmitting(visibility)
    try {
      await onChoose(visibility)
      setSaved(visibility)
    } catch {
      setSubmitting(null)
    }
  }

  if (saved) {
    return <SaveSuccessScreen visibility={saved} gameKind={gameKind} gameTitle={gameTitle} onDone={() => onDone(saved)} />
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

type SaveSuccessScreenProps = {
  visibility: Visibility
  gameKind: CreatedGameKind
  gameTitle: string
  onDone: () => void
}

/**
 * Pantalla de éxito post-creación (issue #245). Mismo contenido para todos los
 * roles; solo cambia el vocabulario: "actividad" para docentes y cuentas
 * institucionales/administradoras, "juego" para estudiantes. El destino usa
 * el mismo nombre que el menú lateral ("Mis actividades" para docentes).
 */
function SaveSuccessScreen({ visibility, gameKind, gameTitle, onDone }: SaveSuccessScreenProps) {
  const { user } = useAuth()
  const role = user?.role?.toUpperCase()
  const isStudent = role === 'STUDENT'
  const isTeacher = role === 'TEACHER'
  const summary = summarizeCreatedGame(gameKind)
  const modeColor = modeColorForGameType(summary.gameType)
  const ModeIcon = summary.isMultiplayer ? Users : User

  const headingId = useId()
  const descriptionId = useId()
  const ctaRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    ctaRef.current?.focus()
  }, [])

  const destination = visibility === 'community' ? 'Comunidad' : isTeacher ? 'Mis actividades' : 'Mis juegos privados'
  const heading = isStudent ? `Juego guardado en ${destination}` : `Actividad guardada en ${destination}`
  const ctaLabel = isStudent ? 'Ver mi juego' : 'Ver mi actividad'

  // Único elemento enfocable: Tab y Shift+Tab mantienen el foco en el CTA en
  // vez de escaparse a la página de fondo.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      ctaRef.current?.focus()
    }
  }

  return (
    <Modal
      onClose={onDone}
      maxWidthClassName="max-w-[440px]"
      ariaLabelledBy={headingId}
      ariaDescribedBy={descriptionId}
    >
      <div className="flex flex-col items-center text-center" onKeyDown={handleKeyDown}>
        <span
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-code-bg text-text-h"
          aria-hidden="true"
        >
          <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 id={headingId} className="mb-3 text-[19px] leading-snug tracking-tight text-text-h">
          {heading}
        </h2>

        <div id={descriptionId} className="mb-6 flex w-full flex-col items-center">
          <p className="text-[15px] font-semibold leading-snug break-words text-text-h">{gameTitle}</p>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12.5px] text-text">
            <span>{summary.typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-semibold text-text-h"
              style={{ borderColor: modeColor, background: `${modeColor}1a` }}
            >
              <ModeIcon className="h-3 w-3" strokeWidth={2.5} style={{ color: modeColor }} aria-hidden="true" />
              {summary.isMultiplayer ? 'Multijugador' : '1 jugador'}
            </span>
          </p>
          <p className="mt-3 text-[13.5px] leading-snug text-text-h">{summary.purpose}</p>
          <div className="mt-3 w-full rounded-lg bg-code-bg px-3.5 py-2.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-h">Cómo se juega</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-text">{summary.howTo}</p>
          </div>
        </div>

        <button
          ref={ctaRef}
          type="button"
          className="min-h-11 w-full rounded-lg px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
          onClick={onDone}
        >
          {ctaLabel}
        </button>
      </div>
    </Modal>
  )
}
