# Vista del profesor: Mis actividades

## Objetivo

Reemplazar "Mis juegos privados" por "Mis actividades" únicamente para el rol `TEACHER`, conservando la ruta `/mis-juegos`, la navegación existente, las tarjetas y el flujo de creación.

## Auditoría previa

- La opción del sidebar navega a `/mis-juegos`.
- La página es `MyGamesPage`, que renderiza `GamesSection` con `mode="my-games"`.
- El frontend consulta `GET /games` con `onlyMine=true` y `status=DRAFT`.
- El backend filtra por `creatorUserId` del usuario autenticado y por estado `DRAFT`.
- Por ello, hoy la sección muestra solo actividades propias en borrador, no todas las propias publicadas o con otros estados.

## Cambios de vista incluidos

- El menú del profesor muestra `Mis actividades`; otros roles conservan `Mis juegos privados`.
- La vista del profesor muestra el título `Mis actividades`.
- La descripción es `Crea, organiza y administra tus actividades.`.
- El estado vacío usa `Aún no has creado actividades` y una descripción orientada al profesor.
- El botón `Crear actividad` reutiliza `/juegos/crear`.
- La ruta, tarjetas, acciones y estilos existentes se conservan.

## Pendiente fuera de esta rama

Para que la sección incluya actividades propias publicadas, compartidas o con cualquier estado permitido, habría que modificar el contrato del endpoint `GET /games` y su caso de uso para no forzar `status=DRAFT` cuando se consulta `onlyMine=true`. No se modifica backend sin confirmación.

## Criterios de aceptación

- `TEACHER` ve `Mis actividades` en la barra expandida y contraída.
- `STUDENT` y `ADMIN` conservan el texto anterior en esta iteración.
- `/mis-juegos` mantiene su navegación.
- El botón vacío usa el flujo existente de `/juegos/crear`.
- Se conserva el perfil con nombre y rol traducido y el botón lateral `Crear actividad`.
- No se modifican permisos, autenticación, otras opciones ni backend.