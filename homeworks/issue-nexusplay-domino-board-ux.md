# Nexus Play: Ecosistemas Sostenibles - tablero e instrucciones

## Objetivo

Mejorar la claridad visual del juego sin modificar sus reglas ni la lógica de las salas.

## Cambios solicitados

- Ajustar visualmente el tablero a medida que crece para evitar que el jugador tenga que desplazarse horizontalmente con una barra.
- Diferenciar fichas jugables, seleccionadas, no disponibles y fichas durante el turno rival.
- Resaltar la ficha seleccionada y mostrar visualmente los extremos donde puede colocarse.
- Mostrar instrucciones antes de entrar a la sala con una ficha de ejemplo.

## Criterios de aceptación

- La cadena completa del tablero permanece visible dentro del área de juego y se adapta al ancho disponible.
- Las fichas jugables, seleccionadas y no disponibles tienen estados visuales distinguibles.
- Las zonas de colocación reaccionan cuando existe una ficha seleccionada válida.
- Antes de crear o unirse a la sala se muestra una explicación breve de la mecánica.
- La explicación incluye un ejemplo visual de conexión de conceptos.
- La lógica de turnos, fichas y salas permanece intacta.
- La rama queda separada de `main` para revisión previa.
- Cliente y servidor compilan correctamente.
