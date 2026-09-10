import { useNavigate } from 'react-router-dom'
import { SimplePairsGameForm } from '../SimplePairsGameForm'

export function SimplePairsGameFormPage() {
  const navigate = useNavigate()
  return (
    <SimplePairsGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
