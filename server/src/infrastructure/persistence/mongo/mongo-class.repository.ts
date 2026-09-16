import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClassRepository } from '../../../domain/ports/class.repository.port.js';
import type { ClassEntity } from '../../../domain/entities/class.entity.js';
import { MongoService } from './mongo.service.js';
import { ClassMapper, type ClassDocument } from './class.mapper.js';

const COLLECTION = 'classes';

@Injectable()
export class MongoClassRepository implements ClassRepository, OnModuleInit {
  constructor(private readonly mongo: MongoService) {}

  private get collection() {
    return this.mongo.collection<ClassDocument>(COLLECTION);
  }

  async onModuleInit(): Promise<void> {
    await this.collection.createIndex({ teacherUserId: 1, createdAt: -1 });
  }

  async save(classEntity: ClassEntity): Promise<void> {
    const document = ClassMapper.toPersistence(classEntity);
    await this.collection.updateOne({ _id: document._id }, { $set: document }, { upsert: true });
  }

  async findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]> {
    const documents = await this.collection
      .find({ teacherUserId })
      .sort({ createdAt: -1 })
      .toArray();
    return documents.map(ClassMapper.toDomain);
  }
}
