import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MongoServerError, type ClientSession } from 'mongodb';
import type {
  FindAllGamesFilter,
  GameRepository,
  PaginatedGames,
} from '../../../domain/ports/game.repository.port.js';
import type { Game } from '../../../domain/entities/game.entity.js';
import { GameNotFoundError, GameSlugAlreadyTakenError } from '../../../application/errors/application.errors.js';
import { GameVersionConflictError } from '../../../domain/errors/game.errors.js';
import { MongoService } from './mongo.service.js';
import { GameMapper, type GameDocument } from './game.mapper.js';
import { GAMES_COLLECTION_JSON_SCHEMA } from './games.collection-schema.js';

const DUPLICATE_KEY_ERROR_CODE = 11000;

const COLLECTION = 'games';

/**
 * `search` viaja tal cual del cliente al `$regex` de Mongo — sin escapar,
 * un input como `(a+)+$` puede provocar backtracking catastrófico en el
 * motor de regex y degradar la base de datos para todos (ReDoS).
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class MongoGameRepository implements GameRepository, OnModuleInit {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<GameDocument>(COLLECTION);
  }

  /**
   * El `existsBySlug` en CreateGameUseCase es check-then-act, no atómico:
   * dos creaciones concurrentes con el mismo título pueden pasar ambas esa
   * verificación. Este índice es la garantía real de unicidad; el `save()`
   * de abajo traduce el error de duplicado que produce a un error de
   * aplicación legible en vez de dejarlo escapar como un 500 genérico.
   *
   * Los otros tres índices cubren, cada uno, un filtro real y ya existente
   * de `findAll` (ver más abajo) — sin ellos, cada listado del catálogo, de
   * "mis juegos" o de una organización es un escaneo completo de la
   * colección. No se agregan índices para filtros que no se usan hoy.
   */
  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ slug: 1 }, { unique: true });
    await this.collection.createIndex({ status: 1, categoryId: 1, createdAt: -1 });
    await this.collection.createIndex({ creatorUserId: 1, status: 1 });
    await this.collection.createIndex({ organizationId: 1, status: 1 });

    // Defensa adicional bajo los content-validators de la app, no un
    // sustituto: `warn` (no `error`) para que un desajuste de esquema no
    // pueda tumbar escrituras en producción antes de verificarse contra
    // datos reales. `collMod` porque la colección ya existe.
    await this.mongo.getDb().command({
      collMod: COLLECTION,
      validator: GAMES_COLLECTION_JSON_SCHEMA,
      validationLevel: 'moderate',
      validationAction: 'warn',
    });
  }

  /**
   * `expectedVersion` presente = edición de un juego existente: el filtro
   * exige que la versión en base de datos siga siendo esa (upsert
   * deshabilitado, ya debe existir). Si no matchea ningún documento, se
   * distingue entre "ya no existe" y "alguien más lo modificó primero" con
   * una lectura extra — un único `updateOne` sigue siendo suficiente para la
   * atomicidad real; no hace falta ninguna transacción para guardar UN
   * documento.
   */
  async save(game: Game, expectedVersion?: number): Promise<void> {
    const doc = GameMapper.toPersistence(game);
    const filter: Record<string, unknown> = { _id: doc._id };
    if (expectedVersion !== undefined) filter.version = expectedVersion;

    try {
      const result = await this.collection.updateOne(
        filter,
        { $set: doc },
        { upsert: expectedVersion === undefined },
      );

      if (expectedVersion !== undefined && result.matchedCount === 0) {
        const stillExists = await this.collection.countDocuments({ _id: doc._id }, { limit: 1 });
        if (stillExists) throw new GameVersionConflictError(doc._id);
        throw new GameNotFoundError(doc._id);
      }
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new GameSlugAlreadyTakenError(doc.slug);
      }
      throw error;
    }
  }

  /**
   * `session` (si viene) es el `ClientSession` que abrió `MongoSessionFactory`
   * dentro de `session.withTransaction(...)` — todas las inserciones de un
   * mismo lote comparten esa sesión, así que confirman o revierten juntas.
   * El cast es el único punto del código que sabe que el "handle opaco" del
   * puerto es en realidad un `ClientSession` de Mongo.
   */
  async bulkInsert(games: Game[], session?: unknown): Promise<void> {
    if (games.length === 0) return;
    const docs = games.map(GameMapper.toPersistence);

    try {
      await this.collection.insertMany(docs, { session: session as ClientSession | undefined });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new GameSlugAlreadyTakenError('uno o más juegos del lote');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Game | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? GameMapper.toDomain(doc) : null;
  }

  async findByIds(ids: string[]): Promise<Game[]> {
    if (ids.length === 0) return [];
    const docs = await this.collection.find({ _id: { $in: ids } }).toArray();
    return docs.map(GameMapper.toDomain);
  }

  async findBySlug(slug: string): Promise<Game | null> {
    const doc = await this.collection.findOne({ slug });
    return doc ? GameMapper.toDomain(doc) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ slug }, { limit: 1 });
    return count > 0;
  }

  async findAll(filter: FindAllGamesFilter): Promise<PaginatedGames> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;
    if (filter.creatorUserId) query.creatorUserId = filter.creatorUserId;
    if (filter.excludeCreatorUserId) query.creatorUserId = { $ne: filter.excludeCreatorUserId };
    if (filter.categoryId) query.categoryId = filter.categoryId;
    if (filter.organizationId) query.organizationId = filter.organizationId;
    if (filter.search) {
      const safePattern = escapeRegex(filter.search);
      query.$or = [
        { title: { $regex: safePattern, $options: 'i' } },
        { description: { $regex: safePattern, $options: 'i' } },
      ];
    }

    const skip = (filter.page - 1) * filter.pageSize;

    const [docs, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.pageSize)
        .toArray(),
      this.collection.countDocuments(query),
    ]);

    return {
      items: docs.map(GameMapper.toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id });
  }

  async countPublishedByCategory(): Promise<Map<string, number>> {
    const results = await this.collection
      .aggregate<{ _id: string; count: number }>([
        { $match: { status: 'PUBLISHED' } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ])
      .toArray();

    return new Map(results.map((row) => [row._id, row.count]));
  }

  async publishAllDraftsByCategory(categoryId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { categoryId, status: 'DRAFT' },
      { $set: { status: 'PUBLISHED', updatedAt: new Date() }, $inc: { version: 1 } },
    );
    return result.modifiedCount;
  }
}
