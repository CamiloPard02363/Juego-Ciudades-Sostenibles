import { Injectable } from '@nestjs/common';
import type { ClassRepository } from '../../../domain/ports/class.repository.port.js';
import type { ClassEntity } from '../../../domain/entities/class.entity.js';
import type { ClassGame } from '../../../domain/entities/class-game.entity.js';
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

  async findById(id: string): Promise<ClassEntity | null> {
    const record = await this.prisma.classModel.findUnique({ where: { id } });
    return record ? ClassMapper.toDomain(record) : null;
  }

  async findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]> {
    const records = await this.prisma.classModel.findMany({
      where: { teacherUserId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ClassMapper.toDomain);
  }

  async addGame(classGame: ClassGame): Promise<void> {
    const props = classGame.toPersistence();

    await this.prisma.classGameModel.upsert({
      where: { classId_gameId: { classId: props.classId, gameId: props.gameId } },
      create: props,
      update: {},
    });
  }

  async removeGame(classId: string, gameId: string): Promise<void> {
    await this.prisma.classGameModel.deleteMany({ where: { classId, gameId } });
  }

  async findGameIdsByClassId(classId: string): Promise<string[]> {
    const records = await this.prisma.classGameModel.findMany({
      where: { classId },
      orderBy: { addedAt: 'desc' },
      select: { gameId: true },
    });
    return records.map((r) => r.gameId);
  }
}
