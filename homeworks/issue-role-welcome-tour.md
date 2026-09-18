# Recorrido interactivo de bienvenida por rol

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/89

## Objetivo

Orientar los primeros pasos en NexusPlay con una guía breve, visual y opcional.

## Alcance

- Invitación en Home para cada cuenta y rol, recordada en este dispositivo.
- Tres pasos para estudiantes y cuatro para profesores/administradores.
- Controles reales resaltados; avance, retroceso, cierre inmediato y Escape.
- Botón Guía en la cabecera para repetir el recorrido.
- Acciones voluntarias que abren el flujo existente de unión, creación o perfil.
- Estudiantes: mundos, portada de juego y código dentro del juego cuando admite salas.
- Profesores: unión, creación, Mis clases/Mis actividades y perfil.
- Administradores: unión, creación, navegación y herramientas administrativas.
- Sustituir el saludo de estudiantes para evitar dos bienvenidas simultáneas.
- No abrir automáticamente sobre enlaces a juegos ni modificar partidas o permisos.

Rama única: `feat/role-welcome-tour`.

## Criterios de aceptación

La guía se puede omitir y repetir; no vuelve automáticamente después de omitirla
o iniciarla. Las cuentas y roles tienen persistencia independiente. Un fallo de
almacenamiento no rompe el Home. Los estudiantes no reciben instrucciones de
creación o administración. Verificar flujos, teclado, móvil, build y lint antes
de integrar en main.

## Verificación

- Prueba de navegador reproducible: `client/test/welcome-tour.browser.cjs`.
  Con Vite en `http://127.0.0.1:5173`, Chrome y Playwright disponible, ejecutar
  `node client/test/welcome-tour.browser.cjs`. Si Playwright está instalado fuera
  del proyecto, indicar su ruta con `PLAYWRIGHT_MODULE`. No se añadieron dependencias.
- API simulada: no se usan cuentas reales ni se crean actividades/partidas.
- TEACHER, ADMIN y STUDENT: pasos, resaltado, restricciones de contenido,
  avance/retroceso, cierre, repetición, foco y Escape.
- Apertura del formulario existente de código, creación y perfil; selección
  de un mundo del estudiante sin bloquear su navegación.
- Persistencia entre recargas, cuentas y roles independientes, enlaces directos
  sin interrupción y almacenamiento de la guía bloqueado.
- Capturas de escritorio (1280 × 800) y móvil (390 × 844) revisadas.
- Pruebas de navegador aprobadas para los tres roles, incluyendo atrás/adelante.
- Compilación de producción aprobada, con aviso de tamaño del bundle.
- Lint aprobado con advertencias existentes, sin advertencias en la guía nueva.

La bienvenida se recuerda por cuenta y rol en este navegador; no modifica
preferencias en el servidor ni añade una configuración global.
