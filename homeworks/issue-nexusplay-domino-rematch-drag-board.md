# Nexus Play: Ecosistemas Sostenibles - revancha, tablero y arrastre

## Objetivo

Mejorar el flujo de finalización y la interacción del tablero del dominó sin modificar `main` hasta completar la revisión.

## Cambios solicitados

- Cuando un jugador decide no jugar otra partida, llevar automáticamente a ambos participantes a la página inicial.
- Mantener el aviso visual al jugador que permanece, indicando que el rival no quiso seguir jugando.
- Ajustar visualmente el tablero completo para que las fichas nuevas sigan entrando en un único plano visible.
- Permitir arrastrar con el mouse una ficha válida desde la mano hacia el extremo izquierdo o derecho del tablero.
- Conservar la interacción actual por selección y clic.

## Criterios de aceptación

- El jugador que pulsa "No, gracias" o "Salir" vuelve a la página inicial.
- El rival recibe el mensaje de abandono y vuelve automáticamente a la página inicial después de verlo.
- Ambos extremos válidos aceptan fichas arrastradas.
- Las fichas no válidas no se pueden arrastrar ni colocar.
- El tablero escala su contenido para mostrar todas las fichas sin barra horizontal.
- La rama queda aislada para revisión antes de fusionarse con `main`.
- Cliente y servidor compilan correctamente.
