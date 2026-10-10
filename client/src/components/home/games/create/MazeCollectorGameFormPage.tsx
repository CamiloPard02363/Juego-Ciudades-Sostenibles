import { useNavigate } from 'react-router-dom'
import { MazeCollectorGameForm } from '../MazeCollectorGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function MazeCollectorGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <MazeCollectorGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'MAZE_COLLECTOR'))}
      onCategoryCreated={() => {}}
    />
  )
}
