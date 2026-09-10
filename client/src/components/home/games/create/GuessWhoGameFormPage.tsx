import { useNavigate } from 'react-router-dom'
import { GuessWhoGameForm } from '../GuessWhoGameForm'

export function GuessWhoGameFormPage() {
  const navigate = useNavigate()
  return (
    <GuessWhoGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
