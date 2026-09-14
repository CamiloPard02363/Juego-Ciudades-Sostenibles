import { useNavigate } from 'react-router-dom'
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
  return (
    <GameTypePicker
      onClose={() => navigate('/')}
      onSelect={(choice) => navigate(ROUTE_BY_CHOICE[choice])}
    />
  )
}
