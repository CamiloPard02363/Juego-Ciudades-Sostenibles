import type { ReactNode } from 'react'

/** Contenido ilustrativo: nunca son tarjetas ni identificadores de una sala real. */
export type GuessWhoDemoExample = {
  edition: string
  question: string
  answer: 'Sí' | 'No'
  rivalQuestion: string
  wrongGuess: { optionId: string; question: string }
  correctGuess: { optionId: string; question: string }
  options: { id: string; label: string; visual: ReactNode; matchesAnswer: boolean }[]
}

function flagVisual(country: 'canada' | 'peru' | 'japan' | 'finland' | 'sweden' | 'greece') {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full rounded" aria-hidden="true">
      <rect width="120" height="80" fill={country === 'sweden' ? '#006aa7' : country === 'greece' ? '#0d5eaf' : '#fff'} />
      {(country === 'canada' || country === 'peru') && <>
        <path d="M0 0h30v80H0zM90 0h30v80H90z" fill="#d80621" />
        {country === 'canada' && <path d="M60 14l6 14 8-5-3 17 12-5-3 9 7 3-21 14 1 7H53l1-7-21-14 7-3-3-9 12 5-3-17 8 5z" fill="#d80621" />}
      </>}
      {country === 'japan' && <circle cx="60" cy="40" r="23" fill="#bc002d" />}
      {(country === 'finland' || country === 'sweden') && <path d="M34 0h14v80H34zM0 33h120v14H0z" fill={country === 'finland' ? '#003580' : '#fecc00'} />}
      {country === 'greece' && <>
        {[1, 3, 5, 7].map(row => <rect key={row} x="0" y={row * 80 / 9} width="120" height={80 / 9} fill="#fff" />)}
        <path d="M0 0h44v44H0z" fill="#0d5eaf" /><path d="M17 0h10v44H17zM0 17h44v10H0z" fill="#fff" />
      </>}
    </svg>
  )
}

/** La estructura del simulacro no conoce países; una futura edición aporta este mismo contrato. */
export const flagsDemoExample: GuessWhoDemoExample = {
  edition: 'Banderas',
  question: '¿La bandera tiene color rojo?',
  answer: 'Sí',
  rivalQuestion: '¿Tiene un símbolo en el centro?',
  wrongGuess: { optionId: 'demo-canada', question: '¿Es Canadá?' },
  correctGuess: { optionId: 'demo-japan', question: '¿Es Japón?' },
  options: [
    { id: 'demo-canada', label: 'Canadá', visual: flagVisual('canada'), matchesAnswer: true },
    { id: 'demo-finland', label: 'Finlandia', visual: flagVisual('finland'), matchesAnswer: false },
    { id: 'demo-peru', label: 'Perú', visual: flagVisual('peru'), matchesAnswer: true },
    { id: 'demo-sweden', label: 'Suecia', visual: flagVisual('sweden'), matchesAnswer: false },
    { id: 'demo-japan', label: 'Japón', visual: flagVisual('japan'), matchesAnswer: true },
    { id: 'demo-greece', label: 'Grecia', visual: flagVisual('greece'), matchesAnswer: false },
  ],
}
