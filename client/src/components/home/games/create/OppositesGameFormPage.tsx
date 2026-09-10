import { useNavigate } from 'react-router-dom'
import { OppositesGameForm } from '../OppositesGameForm'

export function OppositesGameFormPage() {
  const navigate = useNavigate()
  return (
    <OppositesGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
