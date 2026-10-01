import { useNavigate } from 'react-router-dom'
import { GuessWhoGameForm } from '../GuessWhoGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function GuessWhoGameFormPage() {
  const navigate = useNavigate()
  return (
    <GuessWhoGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility))}
      onCategoryCreated={() => {}}
    />
  )
}
