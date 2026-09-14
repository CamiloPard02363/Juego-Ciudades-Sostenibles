# Nexus Play: Ecosistemas Sostenibles - duración de turnos y aviso de salida

## Objetivo

Corregir dos problemas del juego "Nexus Play: Ecosistemas Sostenibles" sin modificar la rama `main` hasta terminar la revisión:

1. Hacer funcional y editable la duración de los turnos desde el lobby.
2. Avisar al participante que permanece en la sala cuando el rival decide no continuar después de la partida, ya sea usando "No, gracias" o "Salir".

## Criterios de aceptación

- El anfitrión puede escribir valores entre 5 y 120 segundos sin que el campo restablezca el número mientras escribe.
- El valor confirmado se conserva al iniciar la partida y se usa para el temporizador de cada turno.
- Si un jugador abandona desde la pantalla final, el otro recibe un mensaje indicando que no quiso seguir jugando.
- El mensaje también aparece cuando el jugador pulsa "No, gracias" en la revancha.
- El flujo de salida y revancha existente sigue funcionando.
- Los cambios permanecen en una rama nueva para revisión antes de fusionarse con `main`.
- Cliente y servidor compilan correctamente.