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
| `TrueFalseMazeRenderer.ts` | Dibuja el estado en un `<canvas>` 2D a pantalla completa: nave, sprites, cámara, partículas, apagón y efectos. |
| `spaceshipAssets.ts` | Carga los sprites y genera las variantes de color (medusas de colores, aturdidas, robot herido). |
| `trueFalseMazeSfx.ts` | Sonidos sintetizados con Web Audio, sin archivos. |
| `useTrueFalseMazeSession.ts` | Loop de la partida: conecta motor, renderer, sonidos, teclado y HUD de React. |
| `TrueFalseMazeGame.tsx` | Pantalla del juego: HUD flotante, botón y menú de pausa, mensajes, resultados y controles táctiles. |
| `TrueFalseMazeGuide.tsx` + `trueFalseMazeGuide.css` | Guía visual previa al juego: 5 pasos con escenas animadas. |
| `FitScale.tsx` | Hace que un contenido quepa siempre en su recuadro (lo reduce) en vez de recortarse o usar scroll. |
| `TrueFalseMazeGameForm.tsx` | Formulario de creación. |
| `assets/spaceship/` | Sprites ya limpios de la carpeta "SpritesJuegoLaberinto" (ver abajo). |

Las reglas tienen pruebas en `trueFalseMazeEngine.spec.ts`: conectividad del mapa, salas
"justas" desde cualquier celda, respuestas, vidas, pulso EMP, rejillas y velocidad exacta. La
cámara, en `trueFalseMazeCamera.spec.ts`.

## Sprites

- `robot/`, `jellyfish/` y `decor/` (cajas, barriles, puertas, cámaras, salas VERDADERO/FALSO,
  terminales): carpetas "Robot", "Medusa" y "Escenario". Fondo transparente, recortados al contenido.
- `tiles/` (muros y pisos): subcarpeta "EscenearioPrueba2". Son tiles de una celda (128x128),
  recortados de la imagen original en alta resolución (2400x1792; los recortes de Drive salen de
  su versión reducida de 578x432). De los pisos se usa solo la cara de arriba, sin el borde en
  relieve, para que encajen en cuadrícula.
- Los frentes de muro (`wall-face-*`) miden 5 períodos de la franja de peligro y empiezan en la
  misma fase, así cualquier par empalma sin cortes. `wall-side-*` es la franja lateral de los
  muros verticales. El renderer arma cada muro según sus vecinos (`drawWalls`): con piso al sur
  muestra su frente; si no, es techo negro con borde azul y, si da a un piso por el costado,
  lleva la franja lateral.

## Diseño de pantalla

- **El canvas cubre toda la pantalla y la nave llena el espacio libre.** Los paneles (HUD,
  pregunta, cruceta) flotan encima y se miden. Si la pantalla tiene otra proporción que la nave,
  en vez de dejar franjas vacías a los lados la nave se agranda hasta cubrir ese espacio
  (`fitShipScale`, con un tope de `MAX_ZOOM`) y la **cámara sigue al robot** con suavidad, sin
  mostrar nunca más allá del borde de la nave (`clampCameraAxis`). Así el robot queda cerca del
  centro de la vista.
- **Ninguna sala se pierde de vista**: si una sala queda fuera, un letrero en el borde
  ("✓ VERDADERO" con una flecha) apunta hacia ella; si se ve, su propio letrero se corre hacia
  adentro para no cortarse. Nunca hay dos letreros de la misma sala.
- **El HUD nunca cambia de alto**: si lo hiciera, la nave se reescalaría entre pregunta y
  pregunta. Por eso el panel de la afirmación tiene alto fijo y un texto largo se reduce (la
  afirmación completa también se muestra grande al empezar cada ronda).
- **Sin scroll en ninguna pantalla.** La guía, los resultados, la pausa y los paneles usan
  `FitScale`. En celular horizontal el HUD pasa a una columna lateral. Botón de pantalla completa
  (o tecla `F`).
