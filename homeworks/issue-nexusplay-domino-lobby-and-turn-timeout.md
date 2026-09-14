# Nexus Play: Ecosistemas Sostenibles - lobby y cambio automático de turno

## Objetivo

Mejorar el juego "Nexus Play: Ecosistemas Sostenibles" manteniendo los cambios aislados de `main` para su revisión.

## Cambios solicitados

- Pasar automáticamente el turno al siguiente jugador cuando se agote el tiempo configurado.
- Permitir que el anfitrión escriba manualmente la duración del turno, validando valores entre 5 y 120 segundos.
- Replicar en el lobby del dominó la composición final de "¿Quién Es?": jugadores, configuración del tiempo, estado visible para el rival y acciones de inicio con el mismo estilo y comportamiento.

## Criterios de aceptación

- Un turno vencido nunca deja la partida congelada; el siguiente jugador recibe el turno y un nuevo contador.
- El anfitrión puede escribir directamente cualquier entero válido entre 5 y 120.
- El rival ve el valor configurado, pero no puede editarlo.
- Solo el anfitrión puede iniciar la partida; el rival ve el estado de espera correspondiente.
- El lobby conserva sus acciones de sala, código, enlace y salida.
- Cliente y servidor compilan correctamente.
- La rama permanece separada de `main` hasta aprobar la revisión.