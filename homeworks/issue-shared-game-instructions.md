# Instructivo previo compartido basado en Ecosistemas sostenibles

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/117

Usar el instructivo actual de Dominó (Nexus Play: Ecosistemas Sostenibles)
como único modelo: mismo Modal de 520 px, diseño, colores, iconos, tipografía,
ejemplo de dos tarjetas, animaciones y botón Entendido, continuar.

Cambiar únicamente los textos del objetivo, mecánica y ejemplo para parejas,
opuestos, ¿Quién es? individual/grupal, Dominó, Laberinto recolector,
Escaleras y Serpientes, Dúo Lógico y su variante de plataformas (incluida demo).

La referencia no usa duración automática: espera a que la persona continúe.
Mantener botón, Escape y clic fuera como formas de continuar. No iniciar
partidas, crear/unir salas ni activar cronómetros/controles antes de continuar.
Conservar enlaces directos, configuración de juego, lobbies y revanchas.

Rama única: `feat/shared-game-instructions`.

Verificar contenido, entrada real en cada modalidad, espera sin iniciar,
continuación única, responsive, teclado, compilación y regresión de lobbies
antes de integrar en main.

## Verificación realizada

- `npm.cmd run build --workspace=client`: correcto; conserva las clases y estilos de la referencia, sin modificar CSS. Aviso existente de tamaño de bundle.
- `npm.cmd run lint --workspace=client`: sin errores; advertencias existentes en componentes ajenos a este cambio.
- `node server/test/lobby-ready.browser.mjs`: cinco salas con dos jugadores reales de prueba (profesor y estudiante), gateway Nest/Socket.IO y repositorios aislados. Confirma espera antes de entrar, enlaces, chat, salida/reingreso, permisos, configuración, móvil, teclado, reconexión y comienzo por unanimidad.
- `node client/test/game-instructions.browser.cjs`: compilación de producción servida con preview en :4174. Parejas, opuestos, laberinto, plataformas y demo; entrada real, ausencia de tableros/canvas antes de continuar, sin cierre automático, estructura/estilos/iconos idénticos, móvil y teclado, botón/Escape/fondo y montaje del juego después.
- Capturas de escritorio y móvil revisadas; `git diff --check` correcto.
- Rama actualizada sobre main `0ca1f88` (modo infantil por edad), compilación y pruebas de navegador repetidas; `npm.cmd test --workspace=client`: 9 pruebas correctas.

Las pruebas usan Chrome y Playwright (`PLAYWRIGHT_MODULE` permite indicar una instalación externa). No usan la base de datos ni credenciales reales.

Limitación preexistente: en Vite de desarrollo, StrictMode desmonta el motor Pixi mientras su inicialización asíncrona sigue pendiente; `DualQuestPixiGame.destroy()` accede a `this.pixi.app` sin inicializar. Ese código está igual en main y no se modifica aquí. Las pruebas completas de plataformas pasan en la compilación de producción. No se cambian sus mecánicas ni su motor.
