import { useNavigate } from 'react-router-dom'
import { SnakesLaddersGameForm } from '../SnakesLaddersGameForm'

export function SnakesLaddersGameFormPage() {
  const navigate = useNavigate()
  return (
    <SnakesLaddersGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
