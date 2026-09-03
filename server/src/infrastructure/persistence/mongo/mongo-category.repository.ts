import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import type { CategoryRepository } from '../../../domain/ports/category.repository.port.js';
import type { Category } from '../../../domain/entities/category.entity.js';
import { CategorySlugAlreadyTakenError } from '../../../application/errors/application.errors.js';
import { MongoService } from './mongo.service.js';
import { CategoryMapper, type CategoryDocument } from './category.mapper.js';

const DUPLICATE_KEY_ERROR_CODE = 11000;

const COLLECTION = 'categories';

@Injectable()
export class MongoCategoryRepository implements CategoryRepository, OnModuleInit {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<CategoryDocument>(COLLECTION);
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ slug: 1 }, { unique: true });
  }

  async save(category: Category): Promise<void> {
    const doc = CategoryMapper.toPersistence(category);

    try {
      await this.collection.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new CategorySlugAlreadyTakenError(doc.slug);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? CategoryMapper.toDomain(doc) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const doc = await this.collection.findOne({ slug });
    return doc ? CategoryMapper.toDomain(doc) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ slug }, { limit: 1 });
    return count > 0;
  }

  async findAll(): Promise<Category[]> {
    const docs = await this.collection.find({}).sort({ name: 1 }).toArray();
    return docs.map(CategoryMapper.toDomain);
  }
}
