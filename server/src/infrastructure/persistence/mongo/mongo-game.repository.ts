import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import type {
  FindAllGamesFilter,
  GameRepository,
  PaginatedGames,
} from '../../../domain/ports/game.repository.port.js';
import type { Game } from '../../../domain/entities/game.entity.js';
import { GameSlugAlreadyTakenError } from '../../../application/errors/application.errors.js';
import { MongoService } from './mongo.service.js';
import { GameMapper, type GameDocument } from './game.mapper.js';

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
   */
  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ slug: 1 }, { unique: true });
  }

  async save(game: Game): Promise<void> {
    const doc = GameMapper.toPersistence(game);

    try {
      await this.collection.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new GameSlugAlreadyTakenError(doc.slug);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Game | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? GameMapper.toDomain(doc) : null;
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
    if (filter.categoryId) query.categoryId = filter.categoryId;
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
}
