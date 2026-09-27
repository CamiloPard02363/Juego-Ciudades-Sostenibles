import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../hooks/useAuth'
import { listGameTypeSettings } from '../../../../services/game.service'
import { GameTypePicker } from '../GameTypePicker'
import type { GameTypeChoice } from '../GameTypePicker'

const ROUTE_BY_CHOICE: Record<GameTypeChoice, string> = {
  CARDS: '/juegos/crear/cartas',
  GUESS_WHO: '/juegos/crear/quien-es',
  DOMINO: '/juegos/crear/domino',
  MAZE_COLLECTOR: '/juegos/crear/laberinto',
  SNAKES_LADDERS: '/juegos/crear/escaleras-serpientes',
  DUAL_QUEST: '/juegos/crear/dual-quest',
}

export function GameTypePickerPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [archivedGameTypes, setArchivedGameTypes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token) return
    listGameTypeSettings(token)
      .then((settings) => {
        setArchivedGameTypes(new Set(settings.filter((s) => s.isArchived).map((s) => s.gameType)))
      })
      .catch(() => {})
  }, [token])

  return (
    <GameTypePicker
      onClose={() => navigate('/')}
      onSelect={(choice) => navigate(ROUTE_BY_CHOICE[choice])}
      archivedGameTypes={archivedGameTypes}
    />
  )
}
