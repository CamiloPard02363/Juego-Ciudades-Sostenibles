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

/**
 * `isKids` (no `role === 'STUDENT'` a secas) decide el set de pasos: un
 * STUDENT de 10+ años ve el Home normal (Sidebar, no KidsHomeShell — ver
 * isKidsMode en utils/kidsMode.ts), así que necesita los pasos "normales" con
 * sus mismos `target` (data-tour) reales — los pasos de kids apuntan a
 * elementos que solo existen en KidsHomeShell y no encontrarían nada ahí.
 */
export function getWelcomeSteps(role: string, isKids: boolean, options: WelcomeOptions = {}): WelcomeStep[] {
  const profile: WelcomeStep = {
    title: 'Tu espacio, a un toque',
    text: 'En tu perfil puedes ajustar tus datos o salir. Usa Guía cuando quieras repetir este recorrido.',
    target: 'profile', icon: 'profile', action: 'Abrir mi perfil',
  }
  if (isKids) return [
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
    { title: 'Gestiona los usuarios', text: 'En Usuarios puedes consultar y administrar las cuentas de NexusPlay.', target: 'nav-users', icon: 'profile', action: 'Ver usuarios' },
  )
  if (role === 'ADMIN' || options.canAccessOrganization) steps.push({
    title: 'Tu organización', text: 'Abre Organización para consultar y gestionar las organizaciones a las que tienes acceso.', target: 'nav-organization', icon: 'explore', action: 'Ver organización',
  })
  steps.push(
    { title: 'Encuentra un juego', text: 'Escribe en Buscar juegos y pulsa Enter o la lupa. Borra el texto para volver a ver el listado completo.', target: 'search', icon: 'explore', action: 'Probar la búsqueda' },
    { title: 'Más espacio para jugar', text: 'Usa esta flecha para contraer o expandir el menú. Sus opciones siguen disponibles como iconos.', target: 'menu-toggle', icon: 'explore', action: 'Cambiar tamaño del menú' },
    { title: 'Claro u oscuro, tú eliges', text: 'El sol activa el tema claro y la luna el oscuro. La elección se recuerda en este dispositivo.', target: 'theme-toggle', icon: 'explore', action: 'Elegir apariencia' },
    { title: 'Tu configuración, a la mano', text: 'La tuerca junto a tu nombre abre tu configuración: tus datos de perfil y los temas de la página, en un solo lugar.', target: 'settings', icon: 'profile', action: 'Abrir configuración' },
    profile,
  )
  return steps
}

/**
 * Fases de la bienvenida: "greeting" es la tarjeta de bienvenida que sale en
 * TODA carga o login (sin importar si la cuenta ya vio la guía antes), "invite"
 * la invitación obligatoria de la flecha a "Guía" (primera vez de una cuenta) y
 * "tour" el recorrido paso a paso.
 */
export type WelcomePhase = 'greeting' | 'invite' | 'tour' | 'closed'

/**
 * El saludo solo abre si se entra directo al inicio: un enlace a una sala, un
 * juego u otra sección no se interrumpe (y tampoco se aplaza para cuando se
 * vuelva al inicio, que sería el saludo "en cada regreso", no "en cada
 * ingreso"). Fuera del inicio queda solo la invitación de la primera vez.
 *
 * `alreadyGreeted` viene de un estado solo en memoria (ver `hasGreetedThisSession`
 * más abajo): sigue en pie mientras se navega dentro de la app (salir de un
 * juego, terminar una partida y volver al lobby no debe reabrir la tarjeta),
 * pero se pierde al recargar la página o abrir una pestaña nueva — ahí sí
 * vuelve a salir, sin importar si la cuenta ya la vio antes.
 */
export function initialWelcomePhase(startsAtHome: boolean, seen: boolean, alreadyGreeted: boolean): WelcomePhase {
  if (startsAtHome) return alreadyGreeted ? phaseAfterGreeting(seen) : 'greeting'
  return seen ? 'closed' : 'invite'
}

/**
 * Al cerrar la tarjeta sin abrir el recorrido, quien ya hizo la guía vuelve al
 * inicio y quien nunca la hizo sigue viendo su invitación obligatoria de
 * siempre. (Sin tratamiento especial para cuentas nuevas por ahora.)
 */
export function phaseAfterGreeting(seen: boolean): WelcomePhase {
  return seen ? 'closed' : 'invite'
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

/**
 * Marca de solo memoria (nunca `localStorage`) para que la tarjeta de
 * bienvenida no se repita por navegar dentro de la misma sesión del
 * navegador, pero sí vuelva a salir en cada recarga real de la página o
 * pestaña nueva, que reinicia todo el estado de JS.
 */
const greetedThisSession = new Set<string>()
export function hasGreetedThisSession(key: string) {
  return greetedThisSession.has(key)
}
export function markGreetedThisSession(key: string) {
  greetedThisSession.add(key)
}
