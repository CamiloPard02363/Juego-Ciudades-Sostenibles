# Recolector de Laberinto - fantasmas y sprites más detallados

## Objetivo

El usuario compartió una imagen de referencia (arte pixel muy elaborado,
estilo arcade retro, con fantasmas de colores, un camión de reciclaje
detallado, puntos en el camino y edificios de ladrillo) y pidió que el
juego se viera así. Como esa referencia es una vista lateral tipo
plataformas (con escaleras) y el motor actual es vista superior (grid de 4
direcciones, como el Pac-Man original), se acordó con el usuario **mantener
la mecánica de vista superior ya probada** y en su lugar subir mucho el
nivel de detalle de los sprites dentro de esa misma técnica (pixel art
dibujado a mano en canvas, sin imágenes externas).

## Cambios solicitados

- Reemplazar el enemigo genérico ("nube con ojos") por un **fantasma
  clásico de arcade real**: cúpula redondeada, ojos con pupilas, borde
  inferior ondulado — en 4 colores distintos (rojo, rosa, cian, naranja),
  uno por cada punto de aparición.
- Aumentar la resolución del sprite de 8x8 a 12x12 "píxeles" por celda
  (celda de 32px a 36px) para más detalle en general.
- Vehículo del jugador más detallado: parabrisas delante/detrás, cajón de
  carga central, ruedas visibles — sigue coloreado con el `primaryColor`
  del juego (no un verde fijo), para que temas distintos a "camión de
  reciclaje" (como Antivirus) no hereden literalmente el color del camión.
- Puntos amarillos estilo Pac-Man en todas las celdas de camino libre (antes
  solo existían como "marcas de calle" en el layout CITY).
- Edificios con textura de ladrillo (líneas de mortero escalonadas) en vez
  de un bloque de color liso con ventanas simples.
- HUD: ícono de fantasma (👻) para las vidas en vez de corazones, para que
  combine con los enemigos reales del juego.

## Fuera de alcance (decisión explícita)

- **No** se cambia a vista lateral/plataformas — reescribir el motor de
  movimiento (gravedad o pisos fijos, escaleras, fantasmas flotando a
  distintas alturas) es un cambio de arquitectura mucho más grande y
  riesgoso que no se pidió hacer en esta pasada.
- **No** se replican los sprites de la imagen de referencia píxel por
  píxel — son arte generado/diseñado profesionalmente; lo que se hizo es
  una aproximación de estilo (fantasmas reales, más detalle, paleta de
  colores) usando la misma técnica de matrices de píxeles ya existente en
  el componente, no assets externos.

## Criterios de aceptación

- Los 4 enemigos se ven como fantasmas reconocibles (no como nubes), cada
  uno de un color distinto.
- El vehículo del jugador sigue tomando su color de `primaryColor`, no de
  un valor fijo — verificado que un juego con otro tema (ej. Antivirus) no
  muestra literalmente un camión verde.
- El camino tiene puntos amarillos visibles en todas las celdas libres.
- Los edificios tienen una textura de ladrillo reconocible.
- El HUD muestra fantasmas por cada vida restante.
- Build y lint limpios en client; nada cambia en el servidor (esto es
  puramente visual, no toca `MazeCollectorContentValidator` ni el motor de
  juego en `useMazeCollectorGame.ts`).
