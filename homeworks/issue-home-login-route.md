# Fix: Home interpreta login como identificador de juego

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/85

## Problema

Al iniciar sesión como profesor o estudiante desde `/login`, aparece encima
de Juegos: `No se encontró un juego con identificador "login".`

## Causa

La autenticación cambia el árbol de rutas sin cambiar la URL. La ruta
autenticada `/:slug` recibe `/login` y solicita un juego con ese identificador.
El registro con inicio de sesión automático tiene el mismo problema.

## Corrección

Añadir rutas autenticadas explícitas para `/login` y `/register` que redirigen
a `/` con `replace`. Se conserva el manejo de los identificadores de juegos,
las rutas protegidas y el inicio de sesión sin autenticar.

## Verificación

- Prueba ejecutada sobre el árbol real de rutas de App con React Router:
  reproduce el fallo sin las dos rutas nuevas y confirma la redirección a `/`
  con `replace` para profesor y estudiante, incluyendo `/login/`.
- Comparación de rutas antes/después: Home, identificadores de juegos, materias,
  mis clases, comunidad, mis juegos, creación de juegos y sala de dominó
  mantienen las mismas coincidencias y parámetros.
- Acceso anónimo a login y registro conservado.
- Lint del cliente aprobado con advertencias en archivos no modificados.
- Build de producción aprobado (TypeScript + Vite), con aviso de tamaño de bundle.

La prueba de rutas utiliza sesiones simuladas; no requiere cuentas ni credenciales.

Rama única: `fix/home-login-route`.
