import { Injectable } from '@nestjs/common';
import type {
  FindAllGamesFilter,
  GameRepository,
  PaginatedGames,
} from '../../../domain/ports/game.repository.port.js';
import type { Game } from '../../../domain/entities/game.entity.js';
import { MongoService } from './mongo.service.js';
import { GameMapper, type GameDocument } from './game.mapper.js';

const COLLECTION = 'games';

@Injectable()
export class MongoGameRepository implements GameRepository {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<GameDocument>(COLLECTION);
  }

  async save(game: Game): Promise<void> {
    const doc = GameMapper.toPersistence(game);

    await this.collection.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    );
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
    if (filter.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
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
}
