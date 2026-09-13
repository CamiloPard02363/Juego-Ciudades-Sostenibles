# ¿Quién Es? - acusación fallida y compartir sala

## Problemas

- Cuando una acusación de bandera falla, el aviso no indica claramente que la bandera fue equivocada ni quién tiene el turno siguiente.
- La sala muestra el código, pero no ofrece un enlace compartible que abra directamente la sala al recibirlo.

## Alcance

- Mostrar `Bandera equivocada` y el nombre del jugador cuyo turno comienza después de una acusación incorrecta.
- Mantener el avance de turno actual del servidor.
- Añadir una acción para copiar el enlace de la sala junto al código.
- Resolver el parámetro `sala` al abrir el enlace y entrar automáticamente a la sala correcta.
- Cubrir salas 1v1 y lobbies de torneo de ¿Quién Es?.

## Criterios de aceptación

- Una acusación incorrecta muestra `Bandera equivocada` y `Turno de <jugador siguiente>` en ambos clientes.
- El turno sigue cambiando una sola vez y el temporizador continúa funcionando.
- El botón de enlace copia una URL que contiene el código de sala.
- Abrir esa URL autenticado resuelve la sala y muestra el flujo de unión correspondiente.
- No se modifica el contenido específico de ningún juego ni se integra el cambio en `main` hasta verificarlo.
