# Restringir Temas a administradores globales

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/87

## Problema

El menú Temas y la ruta `/temas` estaban disponibles para cualquier usuario
autenticado. Deben estar disponibles exclusivamente para ADMIN global.

## Cambio

- Mostrar el enlace Temas únicamente cuando el rol global es `ADMIN`.
- Proteger `/temas`: cualquier otro rol vuelve a Home con `replace`, sin montar
  la página de Temas. Ser administrador de organización no concede acceso.
- Conservar los modos visuales existentes y su persistencia local en el
  dispositivo, sin propagar selecciones a otros usuarios mediante el servidor.

## Criterios de aceptación

- ADMIN global ve Temas y puede acceder.
- TEACHER y STUDENT no ven Temas ni acceden mediante URL directa.
- Un administrador de organización sin rol global ADMIN tampoco accede.
- Las demás rutas y opciones del menú mantienen su comportamiento.
- Compilación, lint y comprobaciones del PR verificados antes del merge.

Rama única: `fix/themes-global-admin-only`.

## Verificación local realizada

- Comprobación del árbol real de rutas y del Sidebar con roles simulados:
  ADMIN permitido; TEACHER, STUDENT y rol desconocido redirigidos a Home.
- `/temas`, `/temas/` y `/temas?preview=dark` respetan la restricción.
- El permiso de organización no habilita Temas. Las opciones restantes del
  menú, las rutas de juegos y la corrección anterior de `/login` se conservan.
- `npm.cmd run build --workspace=client`: aprobado, con aviso de tamaño de bundle.
- `npm.cmd run lint --workspace=client`: aprobado, con advertencias existentes.
- `git diff --check`: aprobado.
