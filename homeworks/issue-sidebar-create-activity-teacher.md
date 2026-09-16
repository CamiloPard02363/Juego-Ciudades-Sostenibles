# Barra lateral - acceso "Crear actividad" para profesores

## Objetivo

Agregar un acceso permanente al flujo existente de creación de juegos para usuarios con rol `TEACHER`, sin alterar autenticación, rutas ni permisos.

## Cambios solicitados

- Mostrar "Crear actividad" debajo del logo y antes de las opciones de navegación.
- Mostrarlo únicamente para usuarios con rol `TEACHER`.
- Reutilizar la ruta existente `/juegos/crear` del botón "Crear un juego nuevo".
- Usar el ícono de suma, el degradado de NexusPlay y estados hover, focus y active.
- Mostrar texto e ícono en la barra expandida y solo el ícono con `title` accesible en la contraída.
- Conservar el cambio existente del rol traducido en el perfil.

## Criterios de aceptación

- `TEACHER` ve el botón; `STUDENT` y `ADMIN` no lo ven.
- El botón abre el flujo actual de creación sin duplicar lógica.
- El botón funciona con teclado y tiene nombre accesible.
- El layout no se desborda en ningún estado de la barra.
- El cliente pasa lint y build.
- La rama queda aislada de `main` para revisión previa.