# Listo para jugar en todos los lobbies multijugador

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/99

## Comportamiento

Cada participante confirma su propio estado. La partida inicia automáticamente
cuando todos los miembros activos están listos y se cumple el mínimo del juego:
dos en ¿Quién es? individual, Dominó y Dúo Lógico; de dos a cuatro en Escaleras
y Serpientes; número par de dos a diez en ¿Quién es? grupal.

Mostrar estados por jugador, progreso de confirmaciones y opción de cancelar
la propia confirmación mientras espera. El anfitrión no puede confirmar a otros.
Los eventos antiguos de inicio tampoco permiten saltarse el consenso.

## Casos de cuidado

- Entradas nuevas y reconexiones en lobby comienzan sin confirmar.
- Salidas y desconexiones retiran al participante del lobby y reevaluan a los activos.
- Cambiar el tiempo por turno invalida las confirmaciones anteriores.
- Cuenta regresiva única y cancelable; no repartir tras un cambio de jugadores.
- Mantener las revanchas que ya requieren aceptación de todos. Reiniciar Dúo
  vuelve a la espera para que ambos confirmen.
- Conservar mecánicas, turnos, contenido y controles ajenos al inicio.

Rama única: `feat/lobby-ready-consensus`.

## Verificación

- Compilación de servidor y cliente correcta.
- Suite del servidor: 82 pruebas aprobadas, 42 de ellas sobre consenso,
  reconexión, salidas, cambios de configuración y conservación de revanchas.
- Lint de ambos proyectos sin errores; advertencias preexistentes en cliente.
- Cinco escenarios con dos navegadores aislados y Socket.IO real: estado
  compartido, cancelación, reconexión y comienzo automático por unanimidad.
- Pruebas integradas con repositorios ficticios; no se modifica la base de datos.

Para repetir la prueba de navegadores: compilar el servidor, iniciar Vite en
el puerto 5174 con `VITE_API_URL=http://127.0.0.1:3107` y ejecutar
`node server/test/lobby-ready.browser.mjs`. Requiere Chrome y Playwright;
`PLAYWRIGHT_MODULE` admite una instalación externa de Playwright.
El script inicia y cierra su propio servidor de prueba en el puerto 3107.

La publicación debe incluir servidor y cliente, porque los eventos de
confirmación y la validación del consenso se implementan en el backend.
