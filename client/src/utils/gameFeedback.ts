/**
 * Sonidos sintetizados con la Web Audio API (sin archivos que descargar,
 * siempre los mismos tonos predeterminados) y vibración con la Vibration
 * API. Se activa siempre que el navegador lo soporte: en los que no
 * (Safari desktop, la mayoría de laptops sin hardware de vibración)
 * simplemente no hace nada, sin romper el juego.
 */

let audioContext: AudioContext | null = null

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  )
}

function getAudioContext(): AudioContext | null {
  const AudioContextClass = getAudioContextClass()
  if (!AudioContextClass) return null

  try {
    audioContext ??= new AudioContextClass()
    return audioContext
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startDelay: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
  const startTime = ctx.currentTime + startDelay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/**
 * Un AudioContext nace "suspended" en la mayoría de navegadores hasta que se
 * reanuda dentro de un gesto del usuario; `resume()` es async, así que
 * programar sonido antes de que termine lo deja mudo la primera vez. Por eso
 * cada reproducción espera a que esté realmente `running`.
 */
function playWhenReady(ctx: AudioContext, play: (ctx: AudioContext) => void) {
  if (ctx.state === 'running') {
    play(ctx)
    return
  }
  ctx
    .resume()
    .then(() => play(ctx))
    .catch(() => {
      // Sin gesto de usuario disponible todavía: se pierde este sonido puntual.
    })
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Algunos navegadores lanzan si se llama fuera de un gesto del usuario.
  }
}

/**
 * Prepara el AudioContext dentro del primer gesto del usuario (ej. al
 * abrir el juego o voltear la primera carta) para que el audio de la
 * primera jugada no se pierda esperando a que `resume()` termine.
 */
export function primeGameFeedback(): void {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** Pareja acertada: dos notas ascendentes (arpegio corto) + vibración breve. */
export function celebrateMatch(): void {
  const ctx = getAudioContext()
  if (ctx) {
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 523.25, 0, 0.14, 'sine', 0.15) // C5
      playTone(readyCtx, 783.99, 0.09, 0.18, 'sine', 0.15) // G5
    })
  }
  vibrate(35)
}

/** Pareja fallida: tono grave y corto + doble vibración, distinguible del acierto. */
export function signalMismatch(): void {
  const ctx = getAudioContext()
  if (ctx) {
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 196, 0, 0.22, 'sawtooth', 0.09) // G3
    })
  }
  vibrate([40, 60, 40])
}
