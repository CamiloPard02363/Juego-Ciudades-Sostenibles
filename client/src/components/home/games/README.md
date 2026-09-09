# Cómo agregar un tipo de juego nuevo

Este documento es de lectura **obligatoria** antes de implementar una mecánica de juego nueva
(bingo, rompecabezas, crucigrama, etc.).

## El principio

La plataforma separa **mecánica** de **contenido**:

- La **mecánica** es código: las reglas, el tablero, la interacción. Se implementa **una sola vez
  por tipo de juego** y la escribe el equipo.
- El **contenido** es data: los temas, conceptos, tarjetas, preguntas. Lo crea **cualquier usuario
  registrado** desde la interfaz, sin tocar código, y queda guardado en la base.

Un tipo de juego nuevo se agrega implementando su mecánica como un **reproductor parametrizable**
que recibe el contenido por props. Si el juego solo funciona con un contenido fijo escrito en el
código, está mal hecho: nadie más va a poder crear una versión propia y publicarla.

> Antecedente: el issue #17 implementó el dominó "Nexus Play" como componente hardcodeado, fuera de
> este patrón. El #18 tuvo que migrarlo. No repitas ese camino — usa este checklist desde el
> arranque.

## Fuera de alcance de este patrón

No estamos construyendo un motor de reglas configurable por datos. La mecánica sigue siendo código
fijo por tipo de juego; lo único configurable es el contenido y unos pocos parámetros de `config`.

## Checklist obligatorio

Tomando `DOMINO` como referencia completa (implementado en #18), los pasos son:

### Backend

1. **Registrar el tipo** en `server/src/domain/value-objects/game-type.vo.ts`:
   agrégalo a `GameTypeName`, a `VALID_GAME_TYPES` y añade su factory estático
   (ej. `static domino()`).

2. **Crear el validador de contenido** en
   `server/src/application/content-validators/<tipo>.content-validator.ts`, implementando
   `ContentValidator` (`validateConfig` + `validateContent`). Debe:
   - Aplicar valores por defecto para todo lo que sea opcional en `config`.
   - Validar mínimos y máximos del contenido (ej. el dominó exige entre 6 y 10 conceptos).
   - Lanzar `InvalidGameContentError` con un mensaje en español entendible por quien crea el juego
     — ese texto llega tal cual al formulario.
   - Devolver el contenido **normalizado** (con `trim`, ids generados si faltan), no el crudo.

3. **Registrar el validador** en dos lugares:
   - `content-validator.registry.ts`: inyéctalo en el constructor y agrégalo al mapa `validators`.
   - `infrastructure/game.module.ts`: agrégalo a `providers`.

4. **Permitir el tipo en el DTO HTTP**: agrégalo al `@IsIn([...])` de `gameType` en
   `infrastructure/http/dtos/create-game.dto.ts`.

No hace falta ninguna migración de base de datos: `config` y `content` son documentos libres en
Mongo, y su forma la garantiza el validador.

### Frontend

5. **Tipos compartidos** en `<tipo>Types.ts` (ej. `dominoTypes.ts`): el shape del contenido, el
   `config` con sus valores por defecto, y cualquier catálogo cerrado que necesiten tanto el
   formulario como el reproductor (ej. `DOMINO_ICONS`). El contenido guardado debe ser data pura
   (strings, números) — nunca componentes ni funciones; el cliente los resuelve al pintar.

6. **Reproductor parametrizable** `<Tipo>Game.tsx`: recibe el contenido y el `config` **por props**.
   No debe importar ni definir contenido concreto. Si necesitas un dato del juego (título, colores),
   pásalo por props desde `GamesSection`.

7. **Formulario de creación** `<Tipo>GameForm.tsx`, calcado del molde de `GuessWhoGameForm.tsx` o
   `DominoGameForm.tsx`:
   - Campos comunes: título, descripción, portada opcional, materia (con creación inline).
   - Campos propios del tipo (el contenido) más los parámetros de `config`.
   - Validación en cliente que **espeje la del validador del backend**, para dar el error antes del
     viaje de red. El backend sigue siendo la autoridad.
   - Llama a `createGame(...)` con `gameType: '<TIPO>'`; el juego nace en `DRAFT`.
   - Al terminar muestra `SaveVisibilityModal` para que el creador elija privado o publicado.

8. **Tipo en el servicio**: agrega la variante correspondiente a la unión `CreateGameInput` en
   `client/src/services/game.service.ts`.

9. **Opción en `GameTypePicker.tsx`**: agrega el valor a `GameTypeChoice` y una entrada en
   `TYPE_OPTIONS` con título, descripción e ícono.

10. **Conectar en `GamesSection.tsx`**:
    - Agrega el paso `'<tipo>-form'` a `CreateFlowStep` y enrútalo desde `handleSelectType`.
    - Renderiza el formulario en ese paso.
    - En `handlePlayClick`, enruta por `selectedGame.gameType` al reproductor del tipo.
    - **No agregues accesos especiales**: nada de botones fijos, estados propios tipo `dominoOpen`,
      ni secciones aparte. El juego se descubre, se abre y se juega por el flujo normal del catálogo.

### Contenido inicial (opcional)

11. Si el equipo quiere publicar un juego de ejemplo de ese tipo, va como **seed**, no como código:
    ver `server/prisma/seed-nexus-play.ts` (`npm run db:seed:nexus-play`). Debe ser idempotente
    (upsert por `slug`) y quedar en `PUBLISHED` con `creatorUserId: 'system'`, para que solo un
    ADMIN pueda despublicarlo.

### Moderación

12. **No hay que hacer nada.** El flujo de moderación es genérico y ya cubre cualquier tipo nuevo:
    los juegos nacen en `DRAFT`, se publican con `PATCH /games/:id/publish` y se despublican con
    `PATCH /games/:id/unpublish`. Ambos endpoints autorizan con `game.canBeManagedBy(userId, isAdmin)`,
    es decir el creador o cualquier ADMIN, sin mirar el `gameType`. Los estados posibles están en
    `game-status.vo.ts` (`DRAFT` / `PUBLISHED` / `FLAGGED` / `REMOVED`).

## Verificación final

- `cd server && npx tsc --noEmit` y `cd client && npx tsc -b` pasan.
- Un usuario que no sea el tuyo puede crear contenido de ese tipo desde la interfaz y publicarlo.
- El juego publicado aparece en el catálogo junto a los demás, sin sección aparte.
- Un ADMIN puede despublicarlo.
