import { useNavigate } from 'react-router-dom'
import { DominoGameForm } from '../DominoGameForm'
import { buildJustCreatedRedirect } from './justCreatedRedirect'

export function DominoGameFormPage() {
  const navigate = useNavigate()
  return (
    <DominoGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={(gameId, visibility) => navigate(buildJustCreatedRedirect(gameId, visibility, 'DOMINO'))}
      onCategoryCreated={() => {}}
    />
  )
}
