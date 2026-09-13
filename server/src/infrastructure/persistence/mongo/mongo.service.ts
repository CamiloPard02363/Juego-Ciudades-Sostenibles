import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, type Collection, type Db, type Document } from 'mongodb';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;

  constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI no está configurada.');
    }
    this.client = new MongoClient(uri);
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  collection<T extends Document>(name: string): Collection<T> {
    return this.client.db().collection<T>(name);
  }

  /** Para operaciones a nivel de base de datos que no son un `collection<T>()` (ej. `collMod`). */
  getDb(): Db {
    return this.client.db();
  }
}
