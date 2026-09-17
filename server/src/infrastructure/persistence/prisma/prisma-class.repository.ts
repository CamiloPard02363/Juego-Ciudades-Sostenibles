import { Injectable } from '@nestjs/common';
import type { ClassRepository } from '../../../domain/ports/class.repository.port.js';
import type { ClassEntity } from '../../../domain/entities/class.entity.js';
import { PrismaService } from './prisma.service.js';
import { ClassMapper } from './class.mapper.js';

@Injectable()
export class PrismaClassRepository implements ClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(classEntity: ClassEntity): Promise<void> {
    const data = ClassMapper.toPersistence(classEntity);

    await this.prisma.classModel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]> {
    const records = await this.prisma.classModel.findMany({
      where: { teacherUserId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ClassMapper.toDomain);
  }
}
