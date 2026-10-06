import { useEffect, useSyncExternalStore } from 'react'
import { Volume2, VolumeOff } from 'lucide-react'
import { gameSoundsEnabled, setGameSoundsEnabled, subscribeGameSounds, unlockGameSounds, playGameSound } from '../../../utils/gameSounds'
import { startGameAmbience, stopGameEffects } from '../../../utils/gameFeedback'

export function GameSoundControl({ musicActive = true }: { musicActive?: boolean }) {
  const enabled = useSyncExternalStore(subscribeGameSounds, gameSoundsEnabled)
  useEffect(() => {
    if (enabled && musicActive) return startGameAmbience()
  }, [enabled, musicActive])
  useEffect(() => {
    window.addEventListener('pointerdown', unlockGameSounds)
    window.addEventListener('keydown', unlockGameSounds)
    return () => {
      window.removeEventListener('pointerdown', unlockGameSounds)
      window.removeEventListener('keydown', unlockGameSounds)
      stopGameEffects()
    }
  }, [])
  const Icon = enabled ? Volume2 : VolumeOff
  return <button type="button" aria-pressed={enabled}
    aria-label={enabled ? 'Silenciar música y efectos' : 'Activar música y efectos'}
    title={enabled ? 'Silenciar música y efectos' : 'Activar música y efectos'}
    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-text-h focus-visible:outline-2 focus-visible:outline-accent"
    onClick={() => {
      setGameSoundsEnabled(!enabled)
      if (enabled) stopGameEffects()
      else { unlockGameSounds(); playGameSound('turn') }
    }}>
    <Icon className="h-5 w-5" aria-hidden="true" />
  </button>
}
