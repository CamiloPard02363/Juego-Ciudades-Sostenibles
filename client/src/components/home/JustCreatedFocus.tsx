import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, User, Users } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { TourSpotlight } from './TourSpotlight'
import { useSpotlightRect } from './tourSpotlightLayout'
import { pickCloudPlacement, CLOUD_MAX_WIDTH, type CloudSide } from './justCreatedCloudLayout'
import { summarizeCreatedGame, savedDestinationCopy, type CreatedGameKind } from './games/createdGameSummary'
import { modeColorForGameType } from './games/gameModeVisuals'

/** Selector de la tarjeta recién creada (la marca GameCard con `justCreated`). */
export const JUST_CREATED_CARD_SELECTOR = '[data-just-created="true"]'
/** Si la tarjeta no aparece en este tiempo (filtros, otro listado…) se descarta el efecto sin dejar un blur vacío. */
export const JUST_CREATED_FALLBACK_MS = 4000
/** Tiempo para que termine el scroll suave hacia la tarjeta antes de mostrar la nube. */
const SCROLL_SETTLE_MS = 450

type JustCreatedFocusProps = {
  gameTitle: string
  kind: CreatedGameKind | null
  visibility: 'private' | 'community'
  /** Cierra el efecto (botón, Escape, clic fuera) o lo descarta por fallback. */
  onClose: () => void
}

/**
 * Foco visual post-creación (issue #2): desenfoca todo menos la tarjeta del
 * juego recién creado y ancla una nube que explica qué se creó, para qué
 * sirve y dónde quedó. Reutiliza `TourSpotlight` / `useSpotlightRect` del
 * recorrido de bienvenida. Al desmontarse, `useSpotlightRect` cancela su
 * medición por cuadro.
 */
export function JustCreatedFocus({ gameTitle, kind, visibility, onClose }: JustCreatedFocusProps) {
  const { user } = useAuth()
  const rect = useSpotlightRect(JUST_CREATED_CARD_SELECTOR)
  const found = rect !== null
  const [ready, setReady] = useState(false)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [size, setSize] = useState({ width: CLOUD_MAX_WIDTH, height: 320 })
  const cloudRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasFound = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const headingId = useId()
  const descriptionId = useId()

  // Centrar la tarjeta una sola vez al encontrarla y mostrar la nube cuando el scroll asentó.
  useEffect(() => {
    if (!found || wasFound.current) return
    wasFound.current = true
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    document.querySelector(JUST_CREATED_CARD_SELECTOR)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    const timer = setTimeout(() => setReady(true), reduce ? 0 : SCROLL_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [found])

  // Fallback seguro: la tarjeta nunca apareció.
  useEffect(() => {
    if (found) return
    const timer = setTimeout(() => {
      if (!wasFound.current) onCloseRef.current()
    }, JUST_CREATED_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [found])

  // La tarjeta desapareció después de verse (ej. cambió el listado): no dejar blur vacío.
  useEffect(() => {
    if (!found && wasFound.current) onCloseRef.current()
  }, [found])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (ready) buttonRef.current?.focus()
  }, [ready])

  const placement = rect ? pickCloudPlacement(rect, size, viewport) : null

  // Medir el alto real de la nube (depende del ancho aplicado) antes de pintar.
  useLayoutEffect(() => {
    const el = cloudRef.current
    if (!el || !placement) return
    const next = { width: placement.width, height: Math.ceil(el.scrollHeight) }
    if (next.height !== size.height || Math.abs(next.width - size.width) > 1) setSize(next)
  })

  const copy = savedDestinationCopy(user?.role, visibility)
  const summary = kind ? summarizeCreatedGame(kind) : null
  const modeColor = summary ? modeColorForGameType(summary.gameType) : 'var(--accent)'
  const ModeIcon = summary?.isMultiplayer ? Users : User

  return (
    <>
      <TourSpotlight rect={rect} onBackdropClick={onClose} />
      {ready && placement && createPortal(
        <div
          role="dialog"
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
          data-testid="just-created-cloud"
          data-side={placement.side}
          className="just-created-cloud fixed z-50 rounded-2xl border border-accent bg-surface text-left text-text shadow-[var(--shadow)]"
          style={{ top: placement.top, left: placement.left, width: placement.width }}
        >
          <span aria-hidden="true" className="just-created-cloud-tail" style={tailStyle(placement.side, placement.tailOffset)} />
          <div ref={cloudRef} className="overflow-y-auto rounded-2xl p-4" style={{ maxHeight: placement.maxHeight }}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-code-bg text-accent" aria-hidden="true">
              <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 id={headingId} className="text-[16px] leading-snug tracking-tight text-text-h">{copy.heading}</h2>
              <p className="mt-0.5 text-[14px] font-semibold leading-snug break-words text-text-h">{gameTitle}</p>
            </div>
          </div>
          <div id={descriptionId}>
            {summary && (
              <>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-text">
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
                <p className="mt-2 text-[13px] leading-snug text-text-h">{summary.purpose}</p>
                <div className="mt-2 rounded-lg bg-code-bg px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-h">Cómo se juega</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-text">{summary.howTo}</p>
                </div>
              </>
            )}
            <p className="mt-2 text-[12.5px] leading-snug text-text">
              Lo encuentras aquí, en <strong className="text-text-h">{copy.destination}</strong>.
            </p>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              ref={buttonRef}
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg px-5 py-2 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              {copy.ctaLabel}
            </button>
          </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/** Cola de la nube: un rombo girado pegado al borde que mira a la tarjeta. */
function tailStyle(side: CloudSide, offset: number): CSSProperties {
  const half = 7
  switch (side) {
    case 'bottom': return { top: -half - 1, left: offset - half, borderWidth: '1px 0 0 1px' }
    case 'top': return { bottom: -half - 1, left: offset - half, borderWidth: '0 1px 1px 0' }
    case 'right': return { left: -half - 1, top: offset - half, borderWidth: '0 0 1px 1px' }
    case 'left': return { right: -half - 1, top: offset - half, borderWidth: '1px 1px 0 0' }
  }
}
