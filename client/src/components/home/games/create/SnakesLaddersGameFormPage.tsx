import { useNavigate } from 'react-router-dom'
import { SnakesLaddersGameForm } from '../SnakesLaddersGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function SnakesLaddersGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <SnakesLaddersGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'SNAKES_LADDERS'))}
      onCategoryCreated={() => {}}
    />
  )
}
