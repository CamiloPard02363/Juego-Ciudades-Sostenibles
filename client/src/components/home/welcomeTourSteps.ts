export type WelcomeStep = {
  title: string
  text: string
  target: string
  icon: 'play' | 'create' | 'explore' | 'profile'
  action?: string
}

export function getWelcomeSteps(role: string): WelcomeStep[] {
  const profile: WelcomeStep = {
    title: 'Tu espacio, a un toque',
    text: 'En tu perfil puedes ajustar tus datos o salir. Usa Guía cuando quieras repetir este recorrido.',
    target: 'profile', icon: 'profile', action: 'Abrir mi perfil',
  }
  if (role === 'STUDENT') return [
    { title: 'Elige tu mundo', text: 'Toca una materia y descubre sus juegos. Si aún no hay mundos, pídele a tu profe que publique un juego.', target: 'worlds', icon: 'explore' },
    { title: '¡A jugar con tu equipo!', text: 'Elige la portada de un juego. Si tu profe te dio un código de sala, escríbelo en ese juego y toca Unirme. Para jugar por tu cuenta, toca Jugar.', target: 'worlds', icon: 'play', action: 'Explorar juegos' },
    profile,
  ]
  const steps: WelcomeStep[] = [
    { title: 'Entra con un código', text: '¿Te invitaron a una partida? Toca Unirme con código y escribe el código de sala que te compartieron.', target: 'join', icon: 'play', action: 'Probar con un código' },
  ]
  if (role === 'TEACHER' || role === 'ADMIN') steps.push({
    title: 'Crea tu primera actividad', text: 'Elige un tipo de juego, prepara el contenido y guarda tu actividad. Desde su sala podrás invitar a jugar.', target: 'create', icon: 'create', action: 'Crear una actividad',
  })
  steps.push({
    title: 'Todo tiene su lugar',
    text: role === 'TEACHER'
      ? 'Mis clases reúne tus grupos. Mis actividades guarda tus creaciones y Comunidad te permite descubrir juegos compartidos.'
      : role === 'ADMIN'
        ? 'Explora Materias y Comunidad. En Usuarios y Organización administras la plataforma; Temas te permite probar su apariencia.'
        : 'Explora Materias y Comunidad para encontrar juegos. Tus juegos privados están en el menú.',
    target: 'navigation', icon: 'explore',
  }, profile)
  return steps
}

const seenInMemory = new Set<string>()
export function welcomeStorageKey(userId: string, role: string) {
  return `nexusplay-welcome-v1:${encodeURIComponent(userId)}:${role}`
}
export function hasSeenWelcome(key: string) {
  try { return seenInMemory.has(key) || localStorage.getItem(key) === 'seen' }
  catch { return seenInMemory.has(key) }
}
export function markWelcomeSeen(key: string) {
  seenInMemory.add(key)
  try { localStorage.setItem(key, 'seen') } catch { /* La guía funciona sin almacenamiento. */ }
}
