# Nexus Play: Ecosistemas Sostenibles - lobby estilo ¿Quién Es?

## Objetivo

Replicar exactamente el estilo visual del lobby del juego "¿Quién Es?" en el lobby del juego "Nexus Play: Ecosistemas Sostenibles", conservando toda la lógica y la funcionalidad del juego y evitando tocar la rama main hasta revisarlo.

## Cambios solicitados

- Mantener la misma composición visual del lobby de "¿Quién Es?": encabezado, bloques de información, paneles de sala, jugadores, controles y botón principal.
- Reutilizar la misma forma, proporciones, espaciado y estilo de botones/inputs para el lobby del dominó sostenible.
- Mantener intacta la lógica del juego: creación de sala, unión por código, estado de espera, duración por turno, inicio de partida y flujo del juego.
- Dejar la revisión en una rama nueva y aislada para poder comparar los cambios antes de fusionarlos en main.

## Criterios de aceptación

- El lobby del juego "Nexus Play: Ecosistemas Sostenibles" adopta la misma estética y estructura visual del lobby de "¿Quién Es?".
- Se mantienen todos los botones y controles funcionales originales del dominó.
- No se modifica la lógica del juego ni la mecánica interna.
- La rama de trabajo queda separada de main para revisión previa.
- La compilación del cliente sigue funcionando correctamente en la rama de revisión.
