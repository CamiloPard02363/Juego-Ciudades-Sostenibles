import { useNavigate } from 'react-router-dom'
import { SimplePairsGameForm } from '../SimplePairsGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function SimplePairsGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <SimplePairsGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'PAIRS'))}
      onCategoryCreated={() => {}}
    />
  )
}
