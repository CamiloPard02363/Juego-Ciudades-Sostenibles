/**
 * Sonidos sintetizados con Web Audio API (sin archivos de audio que
 * descargar) y vibración vía Vibration API. Ambas son best-effort: en
 * navegadores/dispositivos sin soporte (Safari desktop sin gesto previo,
 * la mayoría de laptops sin vibración) simplemente no hacen nada.
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null

  try {
    audioContext ??= new AudioContextClass()
    if (audioContext.state === 'suspended') void audioContext.resume()
    return audioContext
  } catch {
    return null
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
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

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Algunos navegadores lanzan si se llama fuera de un gesto del usuario.
  }
}

/** Pareja acertada: dos notas ascendentes (arpegio corto) + vibración breve. */
export function celebrateMatch(): void {
  const ctx = getAudioContext()
  if (ctx) {
    const now = ctx.currentTime
    playTone(ctx, 523.25, now, 0.14, 'sine', 0.15) // C5
    playTone(ctx, 783.99, now + 0.09, 0.18, 'sine', 0.15) // G5
  }
  vibrate(35)
}

/** Pareja fallida: tono grave y corto + doble vibración, distinguible del acierto. */
export function signalMismatch(): void {
  const ctx = getAudioContext()
  if (ctx) {
    playTone(ctx, 196, ctx.currentTime, 0.22, 'sawtooth', 0.09) // G3
  }
  vibrate([40, 60, 40])
}
