# Ampliar los pasos de la guía existente del panel

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/111

Conservar los pasos actuales, la estética, el inicio, el cierre y la repetición
de la guía de NexusPlay. Añadir explicaciones breves para las opciones de
navegación que solo se mencionaban en conjunto o no se explicaban.

- Panel adulto: Inicio, Materias, Comunidad, actividades/juegos propios,
  búsqueda, contraer/expandir menú y tema claro/oscuro.
- Profesor: Mis clases. Organización únicamente si tiene acceso.
- Administrador global: Usuarios, Organización y Temas.
- Estudiante: Volver a los mundos cuando está dentro de una materia.
- Perfil, configuración, salida, creación y unirse conservan su explicación actual.

Cada nuevo paso debe señalar el control real y no ofrecer opciones ajenas
al rol. No se cambia la clave de bienvenida ni se vuelve a forzar el recorrido
a las cuentas que ya lo vieron.

Rama única: `feat/extend-navigation-tour`.

## Verificación

- Compilación del cliente correcta y lint sin errores (advertencias preexistentes).
- Prueba de navegador para profesor, profesor administrador de organización,
  administrador global y estudiante: objetivos reales, permisos, acciones,
  atrás/siguiente, cierre, repetición y persistencia por cuenta y rol.
- Navegación con menú contraído, tarjeta visible en móvil y revisión de capturas.
- El botón Volver solo se explica si existe en la vista del estudiante.
- Sin cambios en CSS ni en las clases visuales de la tarjeta de la guía.
- API simulada: no se usan cuentas reales ni se modifica la base de datos.

Repetir con Vite local y `node client/test/welcome-tour.browser.cjs`.
Requiere Chrome y Playwright; `PLAYWRIGHT_MODULE` permite indicar una instalación
externa y `TOUR_TEST_URL` el origen local de Vite.
