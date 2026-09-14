# Nexus Play: Ecosistemas Sostenibles - finalización y revancha

## Objetivo

Replicar en el dominó el flujo final de "¿Quién Es?" para que el abandono y la revancha sean claros y estén sincronizados entre ambos jugadores.

## Cambios solicitados

- Mostrar al jugador que permanece el mismo modal visual de "¿Quién Es?" cuando el rival decide no continuar.
- Incluir el mensaje "[jugador] no quiso seguir jugando".
- Llevar automáticamente al jugador a la página inicial después de mostrar el aviso.
- Mantener la salida inmediata del jugador que decide retirarse.
- Hacer que una revancha aceptada por ambos arranque automáticamente para los dos participantes mediante la cuenta regresiva de reparto.

## Criterios de aceptación

- El aviso usa el mismo icono, estructura, botón, colores y animación del flujo final de "¿Quién Es?".
- El jugador que recibe el aviso vuelve automáticamente al inicio después de unos segundos o al pulsar "Entendido".
- Si ambos pulsan "Revancha", los dos reciben la cuenta regresiva y entran juntos a una partida nueva.
- Si uno pulsa "No, gracias" o "Salir", el otro recibe el aviso y la sala termina.
- La rama queda separada de `main` para revisión previa.
- Cliente y servidor compilan correctamente.