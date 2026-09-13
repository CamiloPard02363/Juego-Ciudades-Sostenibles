# Recolector de Laberinto - laberinto tipo ciudad y estilo de píxeles

## Objetivo

El renderizado actual del Recolector de Laberinto (círculos planos sin
textura) se ve pobre visualmente. Para "Camión Reciclador" en particular, se
pidió una ambientación de ciudad completa, grande y colorida, con estilo de
píxeles — manteniendo la mecánica tipo Pac-Man ya existente (recolectar
esquivando enemigos), no reemplazándola.

## Cambios solicitados

- Nuevo layout de laberinto `CITY`: una cuadrícula de calles real (no un
  peine ni una cruz abstracta), grande, con manzanas de edificios entre
  calles — da "múltiples caminos" de verdad porque cualquier calle conecta
  con cualquier otra por al menos dos rutas.
- Estilo de píxeles: todo el canvas (edificios, calles, vehículo, enemigos,
  objetos) se dibuja con sprites de 8x8 "pixeles" escalados sin
  antialiasing, no con círculos/rectángulos lisos.
- Ciudad colorida: paleta de 6 colores distintos para los edificios (no gris
  uniforme), calles con marcado de carril, árboles/parques decorativos
  dispersos por la ciudad (solo decorativos — no bloquean el movimiento).
- El vehículo del jugador y los enemigos pasan de círculos lisos a sprites
  con silueta reconocible (vehículo visto desde arriba / nube con "ojos").
- Actualizar el seed de `Camión Reciclador` para usar el nuevo layout
  `CITY` y ampliar su contenido (agrega Baterías y Aceite Usado, de 6 a 8
  objetos) para aprovechar el mapa más grande.
- Mantener sin cambios el laberinto/tema de `Antivirus: Caza de Troyanos`
  (sigue con `CROSS` y el estilo neutro) — la ambientación de ciudad
  (árboles, parques) es específica de `CITY`, no se le fuerza a otros temas.

## Criterios de aceptación

- `CITY` es un layout válido tanto en el validador del servidor
  (`MazeCollectorContentValidator`) como en el catálogo del cliente
  (`mazeCollectorTypes.ts`), verificado por conectividad (BFS: toda celda
  libre es alcanzable desde cualquier otra).
- Crear un juego con `layout: 'CITY'` y 8 objetos pasa la validación real de
  la API (probado contra el servidor corriendo localmente, no solo contra
  la forma del payload).
- El seed de `Camión Reciclador` sigue siendo idempotente después del
  cambio de layout y contenido.
- El laberinto `CITY` es notablemente más grande que los otros tres
  (25x17 contra 15x11) y tiene manzanas de edificios reconocibles.
- Los otros tres layouts (`CLASSIC`, `CROSS`, `SPIRAL`) también se ven con
  el estilo de píxeles nuevo (mejora general, no solo de `CITY`), pero sin
  árboles ni parques — esa decoración es exclusiva de `CITY`.
- Build y lint limpios en `server` y `client`; los 12 tests del validador
  de contenido (incluyendo el nuevo caso de `CITY`) pasan.
- **Pendiente manual**: correr `npm run db:seed:maze-collector-demos` contra
  la base real para que el cambio de layout/contenido de "Camión Reciclador"
  se refleje en producción (el merge del código no actualiza datos ya
  sembrados por sí solo).
