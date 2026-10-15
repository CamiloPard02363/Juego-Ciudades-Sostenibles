import { useNavigate } from 'react-router-dom'
import { OppositesGameForm } from '../OppositesGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function OppositesGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <OppositesGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'OPPOSITES'))}
      onCategoryCreated={() => {}}
    />
  )
}
