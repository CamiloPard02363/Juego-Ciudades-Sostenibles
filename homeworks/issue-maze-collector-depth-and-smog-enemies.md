# Recolector de Laberinto - profundidad visual y enemigos de contaminación

## Objetivo

Tras ver el resultado del PR anterior en producción, el usuario reportó que
seguía viéndose "horrible" (mosaico de colores al azar en los edificios) y
pidió una versión "3D" e "inspirada en Mario Bros". Se acordó explícitamente
con el usuario el alcance real:

- "3D" = más profundidad visual dentro del mismo canvas 2D (sombreado,
  sombras de contacto, degradado de fondo) — **no** un motor 3D real
  (WebGL/three.js).
- "Mario Bros" = solo la referencia de estilo/perspectiva — **no** se
  reescribe el motor de movimiento a plataformas con salto y gravedad; sigue
  siendo la misma cuadrícula de 4 direcciones ya probada.
- Corrección explícita del usuario: los enemigos son **nubes de
  contaminación**, no fantasmas — el cambio de sprite del PR anterior
  (fantasmas de arcade) se revierte conceptualmente aunque se mantiene la
  resolución de sprite más alta.

## Cambios realizados

- **Color de edificios por manzana, no por celda**: antes cada celda de
  pared tomaba un color al azar (hash de fila+columna), lo que en el layout
  CITY hacía que una sola manzana de 3x3 se viera como 9 colores distintos
  — un mosaico ilegible. Ahora el color se calcula por bloque de manzana
  (`cityBuildingPalette`), y toda la manzana comparte una paleta.
- **Paredes de layouts que no son CITY** (Clásico/Cruz/Espiral) usan una
  paleta calmada y única basada en `primaryColor` del juego, en vez de
  heredar el mosaico multicolor pensado para ciudades.
- **Sombreado por banda en los edificios**: franja superior más clara y
  franja inferior más oscura (derivadas del color base con una función de
  aclarar/oscurecer), simulando luz cayendo desde arriba sin gradientes
  reales — la técnica clásica de "falso 3D" en pixel art.
- **Enemigos vueltos a nube de contaminación**: silueta abultada sin el
  borde ondulado de fantasma, con "parches de smog" oscuros. Cuatro
  variantes de color por tipo de contaminación (smog gris, vapor tóxico
  verde, químico morado, smog industrial naranja) en vez de un arcoíris de
  colores de fantasma de juguete.
- **Sombras de contacto**: una elipse oscura bajo el camión y cada objeto
  coleccionable los "planta" en el piso en vez de flotar sobre un fondo
  plano; los enemigos (nubes) llevan una sombra más tenue para leerse como
  algo en el aire, no algo parado en la calle.
- **Calle con bordillo**: banda inferior más oscura en cada celda de camino,
  además del puntito amarillo ya existente.
- **Fondo tipo cielo** detrás del canvas (degradado celeste) para reforzar
  la sensación de escena exterior.
- HUD: ícono de vidas cambiado de fantasma a camión (🚛), ya que las vidas
  representan intentos del vehículo, no del enemigo.

## Fuera de alcance (confirmado con el usuario)

- No hay motor 3D real ni nueva dependencia de renderizado.
- No hay salto, gravedad, ni escaleras — el movimiento sigue siendo el
  mismo grid de 4 direcciones de `useMazeCollectorGame.ts` (sin cambios en
  ese archivo).
- No se replican sprites de ninguna imagen de referencia específica —
  sigue siendo pixel art propio construido a mano con matrices de números.

## Criterios de aceptación

- Una manzana completa del layout CITY se ve de un solo color (no un
  mosaico), con banda clara arriba y oscura abajo.
- Los enemigos se leen como nubes/smog, no como fantasmas de arcade.
- El camión y los objetos tienen una sombra visible bajo ellos; las nubes
  tienen una sombra más sutil.
- Build y lint limpios en client; `useMazeCollectorGame.ts` y el validador
  de contenido del servidor no cambian (cambio puramente de presentación).
