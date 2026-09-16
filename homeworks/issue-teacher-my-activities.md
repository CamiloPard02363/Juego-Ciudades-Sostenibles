# Mis actividades para profesores

## Objetivo

Reemplazar "Mis juegos privados" por "Mis actividades" únicamente en la vista del profesor y hacer que la sección represente todas las actividades creadas por el profesor autenticado.

## Hallazgo previo

La vista actual usa `GamesSection` con `onlyMine: true` y `status: 'DRAFT'`. El endpoint `GET /games` filtra por el creador autenticado y además limita el resultado a actividades en estado `DRAFT`.

Por tanto, actualmente no aparecen actividades propias publicadas, marcadas u otros estados válidos.

## Cambio mínimo pendiente de confirmación

Ampliar el contrato de listado para permitir una consulta de actividades propias en cualquier estado, manteniendo el filtro `creatorUserId` del usuario autenticado. Después, actualizar la vista para mostrar:

- Título: `Mis actividades`
- Descripción: `Crea, organiza y administra tus actividades.`
- Estado vacío: `Aún no has creado actividades`
- Acción: `Crear actividad`, reutilizando `/juegos/crear`
- Barra lateral del profesor: `Mis actividades`

No se debe modificar el backend hasta confirmar este alcance.

## Criterios de aceptación

- La ruta `/mis-juegos` conserva compatibilidad.
- Solo se muestran actividades cuyo creador sea el usuario autenticado.
- Se incluyen actividades propias independientemente de su estado de publicación permitido.
- El menú del profesor muestra `Mis actividades` y la barra contraída usa ese mismo nombre accesible.
- Se conserva el botón existente `Crear actividad` y el perfil con nombre y rol traducido.
- No se cambian Materias, Comunidad, Temas, permisos ni autenticación.
