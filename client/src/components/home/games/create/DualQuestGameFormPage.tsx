import { useNavigate } from 'react-router-dom'
import { DualQuestGameForm } from '../DualQuestGameForm'
import { useAdaptationFromLocation } from '../useApplyAdaptation'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function DualQuestGameFormPage() {
  const navigate = useNavigate()
  const adaptation = useAdaptationFromLocation()
  return (
    <DualQuestGameForm
      adaptation={adaptation}
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'DUAL_QUEST'))}
      onCategoryCreated={() => {}}
    />
  )
}
