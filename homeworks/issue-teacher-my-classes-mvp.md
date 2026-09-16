# MVP: Mis clases para profesores

## Objetivo

Agregar una sección real de clases para `TEACHER`, sin convertir la pantalla temática de `Materias` en otra cosa.

## Inspección

`Materias` continúa en `/materias` y muestra categorías de juegos. Para el profesor se agregó una ruta independiente `/mis-clases`.

## Implementación

- Entidad `ClassEntity` persistida en MongoDB.
- Cada clase guarda `teacherUserId`, nombre, descripción y fecha de creación.
- `GET /classes/mine` lista únicamente las clases del profesor autenticado.
- `POST /classes` crea una clase únicamente para usuarios con rol global `TEACHER`.
- Menú lateral: `TEACHER` ve `Mis clases`; `STUDENT` y `ADMIN` conservan `Materias`.
- Pantalla con título, descripción, estado vacío y formulario real para crear clases.
- No se mezclan organizaciones con clases.
- No se agregan estudiantes, invitaciones, calificaciones ni actividades asignadas todavía.

## Criterios de aceptación

- El profesor puede crear y consultar únicamente sus propias clases.
- Un usuario no profesor no puede consultar ni crear clases mediante el backend.
- La pantalla vacía muestra `Aún no tienes clases` y `Cuando crees o recibas una clase, aparecerá en este espacio.`
- La ruta `/materias` y su funcionalidad de categorías se conservan.
- La barra lateral contraída usa el título accesible `Mis clases`.
- Se conservan el perfil con rol, `Crear actividad` y `Mis actividades`.
- La rama queda separada de `main` para revisión.
