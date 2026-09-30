import { useNavigate } from 'react-router-dom'
import { SimplePairsGameForm } from '../SimplePairsGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function SimplePairsGameFormPage() {
  const navigate = useNavigate()
  return (
    <SimplePairsGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear/cartas')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility))}
      onCategoryCreated={() => {}}
    />
  )
}
