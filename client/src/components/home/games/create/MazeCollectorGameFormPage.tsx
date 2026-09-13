import { useNavigate } from 'react-router-dom'
import { MazeCollectorGameForm } from '../MazeCollectorGameForm'

export function MazeCollectorGameFormPage() {
  const navigate = useNavigate()
  return (
    <MazeCollectorGameForm
      onClose={() => navigate('/')}
      onBack={() => navigate('/juegos/crear')}
      onCreated={() => navigate('/')}
      onCategoryCreated={() => {}}
    />
  )
}
