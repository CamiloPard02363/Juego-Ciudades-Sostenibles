# ¿Quién Es? - controles de compartir y pop de acusación

## Objetivo

Mejorar la claridad visual de la sala de "¿Quién Es?" para compartir partidas y comunicar una acusación incorrecta.

## Cambios solicitados

- Separar los controles de copiar código y copiar enlace.
- Mostrar texto visible en cada control: `Copiar código` y `Copiar enlace`.
- Diferenciar visualmente el enlace como acción principal y mostrar feedback al copiar.
- Incorporar `Bandera equivocada` dentro del mensaje flotante de cambio de turno.
- Mantener el turno siguiente y su cuenta regresiva sin cambios de funcionalidad.
- Aplicar el comportamiento en partidas 1v1 y torneos.

## Criterios de aceptación

- Los botones de código y enlace se identifican sin depender solo de iconos.
- Ambos botones copian el valor correcto y muestran confirmación temporal.
- Una acusación fallida muestra el pop de turno con `Bandera equivocada` y el turno del jugador siguiente.
- El pop sigue desapareciendo automáticamente y no bloquea las acciones del tablero.
- El build del cliente termina correctamente.
