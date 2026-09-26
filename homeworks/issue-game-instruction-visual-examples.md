# Personalizar los ejemplos visuales del instructivo previo

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/121

Los textos del instructivo ya son correctos. El ejemplo todavía fija los iconos de sol y hoja para todas las mecánicas. Hacer dinámicos los cuatro iconos, sus acciones y la frase inferior por tipo de juego, conservando el modal y todos los estilos, colores, dimensiones, símbolos y comportamientos actuales.

Cubrir parejas, opuestos, ¿Quién es? individual y torneo, Dominó, laberinto, escaleras y serpientes, Dúo Lógico y plataformas. No cambiar la explicación principal ni la lógica de entrada a los juegos.

Rama única: `fix/game-instruction-visual-examples`.

Verificar compilación, lint, pruebas existentes de instructivos, escritorio/móvil y continuidad del juego antes de integrar en main.

## Cambio

Cada modalidad declara cuatro iconos Lucide junto a sus acciones y frase inferior. Dominó conserva su ejemplo de conceptos coincidentes; las demás modalidades ya no heredan sol/hoja. Se conserva íntegro el texto principal y todos los estilos, dimensiones, colores por posición, símbolos, accesibilidad y comportamiento del instructivo.

## Verificación

- Compilación del cliente correcta; lint sin errores nuevos (avisos preexistentes).
- Prueba de navegador en producción: parejas, opuestos, laberinto actualizado, plataformas y demo. Iconos propios, estructura/estilos conservados, escritorio/móvil, teclado y juego activo tras continuar.
- Prueba de cinco salas con dos jugadores: ejemplos visuales distintos y regresión de enlaces, chat, permisos, configuración, reconexión e inicio por unanimidad. Capturas claras y oscuras revisadas.
- Rama actualizada sobre main `d87a386`; no se cambian las mecánicas ni la base de datos.
