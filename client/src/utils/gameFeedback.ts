/**
 * Sonidos sintetizados con la Web Audio API (sin archivos que descargar,
 * siempre los mismos tonos predeterminados) y vibración con la Vibration
 * API. Se activa siempre que el navegador lo soporte: en los que no
 * (Safari desktop, la mayoría de laptops sin hardware de vibración)
 * simplemente no hace nada, sin romper el juego.
 */

let audioContext: AudioContext | null = null
let guessWhoMuted = false
let guessWhoAmbience:
  | { oscillators: OscillatorNode[]; masterGain: GainNode }
  | null = null
let guessWhoAmbienceStarting = false

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

/** Campanilla breve con armónicos suaves, menos mecánica que un tono único. */
function playSoftChime(ctx: AudioContext, frequency: number, startDelay: number, peakGain: number) {
  playTone(ctx, frequency, startDelay, 0.2, 'sine', peakGain)
  playTone(ctx, frequency * 1.498, startDelay + 0.018, 0.28, 'sine', peakGain * 0.42)
  playTone(ctx, frequency * 2, startDelay + 0.01, 0.12, 'triangle', peakGain * 0.16)
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

/**
 * Pareja acertada: arpegio ascendente + vibración breve. Con racha (`streak`)
 * el arpegio sube de tono y suma una nota, para que encadenar aciertos se
 * oiga como progreso y no como el mismo tono repetido.
 */
export function celebrateMatch(streak = 1): void {
  const ctx = getAudioContext()
  if (ctx) {
    const lift = Math.pow(2, Math.min(Math.max(streak - 1, 0), 5) / 12)
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 523.25 * lift, 0, 0.14, 'sine', 0.15) // C5
      playTone(readyCtx, 659.25 * lift, 0.08, 0.14, 'sine', 0.14) // E5
      playTone(readyCtx, 783.99 * lift, 0.16, 0.22, 'sine', 0.15) // G5
      if (streak >= 3) playSoftChime(readyCtx, 1046.5 * lift, 0.26, 0.08) // C6: brillo de racha
    })
  }
  vibrate(35)
}

/** Pareja fallida: tono grave y corto + doble vibración, distinguible del acierto. */
export function signalMismatch(): void {
  const ctx = getAudioContext()
  if (ctx) {
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 220, 0, 0.12, 'sawtooth', 0.08) // A3
      playTone(readyCtx, 174.61, 0.11, 0.22, 'sawtooth', 0.08) // F3: baja, "uh-oh"
    })
  }
  vibrate([40, 60, 40])
}

/** Silencia únicamente los efectos y la ambientación de Identidad Oculta. */
export function setGuessWhoSoundMuted(muted: boolean): void {
  guessWhoMuted = muted
  const ctx = getAudioContext()
  if (!ctx || !guessWhoAmbience) return
  guessWhoAmbience.masterGain.gain.setTargetAtTime(muted ? 0.0001 : 0.024, ctx.currentTime, 0.06)
}

/** Ambiente tenue y continuo para una partida de Identidad Oculta. */
export function startGuessWhoAmbience(): void {
  if (guessWhoMuted || guessWhoAmbience || guessWhoAmbienceStarting) return
  const ctx = getAudioContext()
  if (!ctx) return

  guessWhoAmbienceStarting = true
  playWhenReady(ctx, (readyCtx) => {
    guessWhoAmbienceStarting = false
    if (guessWhoMuted || guessWhoAmbience) return

    const masterGain = readyCtx.createGain()
    masterGain.gain.value = 0.024
    masterGain.connect(readyCtx.destination)

    const lowDrone = readyCtx.createOscillator()
    lowDrone.type = 'sine'
    lowDrone.frequency.value = 110
    const lowGain = readyCtx.createGain()
    lowGain.gain.value = 0.45
    lowDrone.connect(lowGain)
    lowGain.connect(masterGain)

    const highDrone = readyCtx.createOscillator()
    highDrone.type = 'triangle'
    highDrone.frequency.value = 164.81
    const highGain = readyCtx.createGain()
    highGain.gain.value = 0.12
    highDrone.connect(highGain)
    highGain.connect(masterGain)

    lowDrone.start()
    highDrone.start()
    guessWhoAmbience = { oscillators: [lowDrone, highDrone], masterGain }
  })
}

/** Detiene el ambiente al salir o terminar la partida. */
export function stopGuessWhoAmbience(): void {
  guessWhoAmbienceStarting = false
  if (!guessWhoAmbience) return
  for (const oscillator of guessWhoAmbience.oscillators) {
    try {
      oscillator.stop()
    } catch {
      // El oscilador ya pudo haber sido detenido durante el desmontaje.
    }
  }
  guessWhoAmbience.masterGain.disconnect()
  guessWhoAmbience = null
}

/** Efecto al descartar o recuperar una bandera del tablero. */
export function playGuessWhoCardToggle(restored: boolean): void {
  startGuessWhoAmbience()
  if (guessWhoMuted) return
  const ctx = getAudioContext()
  if (!ctx) return
  playWhenReady(ctx, (readyCtx) => {
    if (guessWhoMuted) return
    playSoftChime(readyCtx, restored ? 523.25 : 349.23, 0, restored ? 0.085 : 0.065)
  })
}

/** Señal corta y sutil al cambiar el turno. */
export function playGuessWhoTurnCue(isMyTurn: boolean): void {
  if (guessWhoMuted) return
  const ctx = getAudioContext()
  if (!ctx) return
  playWhenReady(ctx, (readyCtx) => {
    if (guessWhoMuted) return
    playSoftChime(readyCtx, isMyTurn ? 440 : 293.66, 0, 0.055)
  })
}

/** Tic regresivo de los últimos cinco segundos del turno. */
export function playGuessWhoCountdownTick(secondsLeft: number): void {
  if (guessWhoMuted) return
  const ctx = getAudioContext()
  if (!ctx) return
  playWhenReady(ctx, (readyCtx) => {
    if (guessWhoMuted) return
    const finalSeconds = secondsLeft <= 2
    playSoftChime(readyCtx, finalSeconds ? 523.25 : 392, 0, finalSeconds ? 0.065 : 0.04)
  })
}
