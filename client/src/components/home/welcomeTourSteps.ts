export type WelcomeStep = {
  title: string
  text: string
  target: string
  icon: 'play' | 'create' | 'explore' | 'profile'
  action?: string
}

export type WelcomeOptions = {
  canAccessOrganization?: boolean
  canGoBackToWorlds?: boolean
}

export function getWelcomeSteps(role: string, options: WelcomeOptions = {}): WelcomeStep[] {
  const profile: WelcomeStep = {
    title: 'Tu espacio, a un toque',
    text: 'En tu perfil puedes ajustar tus datos o salir. Usa Guía cuando quieras repetir este recorrido.',
    target: 'profile', icon: 'profile', action: 'Abrir mi perfil',
  }
  if (role === 'STUDENT') return [
    { title: 'Elige tu mundo', text: 'Toca una materia y descubre sus juegos. Si aún no hay mundos, pídele a tu profe que publique un juego.', target: 'worlds', icon: 'explore' },
    { title: '¡A jugar con tu equipo!', text: 'Elige la portada de un juego. Si tu profe te dio un código de sala, escríbelo en ese juego y toca Unirme. Para jugar por tu cuenta, toca Jugar.', target: 'worlds', icon: 'play', action: 'Explorar juegos' },
    ...(options.canGoBackToWorlds ? [{
      title: 'Descubre otro mundo', text: 'Toca Volver para regresar a las materias y elegir otra aventura.',
      target: 'worlds-back', icon: 'explore' as const, action: 'Volver a los mundos',
    }] : []),
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
  })
  steps.push(
    { title: 'Vuelve al inicio', text: 'Inicio te lleva al panel principal para volver a explorar los juegos.', target: 'nav-home', icon: 'explore', action: 'Ir al inicio' },
    { title: 'Explora por materia', text: 'En Materias encuentras los juegos organizados por lo que quieres aprender o enseñar.', target: 'nav-subjects', icon: 'explore', action: 'Ver materias' },
  )
  if (role === 'TEACHER') steps.push({
    title: 'Tus grupos, en Mis clases', text: 'Organiza tus grupos y abre una clase para consultar o agregar sus actividades.', target: 'nav-classes', icon: 'explore', action: 'Ver mis clases',
  })
  steps.push(
    { title: 'Descubre la Comunidad', text: 'Explora los juegos que otras personas comparten en Comunidad.', target: 'nav-community', icon: 'play', action: 'Explorar comunidad' },
    { title: role === 'TEACHER' ? 'Encuentra tus actividades' : 'Tus juegos privados', text: role === 'TEACHER' ? 'En Mis actividades encuentras tus creaciones para consultarlas y seguir trabajando en ellas.' : 'En Mis juegos privados encuentras tus juegos que no están publicados para la comunidad.', target: 'nav-own-games', icon: 'create', action: role === 'TEACHER' ? 'Ver mis actividades' : 'Ver mis juegos privados' },
  )
  if (role === 'ADMIN') steps.push(
    { title: 'Prueba la apariencia', text: 'Temas te permite probar los modos visuales en este dispositivo, sin cambiar la apariencia de otros usuarios.', target: 'nav-themes', icon: 'explore', action: 'Explorar temas' },
    { title: 'Gestiona los usuarios', text: 'En Usuarios puedes consultar y administrar las cuentas de NexusPlay.', target: 'nav-users', icon: 'profile', action: 'Ver usuarios' },
  )
  if (role === 'ADMIN' || options.canAccessOrganization) steps.push({
    title: 'Tu organización', text: 'Abre Organización para consultar y gestionar las organizaciones a las que tienes acceso.', target: 'nav-organization', icon: 'explore', action: 'Ver organización',
  })
  steps.push(
    { title: 'Encuentra un juego', text: 'Escribe en Buscar juegos y pulsa Enter o la lupa. Borra el texto para volver a ver el listado completo.', target: 'search', icon: 'explore', action: 'Probar la búsqueda' },
    { title: 'Más espacio para jugar', text: 'Usa esta flecha para contraer o expandir el menú. Sus opciones siguen disponibles como iconos.', target: 'menu-toggle', icon: 'explore', action: 'Cambiar tamaño del menú' },
    { title: 'Claro u oscuro, tú eliges', text: 'El sol activa el tema claro y la luna el oscuro. La elección se recuerda en este dispositivo.', target: 'theme-toggle', icon: 'explore', action: 'Elegir apariencia' },
    profile,
  )
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
