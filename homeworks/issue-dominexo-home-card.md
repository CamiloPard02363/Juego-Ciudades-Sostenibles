# Cambiar la tarjeta del dominó educativo a Dominexo

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/163

Actualizar únicamente la actividad publicada «Nexus Play: Ecosistemas Sostenibles»:

- Nombre: **Dominexo**.
- Descripción: **Conéctate con un amigo y relacionen conceptos, imágenes o significados para completar juntos la cadena de fichas.**

Conservar identificador `seed-nexus-play-ecosistemas-sostenibles`, enlace `nexus-play-ecosistemas-sostenibles`, configuración, contenido y demás actividades. El borrador de dominó ajeno a esta tarjeta no se modifica.

Guardar copia local previa y verificar la actualización de un único registro. Rama única: `fix/dominexo-home-card`.

## Resultado y verificación

Actualización aplicada en MongoDB: `modifiedCount: 1`, textos exactos verificados y comparación del documento completo para conservar los demás campos funcionales. Se actualizan también fecha y versión para respetar el control de concurrencia. Una lectura independiente confirma `already_updated`, sin escribir nuevamente.

Copia previa BSON Extended JSON: `.scratch/dominexo-before.json` (ignorada por Git). Conexión existente: `server/test/.env`, sin credenciales en el repositorio.

El script de mantenimiento usa vista previa por defecto, exige copia nueva al aplicar, valida identificador/slug/tipo/estado/nombre/versión y verifica el resultado. No se ejecuta automáticamente en despliegues.

En `server/prisma/seed-nexus-play.ts` se actualizan únicamente título y descripción para que una futura carga inicial no revierta el cambio. No se ejecutó ese seed, porque reescribe otros campos del juego. La tarjeta ya muestra los campos de MongoDB, por lo que no se modifica la interfaz.

Verificados: sintaxis Node, vista previa, actualización única, lectura posterior, conservación de campos y diff sin errores de espacios.
