import { useNavigate } from 'react-router-dom'
import { MazeCollectorGameForm } from '../MazeCollectorGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function MazeCollectorGameFormPage() {
  const navigate = useNavigate()
  return (
    <MazeCollectorGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility))}
      onCategoryCreated={() => {}}
    />
  )
}
