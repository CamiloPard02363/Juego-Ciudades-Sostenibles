/**
 * Sonidos sintetizados con la Web Audio API (sin archivos que descargar,
 * siempre los mismos tonos predeterminados) y vibración con la Vibration
 * API. Se activa siempre que el navegador lo soporte: en los que no
 * (Safari desktop, la mayoría de laptops sin hardware de vibración)
 * simplemente no hace nada, sin romper el juego.
 */

let audioContext: AudioContext | null = null
const activeEffects = new Set<AudioScheduledSourceNode>()
let playbackGeneration = 0

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
  nodes = activeEffects,
  attackSeconds = 0.01,
) {
  const startTime = ctx.currentTime + startDelay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + attackSeconds)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(gain)
  nodes.add(oscillator)
  oscillator.onended = () => {
    nodes.delete(oscillator)
    oscillator.disconnect()
    gain.disconnect()
  }
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

/** Ambientación original: notas suaves, sin descargas ni cambios en el juego. */
export function startGameAmbience(): () => void {
  const nodes = new Set<OscillatorNode>()
  const melody = [261.63, 329.63, 392, 329.63, 293.66, 392, 440, 392,
    329.63, 261.63, 293.66, 329.63, 220, 293.66, 329.63, 293.66]
  let nextNoteAt = 0
  let index = 0
  const silence = () => {
    for (const node of nodes) {
      try { node.stop(); node.disconnect() } catch { /* Already ended. */ }
    }
    nodes.clear()
    nextNoteAt = 0
  }
  const tick = () => {
    const ctx = audioContext
    if (document.hidden || !ctx || ctx.state !== 'running') {
      silence()
      return
    }
    if (ctx.currentTime < nextNoteAt) return
    try {
      playTone(ctx, melody[index], 0, 2.4, 'sine', 0.018, nodes, 0.3)
      if (index % 4 === 0) playTone(ctx, melody[index] / 2, 0, 4, 'sine', 0.012, nodes, 0.5)
      index = (index + 1) % melody.length
      nextNoteAt = ctx.currentTime + 1.5
    } catch { silence() }
  }
  document.addEventListener('visibilitychange', tick)
  const interval = setInterval(tick, 250)
  tick()
  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', tick)
    silence()
  }
}

/**
 * Un AudioContext nace "suspended" en la mayoría de navegadores hasta que se
 * reanuda dentro de un gesto del usuario; `resume()` es async, así que
 * programar sonido antes de que termine lo deja mudo la primera vez. Por eso
 * cada reproducción espera a que esté realmente `running`.
 */
function playWhenReady(ctx: AudioContext, play: (ctx: AudioContext) => void) {
  const generation = playbackGeneration
  if (ctx.state === 'running') {
    play(ctx)
    return
  }
  ctx
    .resume()
    .then(() => { if (generation === playbackGeneration && ctx.state === 'running') play(ctx) })
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
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
}

export function stopGameEffects(): void {
  playbackGeneration++
  for (const oscillator of activeEffects) {
    try { oscillator.stop() } catch { /* Already stopped. */ }
  }
}

export type GameSound = 'flip' | 'discard' | 'turn' | 'error' | 'complete' | 'applause'

function playApplause(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.7), ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  // Varias palmadas cortas y ligeramente desfasadas, sin archivos externos.
  for (let clap = 0; clap < 22; clap++) {
    const offset = Math.floor((clap * 0.058 + Math.random() * 0.035) * ctx.sampleRate)
    const length = Math.floor(0.12 * ctx.sampleRate)
    for (let i = 0; i < length && offset + i < samples.length; i++) {
      const envelope = Math.min(1, i / (ctx.sampleRate * 0.002)) * Math.exp(-i / (ctx.sampleRate * 0.022))
      samples[offset + i] += (Math.random() * 2 - 1) * envelope * 0.16
    }
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  activeEffects.add(source)
  source.onended = () => { activeEffects.delete(source); source.disconnect() }
  source.start()
}
export function playGameEffect(sound: GameSound): void {
  if (document.hidden) return
  // A click can arrive before resume() finishes. Wait briefly for that
  // gesture, but never replay an old server event on a later interaction.
  const ctx = audioContext ?? (navigator.userActivation?.isActive ? getAudioContext() : null)
  if (!ctx) return
  const notes: Record<Exclude<GameSound, 'applause'>, number[]> = {
    flip: [660], discard: [330, 220], turn: [523, 784],
    error: [196], complete: [523, 659, 784, 1047],
  }
  const generation = playbackGeneration
  const requestedAt = Date.now()
  const play = () => {
    if (ctx.state !== 'running' || document.hidden || generation !== playbackGeneration || Date.now() - requestedAt > 500) return
    try {
    if (sound === 'applause') { playApplause(ctx); return }
    notes[sound].forEach((frequency, index) =>
      playTone(ctx, frequency, index * 0.09, 0.18, 'sine', 0.14))
    } catch { /* Audio must never interrupt gameplay. */ }
  }
  if (ctx.state === 'running') play()
  else if (navigator.userActivation?.isActive) void ctx.resume().then(play).catch(() => {})
}

/** Pareja acertada: dos notas ascendentes (arpegio corto) + vibración breve. */
export function celebrateMatch(soundEnabled = true): void {
  const ctx = soundEnabled ? getAudioContext() : null
  if (ctx) {
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 523.25, 0, 0.14, 'sine', 0.15) // C5
      playTone(readyCtx, 783.99, 0.09, 0.18, 'sine', 0.15) // G5
    })
  }
  vibrate(35)
}

/** Pareja fallida: tono grave y corto + doble vibración, distinguible del acierto. */
export function signalMismatch(soundEnabled = true): void {
  const ctx = soundEnabled ? getAudioContext() : null
  if (ctx) {
    playWhenReady(ctx, (readyCtx) => {
      playTone(readyCtx, 196, 0, 0.22, 'sawtooth', 0.09) // G3
    })
  }
  vibrate([40, 60, 40])
}
