import { describe, expect, it } from 'vitest'
import { savedDestinationCopy } from './createdGameSummary'

describe('savedDestinationCopy (issue #2)', () => {
  it('usa "juego" para estudiante y "actividad" para el resto de roles', () => {
    expect(savedDestinationCopy('STUDENT', 'private').heading).toBe('Juego guardado en Mis juegos privados')
    expect(savedDestinationCopy('teacher', 'community').heading).toBe('Actividad guardada en Comunidad')
    expect(savedDestinationCopy('ADMIN', 'private').heading).toBe('Actividad guardada en Mis juegos privados')
  })

  it('el docente ve "Mis actividades" como destino privado', () => {
    expect(savedDestinationCopy('TEACHER', 'private').destination).toBe('Mis actividades')
  })
})
