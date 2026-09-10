import { useNavigate } from 'react-router-dom'
import { GameModePicker } from '../GameModePicker'
import type { MemoryMatchMode } from '../memoryMatchTypes'

const ROUTE_BY_MODE: Record<MemoryMatchMode, string> = {
  PAIRS: '/juegos/crear/cartas/parejas',
  OPPOSITES: '/juegos/crear/cartas/opuestos',
}

export function GameModePickerPage() {
  const navigate = useNavigate()
  return (
    <GameModePicker
      onClose={() => navigate('/')}
      onSelect={(mode) => navigate(ROUTE_BY_MODE[mode])}
    />
  )
}
