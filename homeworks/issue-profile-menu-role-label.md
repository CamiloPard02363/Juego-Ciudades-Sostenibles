# Perfil del encabezado - mostrar rol traducido

## Objetivo

Mostrar debajo del nombre del usuario autenticado el rol global traducido al español, conservando el avatar, la flecha y el funcionamiento actual del menú desplegable.

## Cambios solicitados

- Organizar nombre y rol en una columna compacta.
- Mantener el nombre con mayor jerarquía visual.
- Mostrar `TEACHER` como `Profesor`, `STUDENT` como `Estudiante` y `ADMIN` como `Administrador`.
- Ocultar el rol si todavía no está disponible o no tiene una etiqueta conocida.
- Mantener nombres largos truncados sin romper el encabezado.
- No modificar autenticación, permisos, rutas, barra lateral ni dependencias.

## Criterios de aceptación

- El avatar, nombre, rol y flecha conservan la estética actual del encabezado.
- Los tres roles globales se muestran correctamente en español.
- El menú desplegable continúa abriendo, cerrando y funcionando igual.
- El encabezado no crece innecesariamente y los nombres largos no desbordan.
- La rama permanece separada de `main` para revisión previa.
- El cliente compila correctamente.