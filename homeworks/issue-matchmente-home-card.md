# Cambiar la tarjeta Herbario Urbano a MatchMente

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/158

Actualizar únicamente la actividad de concentración/asociación de parejas visible en Home:

- Nombre: **MatchMente**.
- Descripción: **Encuentra las parejas relacionando conceptos con imágenes, significados u otros contenidos.**

Conservar identificador, slug/enlace, tipo, configuración, contenido y demás juegos. Localizar el registro antes de actualizar, guardar los valores anteriores y verificar después la lectura y los campos no modificados.

Rama única: `fix/matchmente-home-card`.

## Resultado

Se localizó una única actividad publicada MEMORY_MATCH con el nombre anterior. Se actualizó el registro `e4b69cfd-a1dc-46a7-9e20-581209d81520` en MongoDB y se mantuvo el slug `herbario-urbano`.

El script `server/scripts/update-matchmente-card.mjs` ofrece vista previa por defecto. Para aplicar exige una ruta de copia local nueva; verifica identidad, tipo, estado, título y versión previos antes de actualizar. Incrementa la versión y actualiza la fecha conforme al control de concurrencia de la aplicación. No se ejecuta automáticamente en despliegues.

Se guardó una copia BSON Extended JSON local en `.scratch/matchmente-before.json` (ignorada por Git; sin credenciales). Se usa la conexión ya disponible en `server/test/.env`, sin trasladarla al repositorio.

Verificación: sintaxis de Node correcta, vista previa revisada, `modifiedCount: 1`, lectura posterior con ambos textos exactos y comparación del documento completo para confirmar que todos los demás campos funcionales permanecen iguales. Segunda lectura devuelve `already_updated` sin escribir. GameCard muestra directamente `game.title` y `game.description`, por lo que no requiere cambios de frontend.