- Los personajes miden más de una celda (robot 1,75; medusa 1,55) y las salas 2,3: en
  `TrueFalseMazeRenderer.ts` están `ROBOT_DRAW_HEIGHT`, `JELLY_DRAW_HEIGHT` y `ZONE_DRAW_WIDTH`.

## Pantalla completa

En ventana, la nave se recorta (la cámara la recorre) y el navegador le quita espacio al juego, así
que la pantalla completa es la forma recomendada de jugar. Para que se encuentre sin buscarla:

- La pantalla de inicio tiene el interruptor **"Jugar en pantalla completa (recomendado)"**, activado
  por defecto. La elección se recuerda (`localStorage`, clave `nexusplay-tf-maze-fullscreen`). Al
  activarlo se aplica en el momento; si queda activado, **despegar** (botón, flecha, Espacio o toque)
  entra a pantalla completa. Es el único momento posible: el navegador solo la permite dentro de un
  gesto del jugador, por eso el hook llama a `onBeforeStart` dentro del mismo evento.
- Si la eligió y se sale (Esc, por ejemplo), la partida **se pausa sola** (la pantalla cambia de
  tamaño de golpe) y, al seguir, un aviso ofrece volver con un clic. Si eligió jugar en ventana, no
  se le insiste.
- El botón del HUD y la tecla `F` también la activan y la quitan, y recuerdan esa elección.
- **La guía vive dentro del elemento que se pone en pantalla completa** (`rootRef`), no a su lado: el
  navegador solo muestra lo que está dentro de ese elemento, y una guía de afuera quedaba invisible
  pero capturando el teclado (el juego parecía trabado). Todo lo que se superponga al juego debe
  renderizarse dentro de ese contenedor.
- En pantalla completa el navegador se queda con `Esc`, así que ahí el atajo de pausa que se muestra
  es `P` (en ventana, `Esc`).

## Pulso EMP

Tomar un núcleo lanza un pulso de 7 s: las medusas se aturden y se pueden atrapar (+200, +400…).
**Las salas VERDADERO y FALSO siguen abiertas durante el pulso**: se puede contestar en cualquier
momento, y el pulso no detiene la pregunta ni el reloj (el bonus de tiempo sigue bajando). Está
cubierto por una prueba que recorre todas las combinaciones de núcleo y sala
(`trueFalseMazeEngine.spec.ts`). El aviso del HUD muestra los segundos que quedan y lo recuerda
("Atrápalas o responde: ¡las salas siguen abiertas!"), y la guía lo explica en el paso 4.

## Pausa

Pensada para quien no suele jugar videojuegos:

- El botón **Pausa** está siempre arriba a la izquierda, con texto (no solo un ícono) y la tecla a la
  vista. También pausan `Esc` y `P`, y la partida se pausa sola si la pestaña queda en segundo plano
  o si se sale de pantalla completa.
- Al despegar por primera vez, un aviso debajo del HUD señala el botón unos segundos.
- El menú de pausa muestra la afirmación actual, las baterías y los puntos, y tiene botones
  grandes: continuar, cómo se juega (la guía), sonido, pantalla completa, empezar de nuevo y
  salir. Empezar de nuevo y salir piden confirmación (`Esc` cierra la confirmación).
- Salir ya no está en el HUD: está en el menú de pausa, en la pantalla de listo y en los
  resultados.

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
   (`robot/robot-down-0.png`, `jellyfish/jelly-left-2.png`, `tiles/floor-plain.png`,
   `tiles/wall-face-lamp.png`, `decor/zone-true.png`...). Los personajes y la decoración deben
   tener fondo transparente; los tiles de piso y de muro son opacos y miden una celda.
3. Si cambia el mapa, crea su `*Map.ts` con `parseShipMap` y su leyenda ASCII. Verifica con las
   pruebas que no queden celdas aisladas ni callejones sin salida.
4. Elige el escenario según `config.skin` donde hoy se usan `SPACESHIP_MAP` y
   `loadSpaceshipAssets`.
