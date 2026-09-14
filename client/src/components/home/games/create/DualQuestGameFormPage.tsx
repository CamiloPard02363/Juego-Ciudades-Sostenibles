import { useNavigate } from 'react-router-dom'
import { DualQuestGameForm } from '../DualQuestGameForm'

export function DualQuestGameFormPage() {
  const navigate = useNavigate()
  return (
    <DualQuestGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
