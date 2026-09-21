# Unificar lobbies multijugador con la referencia de ¿Quién es? – Banderas

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/113

Extraer el lobby funcional de ¿Quién es? a un componente compartido y usarlo
en ¿Quién es? individual/grupal, Dominó, Escaleras y Serpientes y Dúo Lógico.

Misma estructura, ancho, diseño, botones Chat/Salir/Copiar código/Copiar enlace,
jugadores, configuración y confirmación Listo para jugar. Conservar actividad,
código, cupo, permisos y destino reales; Dúo mantiene Fuego/Agua y juego
simultáneo sin inventar un temporizador por turnos. Mantener las mecánicas y
revanchas actuales, incluida la confirmación unánime de los participantes.

Añadir chat real a las salas que no lo tienen y configuración de duración del
turno en Escaleras con sus límites existentes. Reutilizar el mismo socket de
cada juego. Validar pertenencia a la sala y permisos en el servidor.

Comprobar con dos navegadores los cinco lobbies: datos, compartir, chat aislado,
configuración, permisos, confirmación/cancelación, reconexión e inicio del juego
correcto; vistas móviles, teclado, compilación y pruebas antes de main.

Rama única: `feat/shared-multiplayer-lobby`.

## Verificación realizada

- 146 pruebas del servidor aprobadas, incluidas 17 nuevas comprobaciones sobre
  chat (identidad, pertenencia, conexiones reemplazadas, aislamiento y límites)
  y configuración de turnos de Escaleras.
- Dos navegadores y Socket.IO real en los cinco tipos de lobby: enlaces,
  salida/reingreso, chat bidireccional, configuración, permisos, voto/cancelación,
  reconexión e inicio automático de la actividad correcta.
- Capturas de escritorio y móvil, ausencia de desbordamiento horizontal y
  navegación por teclado con foco dentro del lobby/chat.
- Compilación de servidor y cliente; lint sin errores y con advertencias previas.
- Datos ficticios en pruebas; ninguna migración ni modificación de base de datos.

Repetir: compilar servidor, iniciar Vite en 5174 con
`VITE_API_URL=http://127.0.0.1:3107` y ejecutar
`node server/test/lobby-ready.browser.mjs` con Chrome y Playwright disponibles.
`PLAYWRIGHT_MODULE` permite indicar una instalación externa.

El despliegue requiere cliente y servidor para habilitar el chat y la
configuración de todas las salas. Las reglas de juego, los cupos, las fases
propias del torneo y las animaciones de reparto existentes se conservan.
