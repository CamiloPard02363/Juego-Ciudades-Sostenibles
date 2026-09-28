# Jerarquía de título y edición en la tarjeta Identidad Oculta

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/177

En el Home, destacar «Identidad Oculta» como título y mostrar debajo «Banderas» en menor tamaño. Aplicar únicamente a la actividad GUESS_WHO con slug `quien-es-de-banderas`. Conservar descripción completa, portada, estilo, enlace y comportamiento. No cambiar MongoDB ni las otras tarjetas o secciones.

Rama única: `fix/identidad-oculta-card-hierarchy`.

Verificado: compilación correcta, lint sin errores nuevos y diff sin errores de espacios. Home en navegador con datos aislados a 1280, 390 y 320 px (menú contraído en móvil): título de 22 px, edición de 14 px debajo, descripción completa, sin desbordamiento. Otras tarjetas —incluido otro GUESS_WHO— mantienen su título de 15 px y no reciben edición. El mismo juego en Comunidad conserva su presentación anterior. Enter abre el detalle con el slug original. Captura móvil revisada. No se modifica MongoDB.
