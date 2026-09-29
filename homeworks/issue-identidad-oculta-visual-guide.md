# Simulacro visual previo de Identidad Oculta

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/187

Ampliar GameInstructionsGate con cinco escenas: objetivo, pregunta Sí/No, descarte, cambio de turno e intento de adivinanza incorrecto/correcto. Conservar Modal, estilo y continuación por Escape o fondo. Anterior/Siguiente, progreso y botón final «¡Entendido, vamos a jugar!».

Inspección: GUESS_WHO identifica el duelo, GUESS_WHO_GROUP el torneo; el gate se monta antes de las sesiones y sus hooks de sockets. La edición Banderas se identifica hoy por slug en Home, sin configuración de tutorial en backend. El gateway exige turno activo y tres descartes para acusar; una acusación incorrecta pasa el turno. Preguntas y respuestas se comunican entre participantes (chat), no hay un motor automático de validación Sí/No. Pasar turno es una acción explícita; también hay vencimiento de reloj real.

Usar contenido ilustrativo independiente y configurable por propiedades, con ejemplo Banderas predeterminado claramente identificado como ejemplo. No leer ni escribir estado de salas desde el simulacro. No cambiar backend, datos, Socket.IO, dependencias ni mecánica.

Rama única: `feat/identidad-oculta-visual-guide`. Publicar mediante Pull Request para revisión; no fusionar a main. Conservar archivos locales previos.

Implementación: el gate existente reutiliza su Modal y continuación. GuessWhoVisualDemo maneja únicamente escenas locales; guessWhoDemoExamples separa imágenes, opciones y preguntas. Banderas es un ejemplo explícito, configurable mediante guessWhoExample. Los tres descartes del ejemplo respetan el requisito real para acusar. El acierto se muestra manualmente en otro turno, sin temporizadores.

Verificación: compilación de producción correcta; 50 pruebas del cliente aprobadas; lint sin errores (advertencias previas); git diff --check limpio. Prueba de navegador en 1280, 390 y 320 px, teclado y movimiento reducido. Regresión local de los cinco lobbies con repositorios en memoria: chat, permisos, reconexión e inicio por unanimidad; el estado de sala permanece idéntico durante el recorrido. Sin cambios de backend, base de datos ni dependencias. Pendiente de revisión antes de integrar a main.
