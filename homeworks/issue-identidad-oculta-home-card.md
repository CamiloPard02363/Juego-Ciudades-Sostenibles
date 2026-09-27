# Cambiar la tarjeta ¿Quién es? a Identidad Oculta

Issue: https://github.com/CamiloPard02363/Juego-Ciudades-Sostenibles/issues/160

Actualizar únicamente la actividad publicada «¿Quién Es? de Banderas»:

- Nombre: **Identidad Oculta**.
- Descripción: **Invita a un amigo a conectarse y descubre quién o qué se esconde mediante preguntas, pistas y características.**

Conservar identificador, enlace, tipo, configuración, contenido y demás actividades. Guardar copia local previa y verificar la actualización de un único registro.

Registro: `71fb158c-0b6d-42e9-b2e8-dbc363db661b`, slug `quien-es-de-banderas`, tipo `GUESS_WHO`. El otro registro del tipo es un borrador de prueba y queda intacto.

Rama única: `fix/identidad-oculta-home-card`.

## Resultado y verificación

Actualización aplicada en MongoDB a un único registro (`modifiedCount: 1`). Ambos textos se verificaron después de escribir. Una comparación del documento completo confirma que se mantienen todos los campos funcionales restantes; solo se actualizan además versión y fecha para respetar la concurrencia de la aplicación.

Se guardó copia BSON Extended JSON en `.scratch/identidad-oculta-before.json`, ignorada por Git. Se utilizó la conexión existente en `server/test/.env` sin incorporar credenciales al repositorio.

El script `server/scripts/update-identidad-oculta-card.mjs` comprueba identificador, slug, tipo, nombre, estado y versión antes de actualizar. Ofrece vista previa por defecto, exige copia nueva al aplicar y detecta el registro ya actualizado sin volver a escribir. No se ejecuta automáticamente durante despliegues.

Verificaciones: sintaxis Node, vista previa, lectura posterior de ambos textos, comparación de campos preservados y lectura independiente. No se requiere cambio de interfaz: la tarjeta ya muestra directamente el título y la descripción de la actividad.
