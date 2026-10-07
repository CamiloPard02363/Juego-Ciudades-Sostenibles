import type { TfEvent } from './trueFalseMazeEngine'

/**
 * Efectos de sonido del laberinto, sintetizados con la Web Audio API (sin
 * archivos que descargar), igual que utils/gameFeedback.ts pero con más
 * variedad: cada evento del motor tiene su sonido. Si el navegador no
 * soporta audio, simplemente no suena nada.
 */

const MUTE_KEY = 'nexusplay-true-false-maze-muted'

export function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMutedPreference(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura solo esta partida.
  }
}

type ToneOptions = {
  freq: number
  endFreq?: number
  at?: number
  duration: number
  type?: OscillatorType
  gain?: number
}

export class TrueFalseMazeSfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private muted: boolean
  private dotToggle = false
  private lastDotAt = 0

  constructor(muted: boolean) {
    this.muted = muted
  }

  setMuted(muted: boolean) {
    this.muted = muted
    saveMutedPreference(muted)
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02)
  }

  /** Crea/reanuda el AudioContext dentro de un gesto del usuario (si no, el navegador lo deja mudo). */
  prime() {
    const ctx = this.ensureContext()
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
  }

  dispose() {
    void this.ctx?.close().catch(() => {})
    this.ctx = null
    this.master = null
  }

  play(events: readonly TfEvent[]) {
    if (this.muted || events.length === 0) return
    const ctx = this.ensureContext()
    if (!ctx || ctx.state !== 'running') return
    for (const event of events) this.playEvent(event)
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AudioContextClass =
      typeof window === 'undefined'
        ? null
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
          null)
    if (!AudioContextClass) return null
    try {
      this.ctx = new AudioContextClass()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      this.master.connect(this.ctx.destination)
      const length = Math.floor(this.ctx.sampleRate * 0.6)
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = this.noise.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
      return this.ctx
    } catch {
      this.ctx = null
      return null
    }
  }

  private tone({ freq, endFreq, at = 0, duration, type = 'sine', gain = 0.08 }: ToneOptions) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const start = ctx.currentTime + at
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, start)
    if (endFreq) oscillator.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(gain, start + 0.008)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private hiss(at: number, duration: number, gain: number, cutoff: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.noise) return
    const start = ctx.currentTime + at
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cutoff, start)
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff / 6), start + duration)
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(gain, start)
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(envelope)
    envelope.connect(master)
    source.start(start)
    source.stop(start + duration + 0.02)
  }

  private playEvent(event: TfEvent) {
    switch (event.type) {
      case 'dot': {
        // "Waka" alterno, sin saturar si se comen varios seguidos.
        const now = this.ctx?.currentTime ?? 0
        if (now - this.lastDotAt < 0.06) return
        this.lastDotAt = now
        this.dotToggle = !this.dotToggle
        this.tone({ freq: this.dotToggle ? 520 : 680, endFreq: this.dotToggle ? 640 : 560, duration: 0.07, type: 'square', gain: 0.03 })
        return
      }
      case 'core':
        ;[523, 784, 1047].forEach((freq, i) => this.tone({ freq, at: i * 0.07, duration: 0.12, type: 'triangle', gain: 0.08 }))
        return
      case 'emp-start':
        this.tone({ freq: 180, endFreq: 1400, duration: 0.32, type: 'sawtooth', gain: 0.05 })
        this.hiss(0, 0.35, 0.12, 4000)
        return
      case 'emp-ending':
        this.tone({ freq: 880, duration: 0.06, type: 'square', gain: 0.035 })
        this.tone({ freq: 880, at: 0.12, duration: 0.06, type: 'square', gain: 0.035 })
        return
      case 'zap':
        this.tone({ freq: 1600, endFreq: 180, duration: 0.22, type: 'sawtooth', gain: 0.07 })
        this.hiss(0, 0.12, 0.15, 6000)
        return
      case 'answer':
        if (event.correct) {
          ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
            this.tone({ freq, at: i * 0.09, duration: 0.26, type: 'sine', gain: 0.12 }),
          )
          this.tone({ freq: 2093, at: 0.36, duration: 0.3, type: 'triangle', gain: 0.04 })
        } else {
          this.tone({ freq: 233, duration: 0.2, type: 'square', gain: 0.07 })
          this.tone({ freq: 175, at: 0.2, duration: 0.34, type: 'square', gain: 0.07 })
          this.tone({ freq: 90, duration: 0.5, type: 'sawtooth', gain: 0.05 })
        }
        return
      case 'caught':
        this.tone({ freq: 880, endFreq: 90, duration: 1.0, type: 'triangle', gain: 0.1 })
        this.hiss(0, 0.25, 0.14, 2500)
        return
      case 'respawn':
        this.tone({ freq: 300, endFreq: 1200, duration: 0.3, type: 'sine', gain: 0.07 })
        return
      case 'vent':
        this.tone({ freq: 95, endFreq: 60, duration: 0.16, type: 'sine', gain: 0.14 })
        this.hiss(0.02, 0.45, 0.1, 1800)
        return
      case 'vent-exit':
        this.tone({ freq: 110, duration: 0.12, type: 'sine', gain: 0.12 })
        this.tone({ freq: 620, endFreq: 900, at: 0.04, duration: 0.08, type: 'triangle', gain: 0.05 })
        return
      case 'zones-warning':
        ;[0, 0.28, 0.56].forEach((at) => this.tone({ freq: 1250, at, duration: 0.05, type: 'square', gain: 0.03 }))
        return
      case 'zones-move':
        this.tone({ freq: 420, endFreq: 1700, duration: 0.24, type: 'sine', gain: 0.05 })
        return
      case 'question':
        this.tone({ freq: 988, duration: 0.08, type: 'square', gain: 0.04 })
        this.tone({ freq: 1319, at: 0.1, duration: 0.12, type: 'square', gain: 0.04 })
        return
      case 'ship-clean':
        ;[523, 659, 784, 1047, 1319].forEach((freq, i) => this.tone({ freq, at: i * 0.08, duration: 0.2, type: 'triangle', gain: 0.09 }))
        return
      case 'lights-out':
        this.tone({ freq: 600, endFreq: 70, duration: 0.7, type: 'sawtooth', gain: 0.07 })
        ;[0.75, 1.05, 1.35, 1.65].forEach((at, i) =>
          this.tone({ freq: i % 2 === 0 ? 720 : 520, at, duration: 0.24, type: 'square', gain: 0.035 }),
        )
        return
      case 'lights-on':
        this.tone({ freq: 200, endFreq: 900, duration: 0.3, type: 'triangle', gain: 0.06 })
        return
      case 'jelly-release':
        this.tone({ freq: 260, endFreq: 520, duration: 0.18, type: 'sine', gain: 0.03 })
        return
      case 'finished':
        if (event.won) {
          ;[523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, i) =>
            this.tone({ freq, at: i * 0.11, duration: 0.24, type: 'triangle', gain: 0.1 }),
          )
        } else {
          ;[392, 330, 262].forEach((freq, i) => this.tone({ freq, at: i * 0.22, duration: 0.32, type: 'sine', gain: 0.1 }))
        }
        return
      default:
        return
    }
  }
}
