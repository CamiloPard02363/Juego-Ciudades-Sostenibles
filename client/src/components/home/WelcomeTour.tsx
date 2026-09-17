import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Compass, Gamepad2, Plus, UserRound, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AuthUser } from '../../services/auth.service'
import { getWelcomeSteps, hasSeenWelcome, markWelcomeSeen, welcomeStorageKey } from './welcomeTourSteps'

const icons = { play: Gamepad2, create: Plus, explore: Compass, profile: UserRound }

/**
 * La primera vez que una cuenta entra, el botón "Guía" se vuelve obligatorio:
 * el resto de la pantalla se ve desenfocada y bloqueada (el overlay absorbe
 * los clics) hasta que la persona hace clic en el botón — no hay "Ahora no"
 * ni Escape para saltárselo, así todo el mundo pasa por el recorrido al
 * menos una vez. Una vez iniciado el recorrido en sí (paso a paso) sigue
 * siendo cerrable con la X o Escape, como antes.
 */
export function WelcomeTour({ user }: { user: AuthUser }) {
  const location = useLocation()
  const navigate = useNavigate()
  const storageKey = welcomeStorageKey(user.id, user.role)
  const [phase, setPhase] = useState<'invite' | 'tour' | 'closed'>(() => hasSeenWelcome(storageKey) ? 'closed' : 'invite')
  const [index, setIndex] = useState(0)
  const [previousRoute, setPreviousRoute] = useState(location.key)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const steps = getWelcomeSteps(user.role)
  const step = steps[index]
  // No interrumpir enlaces a juegos, salas ni otras secciones.
  const atHome = location.pathname === '/' && !location.search
  const visible = atHome && phase !== 'closed'
  // Momento obligatorio: solo antes de que la persona inicie el recorrido.
  const forcedInvite = visible && phase === 'invite'

  // Reiniciar solo al cambiar de ruta evita reabrir pasos al volver con el navegador.
  if (previousRoute !== location.key) {
    setPreviousRoute(location.key)
    if (!atHome && phase === 'tour') setPhase('closed')
  }

  const close = useCallback((restoreFocus = true) => {
    markWelcomeSeen(storageKey)
    setPhase('closed')
    if (restoreFocus) triggerRef.current?.focus()
  }, [storageKey])

  useEffect(() => {
    // El paso obligatorio (fase "invite") no se puede saltar con Escape;
    // una vez dentro del recorrido paso a paso sí, como siempre.
    if (!visible || phase !== 'tour') return
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [visible, phase, close])

  useEffect(() => {
    if (!visible || phase !== 'tour') return
    headingRef.current?.focus({ preventScroll: true })
    const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    target?.setAttribute('data-tour-active', 'true')
    target?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
    // Interactuar con la aplicación termina la guía sin impedir ese clic.
    const onUseTarget = () => close(false)
    target?.addEventListener('click', onUseTarget)
    return () => {
      target?.removeAttribute('data-tour-active')
      target?.removeEventListener('click', onUseTarget)
    }
  }, [visible, phase, step.target, index, close])

  function start() {
    markWelcomeSeen(storageKey)
    setIndex(0)
    setPhase('tour')
    if (!atHome) navigate('/')
  }

  function tryAction() {
    const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    close(false)
    if (target?.matches('button')) {
      target.focus()
      target.click()
    } else {
      const firstButton = target?.querySelector<HTMLButtonElement>('button')
      if (firstButton) firstButton.focus()
      else triggerRef.current?.focus()
    }
  }

  const Icon = icons[step.icon]
  return <>
    {/* Bloquea y desenfoca todo lo demás mientras el botón sigue arriba, ya
        elevado en z-index, así que es lo único clicable en la pantalla. */}
    {forcedInvite && (
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" aria-hidden="true" />
    )}

    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={start}
        aria-label="Repetir recorrido de bienvenida"
        data-tour-active={forcedInvite ? 'true' : undefined}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-linear-to-r px-3 py-2 text-sm font-semibold shadow-md hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${user.role === 'STUDENT' ? 'border-orange-400 from-amber-200 to-orange-300 text-[#3a2a6d] shadow-orange-400/30' : 'border-violet-500 from-violet-600 to-fuchsia-700 text-white shadow-violet-500/25'} ${forcedInvite ? 'relative z-50' : ''}`}
      >
        <Compass className="h-4 w-4" aria-hidden="true" /> Guía
      </button>

      {forcedInvite && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-full left-1/2 z-50 mt-3 w-[200px] -translate-x-1/2 animate-bounce text-center"
        >
          <span className="mx-auto block h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-accent" />
          <span className="block rounded-xl bg-accent px-3 py-2 text-[13px] font-semibold text-white shadow-lg">
            Haz clic aquí para aprender a usar NexusPlay
          </span>
        </div>
      )}
    </div>

    {visible && phase === 'tour' && createPortal(
      <section aria-label="Recorrido de NexusPlay" className="welcome-tour-card fixed right-3 bottom-3 z-40 w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-3xl border border-border bg-surface p-5 text-left text-text shadow-[var(--shadow)] sm:right-6 sm:bottom-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Icon className="h-6 w-6" aria-hidden="true" /></span>
          <span className="flex-1 text-xs font-semibold text-accent">{index + 1} de {steps.length} · A tu ritmo</span>
          <button type="button" onClick={() => close()} aria-label="Cerrar recorrido" className="rounded-full p-2 text-text hover:bg-code-bg focus-visible:outline-2 focus-visible:outline-accent"><X className="h-5 w-5" /></button>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-text-h outline-none">{step.title}</h2>
          <p className="mt-2 text-sm leading-relaxed">{step.text}</p>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">{steps.map((item, i) => <span key={item.title} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-code-bg'}`} />)}</div>
        {step.action && <button type="button" onClick={tryAction} className="mt-4 w-full rounded-xl border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10">{step.action} ↗</button>}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="rounded-lg px-2 py-2 text-sm hover:bg-code-bg disabled:opacity-40">Atrás</button>
          <button type="button" onClick={() => index === steps.length - 1 ? close() : setIndex(index + 1)} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            {index === steps.length - 1 ? '¡Listo!' : 'Siguiente'}
          </button>
        </div>
      </section>, document.body,
    )}
  </>
}
