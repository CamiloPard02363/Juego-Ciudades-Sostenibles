import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

describe('efectos de juego', () => {
  let start: ReturnType<typeof vi.fn>
  let stop: ReturnType<typeof vi.fn>
  let saved: Map<string, string>
  beforeEach(() => {
    vi.resetModules()
    start = vi.fn()
    stop = vi.fn()
    saved = new Map()
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key), setItem: (key: string, value: string) => saved.set(key, value) })
    vi.stubGlobal('document', { hidden: false })
    vi.stubGlobal('window', { AudioContext: class {
      state = 'suspended'
      currentTime = 0
      sampleRate = 44100
      destination = {}
      resume() { this.state = 'running'; return Promise.resolve() }
      createOscillator() { return { frequency: {}, connect: vi.fn(), disconnect: vi.fn(), start, stop } }
      createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
      createBufferSource() { return { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start, stop } }
      createGain() { return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() } }
    } })
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('los aplausos respetan el silencio y se pueden detener', async () => {
    const sounds = await import('./gameSounds')
    const audio = await import('./gameFeedback')
    sounds.unlockGameSounds()
    sounds.setGameSoundsEnabled(false)
    sounds.playGameSound('applause')
    expect(start).not.toHaveBeenCalled()
    sounds.setGameSoundsEnabled(true)
    sounds.playGameSound('applause')
    expect(start).toHaveBeenCalledOnce()
    audio.stopGameEffects()
    expect(stop).toHaveBeenCalledOnce()
  })
  it('la música espera la activación y se limpia al salir o silenciar', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }))
    const audio = await import('./gameFeedback')
    const close = audio.startGameAmbience()
    vi.advanceTimersByTime(500)
    expect(start).not.toHaveBeenCalled()
    audio.primeGameFeedback()
    vi.advanceTimersByTime(250)
    expect(start).toHaveBeenCalledTimes(2)
    stop.mockClear()
    close()
    expect(stop).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(10000)
    expect(start).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('la música se detiene al ocultar la pestaña y vuelve al regresar', async () => {
    vi.useFakeTimers()
    const doc = Object.assign(new EventTarget(), { hidden: false })
    vi.stubGlobal('document', doc)
    const audio = await import('./gameFeedback')
    audio.primeGameFeedback()
    const close = audio.startGameAmbience()
    stop.mockClear()
    doc.hidden = true
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(stop).toHaveBeenCalledTimes(2)
    const count = start.mock.calls.length
    vi.advanceTimersByTime(5000)
    expect(start).toHaveBeenCalledTimes(count)
    doc.hidden = false
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(start.mock.calls.length).toBeGreaterThan(count)
    close()
  })
  it('espera la activación asíncrona del audio durante un clic', async () => {
    const Base = window.AudioContext
    vi.stubGlobal('navigator', { userActivation: { isActive: true } })
    vi.stubGlobal('window', { AudioContext: class extends Base {
      async resume() { await Promise.resolve(); Object.assign(this, { state: 'running' }) }
    } })
    const sounds = await import('./gameSounds')
    sounds.unlockGameSounds()
    sounds.playGameSound('turn')
    expect(start).not.toHaveBeenCalled()
    await Promise.resolve()
    await Promise.resolve()
    expect(start).toHaveBeenCalledTimes(2)
  })
  it('no reproduce antes del gesto; reproduce después y respeta el silencio', async () => {
    const sounds = await import('./gameSounds')
    sounds.playGameSound('turn')
    expect(start).not.toHaveBeenCalled()
    sounds.unlockGameSounds()
    sounds.playGameSound('turn')
    expect(start).toHaveBeenCalledTimes(2)
    sounds.setGameSoundsEnabled(false)
    sounds.playGameSound('complete')
    expect(start).toHaveBeenCalledTimes(2)
    expect(saved.get('nexusplay-game-sounds')).toBe('off')
  })
  it('recupera la preferencia de silencio', async () => {
    saved.set('nexusplay-game-sounds', 'off')
    const sounds = await import('./gameSounds')
    expect(sounds.gameSoundsEnabled()).toBe(false)
    sounds.unlockGameSounds()
    sounds.playGameSound('flip')
    expect(start).not.toHaveBeenCalled()
  })
  it('omite efectos con la pestaña oculta y detiene los efectos activos', async () => {
    const sounds = await import('./gameSounds')
    const audio = await import('./gameFeedback')
    sounds.unlockGameSounds()
    vi.stubGlobal('document', { hidden: true })
    sounds.playGameSound('discard')
    expect(start).not.toHaveBeenCalled()
    vi.stubGlobal('document', { hidden: false })
    sounds.playGameSound('flip')
    stop.mockClear()
    audio.stopGameEffects()
    expect(stop).toHaveBeenCalledOnce()
  })
  it('funciona sin soporte de audio o almacenamiento', async () => {
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', { getItem() { throw Error() }, setItem() { throw Error() } })
    const sounds = await import('./gameSounds')
    expect(() => { sounds.unlockGameSounds(); sounds.playGameSound('flip'); sounds.setGameSoundsEnabled(false) }).not.toThrow()
  })
})
