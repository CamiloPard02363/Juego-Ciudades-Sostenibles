import { Injectable, type OnModuleInit } from '@nestjs/common';
import type {
  GameImportJob,
  GameImportJobRepository,
} from '../../../domain/ports/game-import-job.repository.port.js';
import { MongoService } from './mongo.service.js';

const COLLECTION = 'game_import_jobs';

interface GameImportJobDocument {
  _id: string;
  idempotencyKey: string;
  requestedByUserId: string;
  status: string;
  totalItems: number;
  insertedGameIds: string[];
  errors: Array<{ index: number; message: string }>;
  createdAt: Date;
  completedAt: Date | null;
}

function toDomain(doc: GameImportJobDocument): GameImportJob {
  return {
    id: doc._id,
    idempotencyKey: doc.idempotencyKey,
    requestedByUserId: doc.requestedByUserId,
    status: doc.status as GameImportJob['status'],
    totalItems: doc.totalItems,
    insertedGameIds: doc.insertedGameIds,
    errors: doc.errors,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt,
  };
}

function toDocument(job: GameImportJob): GameImportJobDocument {
  return {
    _id: job.id,
    idempotencyKey: job.idempotencyKey,
    requestedByUserId: job.requestedByUserId,
    status: job.status,
    totalItems: job.totalItems,
    insertedGameIds: job.insertedGameIds,
    errors: job.errors,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  };
}

@Injectable()
export class MongoGameImportJobRepository implements GameImportJobRepository, OnModuleInit {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<GameImportJobDocument>(COLLECTION);
  }

  /**
   * Único índice necesario: la idempotencia depende enteramente de poder
   * buscar por esta clave rápido y de que dos jobs no puedan crearse con la
   * misma (aunque en la práctica `save` siempre hace upsert por `_id`, este
   * índice es la garantía real si dos requests concurrentes con la misma
   * `idempotencyKey` llegan a la vez).
   */
  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ idempotencyKey: 1 }, { unique: true });
  }

  async save(job: GameImportJob): Promise<void> {
    await this.collection.updateOne(
      { _id: job.id },
      { $set: toDocument(job) },
      { upsert: true },
    );
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<GameImportJob | null> {
    const doc = await this.collection.findOne({ idempotencyKey });
    return doc ? toDomain(doc) : null;
  }

  async findById(id: string): Promise<GameImportJob | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? toDomain(doc) : null;
  }
}
