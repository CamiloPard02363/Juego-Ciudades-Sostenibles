import { useNavigate } from 'react-router-dom'
import { OppositesGameForm } from '../OppositesGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function OppositesGameFormPage() {
  const navigate = useNavigate()
  return (
    <OppositesGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'OPPOSITES'))}
      onCategoryCreated={() => {}}
    />
  )
}
