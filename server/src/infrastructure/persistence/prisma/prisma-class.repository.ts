import { Injectable } from '@nestjs/common';
import type { ClassRepository } from '../../../domain/ports/class.repository.port.js';
import type { ClassEntity } from '../../../domain/entities/class.entity.js';
import type { ClassGame } from '../../../domain/entities/class-game.entity.js';
import type { ClassEnrollment } from '../../../domain/entities/class-enrollment.entity.js';
import { PrismaService } from './prisma.service.js';
import { ClassEnrollmentMapper, ClassMapper } from './class.mapper.js';

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

  async findByInviteCode(inviteCode: string): Promise<ClassEntity | null> {
    const record = await this.prisma.classModel.findUnique({ where: { inviteCode } });
    return record ? ClassMapper.toDomain(record) : null;
  }

  async findAllByTeacherUserId(teacherUserId: string): Promise<ClassEntity[]> {
    const records = await this.prisma.classModel.findMany({
      where: { teacherUserId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ClassMapper.toDomain);
  }

  async findAll(): Promise<ClassEntity[]> {
    const records = await this.prisma.classModel.findMany({
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

  async findClassIdsContainingGame(gameId: string): Promise<string[]> {
    const records = await this.prisma.classGameModel.findMany({
      where: { gameId },
      select: { classId: true },
    });
    return records.map((r) => r.classId);
  }

  /**
   * Upsert sobre `(classId, userId)`: unirse dos veces con el mismo
   * inviteCode no duplica la fila ni falla (test plan del issue #101).
   */
  async enroll(enrollment: ClassEnrollment): Promise<void> {
    const data = ClassEnrollmentMapper.toPersistence(enrollment);

    await this.prisma.classEnrollmentModel.upsert({
      where: { classId_userId: { classId: data.classId, userId: data.userId } },
      create: data,
      update: {},
    });
  }

  async unenroll(classId: string, userId: string): Promise<void> {
    await this.prisma.classEnrollmentModel.deleteMany({ where: { classId, userId } });
  }

  async findEnrollment(classId: string, userId: string): Promise<ClassEnrollment | null> {
    const record = await this.prisma.classEnrollmentModel.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    return record ? ClassEnrollmentMapper.toDomain(record) : null;
  }

  async findClassIdsEnrolledByUserId(userId: string): Promise<string[]> {
    const records = await this.prisma.classEnrollmentModel.findMany({
      where: { userId },
      select: { classId: true },
    });
    return records.map((r) => r.classId);
  }

  async findAllClassesEnrolledByUserId(userId: string): Promise<ClassEntity[]> {
    const records = await this.prisma.classModel.findMany({
      where: { enrollments: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ClassMapper.toDomain);
  }

  async findEnrollmentsByClassIds(classIds: string[]): Promise<ClassEnrollment[]> {
    if (classIds.length === 0) return [];
    const records = await this.prisma.classEnrollmentModel.findMany({
      where: { classId: { in: classIds } },
      orderBy: { enrolledAt: 'asc' },
    });
    return records.map(ClassEnrollmentMapper.toDomain);
  }
}
