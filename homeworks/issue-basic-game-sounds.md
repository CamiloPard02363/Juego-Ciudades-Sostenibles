# Sonidos y ajustes de espacio en Identidad Oculta y MatchMente

Una sola rama y un solo PR: `feat/basic-game-sounds`.

## Alcance
- Base reutilizable de efectos sintetizados, sin dependencias ni archivos externos.
- Identidad Oculta (individual y torneo): turno propio, descartes confirmados y acusación fallida.
- MatchMente (parejas/opuestos): voltear, acierto, error, tiempo agotado y final.
- Botón accesible para silenciar; preferencia local persistente.
- Ambientación instrumental suave durante la partida, controlada por el mismo icono. Se detiene al salir, terminar la partida, silenciar u ocultar la pestaña.
- Cabecera compacta de Identidad Oculta con título, Salir e iconos de sonido y copiar código.
- Temporizador compacto con botón visible «Pasar turno» integrado.
- Instructivo adaptado al espacio disponible conservando sus escenas y contenido.
- Aplauso sintetizado al acertar: funciona, pero su calidad sonora fue rechazada en la revisión y está pendiente de mejora.
- No alterar reglas, sockets, salas, puntuación ni backend.

## Verificación
- Compilar cliente y comprobar pruebas existentes.
- Revisar control por teclado, persistencia del silencio y ausencia de sonido antes de interactuar.
- Revisar que repetir un estado no repita sonidos.

## Pendiente antes de aprobar la entrega
- Mejorar el aplauso y validar cómo suena con la responsable del proyecto.
- Revisión por el equipo antes de integrar a main. La tarea de páginas legales queda fuera de esta entrega.
