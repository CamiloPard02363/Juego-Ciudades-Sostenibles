# Mostrar completas las descripciones de las tarjetas de juegos

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/165

Eliminar el recorte de dos líneas en GameCard para que se lean las descripciones completas. Mantener tipografía, colores, bordes e iconos; permitir altura según contenido y conservar la alineación de la cuadrícula. Ajustar palabras largas sin desbordamiento en móvil. Sin cambios de textos ni base de datos.

Rama única: `fix/home-card-full-descriptions`.

Verificar compilación y presentación real del Home en escritorio y móvil antes de integrar.

Verificado: compilación del cliente correcta y lint sin errores (advertencias preexistentes). Prueba local de navegador sobre Home con datos aislados: anchos 1280, 768, 390 y 320 px; textos completos, tipografía de 13 px, palabras largas sin desbordar, altura de portada conservada y tarjetas alineadas por fila. En móvil se usa el control existente para contraer el menú. La tarjeta sigue abriendo su detalle con Enter. Capturas revisadas. No se modifican textos, MongoDB ni mecánicas.
