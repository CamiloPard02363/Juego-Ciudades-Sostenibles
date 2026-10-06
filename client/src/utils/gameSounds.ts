import { playGameEffect, primeGameFeedback, type GameSound } from './gameFeedback'

const key = 'nexusplay-game-sounds'
const listeners = new Set<() => void>()
let enabled = true
try { enabled = localStorage.getItem(key) !== 'off' } catch { /* Storage is optional. */ }

export function gameSoundsEnabled() { return enabled }
export function canPlayGameSounds() { return enabled && !document.hidden }
export function playGameSound(sound: GameSound) {
  if (enabled) playGameEffect(sound)
}
export function subscribeGameSounds(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setGameSoundsEnabled(value: boolean) {
  enabled = value
  try { localStorage.setItem(key, value ? 'on' : 'off') } catch { /* Keep in memory. */ }
  listeners.forEach(listener => listener())
}

/** Called only by a user gesture; no autoplay or delayed sounds on page load. */
export function unlockGameSounds() {
  if (enabled) primeGameFeedback()
}
