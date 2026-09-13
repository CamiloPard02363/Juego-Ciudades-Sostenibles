# Recolector de Laberinto - juegos de ejemplo con dos temáticas

## Objetivo

Sembrar en el catálogo dos juegos publicados del tipo `MAZE_COLLECTOR` (Fase C,
ya en `main`) para que la mecánica sea visible y jugable desde el apartado de
Juegos sin que un usuario tenga que crearla manualmente primero, demostrando
que el mismo motor sirve para temáticas completamente distintas con solo
cambiar contenido (nombres, íconos, colores, datos educativos).

## Cambios solicitados

- Sembrar `Camión Reciclador`: el jugador es un camión de reciclaje que
  recolecta materiales (vidrio, papel, plástico, orgánico, metal,
  electrónicos) esquivando nubes de contaminación. Categoría "Medio Ambiente".
- Sembrar `Antivirus: Caza de Troyanos`: el jugador es un antivirus que
  recolecta paquetes de datos y elementos de seguridad (firewall,
  actualización, respaldo, conexión segura, contraseña) esquivando troyanos.
  Categoría "Tecnología".
- Reutilizar el patrón ya existente de `prisma/seed-nexus-play.ts` (script
  idempotente por slug, `creatorUserId: 'system'`, estado `PUBLISHED`) en vez
  de inventar un mecanismo nuevo de siembra de contenido.
- Agregar el dato educativo (`fact`) en cada objeto coleccionable de ambos
  juegos, ya que el validador de contenido lo soporta pero no había ningún
  ejemplo real que lo usara.
- Publicar el script como `npm run db:seed:maze-collector-demos` en
  `server/package.json`, igual que los seeds existentes.

## Criterios de aceptación

- Correr el script dos veces seguidas no duplica juegos ni materias
  (upsert por slug / por nombre de categoría).
- Ambos juegos quedan `PUBLISHED` y aparecen en el listado de Comunidad.
- Cada juego pasa las reglas de `MazeCollectorContentValidator` (4-16
  objetos, colores hex válidos, `itemId` único, etc.) si se recreara a mano
  desde la API — el seed no las bypasea con datos inválidos.
- El botón de jugar en ambos abre el juego local (sin sala en vivo), como
  cualquier `MAZE_COLLECTOR`.
- **Pendiente manual**: correr el script contra la base de datos real
  (producción) — este cambio solo agrega el script y lo verifica localmente;
  sembrar el entorno real no es automático en el deploy actual.
