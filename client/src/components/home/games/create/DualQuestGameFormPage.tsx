import { useNavigate } from 'react-router-dom'
import { DualQuestGameForm } from '../DualQuestGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function DualQuestGameFormPage() {
  const navigate = useNavigate()
  return (
    <DualQuestGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility))}
      onCategoryCreated={() => {}}
    />
  )
}
