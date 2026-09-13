/**
 * Defensa en profundidad a nivel de base de datos para la colección `games`:
 * valida la FORMA mínima del documento (qué campos existen y de qué tipo
 * son), nunca las reglas de negocio de `content`/`config` — esas ya las
 * exige `ContentValidatorRegistry` antes de que un documento llegue acá, y
 * varían por `gameType`, así que sería incorrecto (y redundante) intentar
 * imponerlas también aquí.
 *
 * `content`/`config` se declaran solo por tipo (objeto/array), sin
 * `required` de sub-campos, precisamente porque son polimórficos por diseño.
 */
export const GAMES_COLLECTION_JSON_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      '_id',
      'slug',
      'title',
      'description',
      'gameType',
      'theme',
      'categoryId',
      'creatorUserId',
      'status',
      'config',
      'content',
      'createdAt',
      'updatedAt',
      'version',
    ],
    properties: {
      _id: { bsonType: 'string' },
      slug: { bsonType: 'string' },
      title: { bsonType: 'string' },
      description: { bsonType: 'string' },
      gameType: { bsonType: 'string' },
      theme: { bsonType: 'object' },
      categoryId: { bsonType: 'string' },
      creatorUserId: { bsonType: 'string' },
      organizationId: { bsonType: ['string', 'null'] },
      status: { bsonType: 'string' },
      config: { bsonType: 'object' },
      content: { bsonType: 'array' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
      version: { bsonType: 'number' },
    },
  },
} as const;
