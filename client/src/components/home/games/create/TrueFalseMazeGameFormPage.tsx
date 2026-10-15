import { useNavigate } from 'react-router-dom'
import { TrueFalseMazeGameForm } from '../true-false-maze/TrueFalseMazeGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function TrueFalseMazeGameFormPage() {
  const navigate = useNavigate()
  return (
    <TrueFalseMazeGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility))}
      onCategoryCreated={() => {}}
    />
  )
}
