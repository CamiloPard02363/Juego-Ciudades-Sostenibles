import { useNavigate } from 'react-router-dom'
import { SnakesLaddersGameForm } from '../SnakesLaddersGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function SnakesLaddersGameFormPage() {
  const navigate = useNavigate()
  return (
    <SnakesLaddersGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'SNAKES_LADDERS'))}
      onCategoryCreated={() => {}}
    />
  )
}
