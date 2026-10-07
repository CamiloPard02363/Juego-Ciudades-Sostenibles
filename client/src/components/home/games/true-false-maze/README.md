# Laberinto Verdadero o Falso (`TRUE_FALSE_MAZE`)

Un robot recorre una nave espacial estilo Among Us. En cada ronda aparece una afirmación y el
jugador la responde entrando a la sala **VERDADERO** o a la sala **FALSO**, mientras esquiva
medusas galácticas. Las salas cambian de lugar en cada pregunta y, si se configura, cada cierto
tiempo.

El contenido (las afirmaciones) lo escribe quien crea el juego. El mapa y los personajes son del
**escenario** (`skin`). Hoy existe un solo escenario: `NAVE_ESPACIAL`.

## Cómo está armado

| Archivo | Qué hace |
| --- | --- |
| `trueFalseMazeTypes.ts` | Contenido, `config` y límites. Espeja `true-false-maze.content-validator.ts` del servidor. |
| `spaceshipMap.ts` | Mapa de la nave en ASCII (21x12, muros de una celda): salas, rejillas, núcleos, nido, lugares de las salas de respuesta. |
| `trueFalseMazeEngine.ts` | Motor puro: reglas, movimiento, IA de las medusas y eventos. Sin React ni canvas. |
| `TrueFalseMazeRenderer.ts` | Dibuja el estado en un `<canvas>` 2D a pantalla completa: nave, sprites, partículas, apagón y efectos. |
| `spaceshipAssets.ts` | Carga los sprites y genera las variantes de color (medusas de colores, aturdidas, robot herido). |
| `trueFalseMazeSfx.ts` | Sonidos sintetizados con Web Audio, sin archivos. |
| `useTrueFalseMazeSession.ts` | Loop de la partida: conecta motor, renderer, sonidos, teclado y HUD de React. |
| `TrueFalseMazeGame.tsx` | Pantalla del juego: HUD flotante, pregunta, mensajes, resultados y controles táctiles. |
| `TrueFalseMazeGuide.tsx` + `trueFalseMazeGuide.css` | Guía visual previa al juego: 5 pasos con escenas animadas. |
| `FitScale.tsx` | Hace que un contenido quepa siempre en su recuadro (lo reduce) en vez de recortarse o usar scroll. |
| `TrueFalseMazeGameForm.tsx` | Formulario de creación. |
| `assets/spaceship/` | Sprites ya limpios (fondo transparente, recortados) de la carpeta "SpritesJuegoLaberinto". |

Las reglas tienen pruebas en `trueFalseMazeEngine.spec.ts`: conectividad del mapa, salas
"justas" desde cualquier celda, respuestas, vidas, pulso EMP, rejillas y velocidad exacta.

## Diseño de pantalla

- **El canvas cubre toda la pantalla.** Los paneles (HUD, pregunta, cruceta) flotan encima, se
  miden, y `renderer.resize(ancho, alto, dpr, insets)` centra la nave en el espacio que queda. El
  fondo espacial llena el resto, así no hay franjas vacías.
- **El HUD nunca cambia de alto**: si lo hiciera, la nave se reescalaría entre pregunta y
  pregunta. Por eso el panel de la afirmación tiene alto fijo y un texto largo se reduce (la
  afirmación completa también se muestra grande al empezar cada ronda).
- **Sin scroll en ninguna pantalla.** La guía, los resultados y los paneles usan `FitScale`. En
  celular horizontal el HUD pasa a una columna lateral. Botón de pantalla completa (o tecla `F`).
- Los personajes miden más de una celda (robot 1,75; medusa 1,55) y las salas 2,3: en
  `TrueFalseMazeRenderer.ts` están `ROBOT_DRAW_HEIGHT`, `JELLY_DRAW_HEIGHT` y `ZONE_DRAW_WIDTH`.

## Probarlo

- **Demo sin base de datos**: con sesión iniciada, entra a `/jugar/laberinto-vf-demo`.
- **Juego de ejemplo en el catálogo**: en `server/` corre `npm run db:seed:true-false-maze-demo`
  ("Misión Galáctica", en Ciencias Naturales).
- **Crear uno propio**: Crear juego → Laberinto Verdadero o Falso.
- En desarrollo (`npm run dev`) el estado del motor queda en `window.__tfMaze` para depurar o
  automatizar pruebas en el navegador; no existe en el build de producción.

## Agregar un escenario nuevo

La mecánica no cambia. Un escenario es otro mapa y otro set de sprites con la misma forma:

1. Agrega el valor a `TrueFalseMazeSkin` (aquí y en el validador del servidor).
2. Pon sus sprites en `assets/<escenario>/`, con las mismas carpetas y nombres que `spaceship/`
   (`robot/robot-down-0.png`, `jellyfish/jelly-left-2.png`, `tiles/floor-013.png`,
   `decor/zone-true.png`...). Los PNG deben tener fondo transparente.
3. Si cambia el mapa, crea su `*Map.ts` con `parseShipMap` y su leyenda ASCII. Verifica con las
   pruebas que no queden celdas aisladas ni callejones sin salida.
4. Elige el escenario según `config.skin` donde hoy se usan `SPACESHIP_MAP` y
   `loadSpaceshipAssets`.
