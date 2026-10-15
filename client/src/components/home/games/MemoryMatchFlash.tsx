import { useEffect, useState } from 'react'
import type { LastMatch } from './useMemoryMatchGame'
import { matchFlashText } from './memoryMatchFlashText'

const FLASH_MS = 1300
/** En Opuestos, el aviso que queda tras cerrar la explicación dura más, para alcanzar a verlo. */
const OPPOSITES_FLASH_MS = 2500

function flashDuration(match: LastMatch): number {
  return match.first.badge || match.second.badge ? OPPOSITES_FLASH_MS : FLASH_MS
}
const BURST_COLORS = ['#ff7a1a', '#06b6d4', '#ffcc4d', '#ff4d6d', '#22c55e', '#a78bfa']

/**
 * Destello que explica el acierto sin párrafos: el concepto en grande, una
 * frase corta y una explosión de color.
 *
 * - Parejas: no bloquea clics (pointer-events-none) y se va solo en ~1,3 s.
 * - Opuestos (`onContinue`): el juego queda en pausa y la tarjeta muestra
 *   también la descripción de cada concepto; se cierra con "¡Seguir!" (o
 *   Enter / Espacio / Esc) y ahí el reloj sigue.
 */
export function MemoryMatchFlash({
  match,
  primaryColor,
  onContinue,
}: {
  match: LastMatch | null
  primaryColor: string
  onContinue?: () => void
}) {
  // Cada acierto trae una `key` nueva: se muestra hasta que su temporizador la oculta.
  const [hiddenKey, setHiddenKey] = useState<number | null>(null)

  useEffect(() => {
    if (!match || onContinue) return
    const timeout = setTimeout(() => setHiddenKey(match.key), flashDuration(match))
    return () => clearTimeout(timeout)
  }, [match, onContinue])

  useEffect(() => {
    if (!onContinue) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault()
        onContinue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  if (!match || (!onContinue && hiddenKey === match.key)) return null
  const waiting = Boolean(onContinue)
  const { first, second, streak } = match
  const { headline, detail } = matchFlashText(first, second)
  const isOpposites = Boolean(first.badge || second.badge)
  const images = isOpposites
    ? first.badge === 'positive' ? [first, second] : [second, first]
    : [first.imageUrl ? first : second]

  return (
    <div
      key={match.key}
      aria-live="polite"
      role={waiting ? 'dialog' : undefined}
      aria-label={waiting ? headline : undefined}
      className={`fixed inset-0 z-20 flex items-center justify-center p-5 ${
        waiting ? 'bg-black/35 backdrop-blur-[3px]' : 'pointer-events-none'
      }`}
    >
      <div
        className="relative flex max-w-[560px] flex-col items-center rounded-3xl border-4 bg-bg/95 px-7 py-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)]"
        style={{
          borderColor: primaryColor,
          animation: waiting ? 'match-flash-in 0.35s ease-out' : `match-flash ${flashDuration(match)}ms ease-out forwards`,
        }}
      >
        {[...Array(16)].map((_, i) => {
          const angle = (360 / 16) * i
          const distance = 120 + (i % 3) * 30
          return (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-sm"
              style={{
                background: BURST_COLORS[i % BURST_COLORS.length],
                animation: 'kids-confetti-piece 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards',
                ['--kids-confetti-dx' as string]: `${Math.cos((angle * Math.PI) / 180) * distance}px`,
                ['--kids-confetti-dy' as string]: `${Math.sin((angle * Math.PI) / 180) * distance}px`,
              }}
            />
          )
        })}
        {waiting && (
          <p className="mb-3 text-[30px] font-extrabold tracking-tight" style={{ color: primaryColor }}>
            {headline}
          </p>
        )}
        <div className="flex items-start gap-3">
          {images.map((card, index) => (
            <div key={card.cardId} className="flex items-start gap-3">
              {index > 0 && (
                <span className="mt-[44px] text-[28px] font-bold sm:mt-[58px]" style={{ color: primaryColor }}>
                  ↔
                </span>
              )}
              <div className={`flex flex-col items-center ${waiting ? 'w-[120px] sm:w-[180px]' : ''}`}>
              <div
                className={`flex h-[110px] w-[110px] items-center justify-center overflow-hidden rounded-2xl border-2 sm:h-[140px] sm:w-[140px] ${
                  card.badge === 'negative' ? 'border-danger bg-danger/10' : 'border-accent bg-accent/10'
                }`}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-[15px] font-bold leading-tight text-text-h">{card.title}</span>
                )}
              </div>
              {waiting && (
                <>
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      card.badge === 'negative' ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'
                    }`}
                  >
                    {card.badge === 'negative' ? 'Negativo' : 'Positivo'}
                  </span>
                  <p className="mt-1 text-center text-[15px] font-bold leading-tight text-text-h">{card.title}</p>
                  {card.description && (
                    <p className="mt-1 text-center text-[12.5px] leading-snug text-text">{card.description}</p>
                  )}
                </>
              )}
              </div>
            </div>
          ))}
        </div>
        {!waiting && (
          <>
            <p className="mt-3 text-[30px] font-extrabold tracking-tight" style={{ color: primaryColor }}>
              {headline}
            </p>
            {detail && <p className="max-w-[320px] truncate text-[16px] font-semibold text-text-h">{detail}</p>}
          </>
        )}
        {streak >= 2 && (
          <span className="mt-2 rounded-full bg-[#ff7a1a] px-3 py-1 text-[13px] font-bold text-white">
            🔥 Racha x{streak}
          </span>
        )}
        {waiting && (
          <>
            <button
              type="button"
              autoFocus
              className="mt-4 rounded-xl px-8 py-3 text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
              onClick={onContinue}
            >
              ¡Seguir! ▶
            </button>
            <p className="mt-1.5 text-[11px] text-text/70">⏸ Tiempo en pausa</p>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Demostración animada de 3 s (sin texto largo): dos cartas se voltean,
 * se iluminan juntas y aparece el ✓. Se repite en bucle dentro de la guía.
 */
export function MemoryMatchDemo({ opposites }: { opposites: boolean }) {
  const faces = opposites ? ['☀️', '🌙'] : ['🐶', '🐶']
  return (
    <div className="flex flex-col items-center gap-3 py-2" aria-hidden="true">
      <div className="relative flex items-center gap-3">
        {[0, 1, 2].map((slot) => {
          const isPair = slot !== 1
          const face = isPair ? faces[slot === 0 ? 0 : 1] : '🍎'
          return (
            <div key={slot} className="h-[92px] w-[66px] [perspective:600px]">
              <div
                className="relative h-full w-full [transform-style:preserve-3d]"
                style={{ animation: isPair ? `memory-demo-flip-${slot === 0 ? 'a' : 'b'} 3.2s ease-in-out infinite` : undefined }}
              >
                <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-accent bg-accent/10 text-[20px] text-accent [backface-visibility:hidden]">
                  ✦
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-accent bg-bg text-[34px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                  style={{ animation: isPair ? 'memory-demo-glow 3.2s ease-in-out infinite' : undefined }}
                >
                  {face}
                </div>
              </div>
            </div>
          )
        })}
        <span
          className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#22c55e] text-[20px] font-bold text-white"
          style={{ animation: 'memory-demo-check 3.2s ease-in-out infinite' }}
        >
          ✓
        </span>
      </div>
      <p className="text-[18px] font-bold text-text-h">
        {opposites ? 'Une los opuestos' : 'Encuentra las iguales'}
      </p>
    </div>
  )
}
