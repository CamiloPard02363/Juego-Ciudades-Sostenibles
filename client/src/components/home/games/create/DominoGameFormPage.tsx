import { useNavigate } from 'react-router-dom'
import { DominoGameForm } from '../DominoGameForm'

export function DominoGameFormPage() {
  const navigate = useNavigate()
  return (
    <DominoGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
