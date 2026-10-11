import { useNavigate } from 'react-router-dom'
import { TrueFalseMazeGame } from './TrueFalseMazeGame'
import { DEFAULT_TRUE_FALSE_MAZE_CONFIG, type TrueFalseMazeQuestion } from './trueFalseMazeTypes'

/**
 * Ruta `/jugar/laberinto-vf-demo`: prueba local del laberinto con unas
 * afirmaciones de ejemplo, sin crear ni sembrar un juego en la base (mismo
 * propósito que DualQuestPixiDemoPage). El juego "de verdad" se crea desde
 * el formulario o con `npm run db:seed:true-false-maze-demo`.
 */
const DEMO_QUESTIONS: TrueFalseMazeQuestion[] = [
  {
    questionId: 'demo-sol',
    statement: 'El Sol es una estrella.',
    answer: true,
    explanation: 'El Sol es una estrella enana amarilla; su luz tarda unos 8 minutos en llegar a la Tierra.',
  },
  {
    questionId: 'demo-luna',
    statement: 'La Luna produce su propia luz.',
    answer: false,
    explanation: 'La Luna no brilla por sí misma: refleja la luz del Sol.',
  },
  {
    questionId: 'demo-jupiter',
    statement: 'Júpiter es el planeta más grande del sistema solar.',
    answer: true,
    explanation: 'Júpiter es tan grande que dentro de él cabrían más de 1.300 planetas como la Tierra.',
  },
  {
    questionId: 'demo-sonido',
    statement: 'En el espacio el sonido viaja más rápido que en la Tierra.',
    answer: false,
    explanation: 'En el vacío del espacio el sonido no puede viajar: necesita un medio como el aire o el agua.',
  },
  {
    questionId: 'demo-marte',
    statement: 'Marte se ve rojo por el óxido de hierro de su superficie.',
    answer: true,
    explanation: 'El polvo de Marte tiene mucho óxido de hierro, el mismo compuesto que le da color al óxido.',
  },
  {
    questionId: 'demo-saturno',
    statement: 'Saturno es el único planeta que tiene anillos.',
    answer: false,
    explanation: 'Júpiter, Urano y Neptuno también tienen anillos, aunque mucho más tenues que los de Saturno.',
  },
]

export function TrueFalseMazeDemoPage() {
  const navigate = useNavigate()
  return (
    <TrueFalseMazeGame
      title="Misión Galáctica · demo"
      questions={DEMO_QUESTIONS}
      config={DEFAULT_TRUE_FALSE_MAZE_CONFIG}
      onExit={() => navigate('/')}
    />
  )
}
