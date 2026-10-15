import { useNavigate } from 'react-router-dom'
import { GuessWhoGameForm } from '../GuessWhoGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function GuessWhoGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <GuessWhoGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'GUESS_WHO'))}
      onCategoryCreated={() => {}}
    />
  )
}
