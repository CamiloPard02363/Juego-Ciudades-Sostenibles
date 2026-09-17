import { Injectable } from '@nestjs/common';
import type { SubjectRepository } from '../../../domain/ports/subject.repository.port.js';
import type { Subject } from '../../../domain/entities/subject.entity.js';
import { SubjectSlugAlreadyTakenError } from '../../../application/errors/application.errors.js';
import { PrismaService } from './prisma.service.js';
import { SubjectMapper } from './subject.mapper.js';

const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

function isSlugConstraintViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== UNIQUE_CONSTRAINT_ERROR_CODE) return false;

  const rawTarget = candidate.meta?.target;
  const targets = Array.isArray(rawTarget) ? rawTarget.map(String) : [String(rawTarget ?? '')];
  return targets.includes('slug');
}

@Injectable()
export class PrismaSubjectRepository implements SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(subject: Subject): Promise<void> {
    const data = SubjectMapper.toPersistence(subject);

    try {
      await this.prisma.subjectModel.upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    } catch (error) {
      if (isSlugConstraintViolation(error)) {
        throw new SubjectSlugAlreadyTakenError(data.slug);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Subject | null> {
    const record = await this.prisma.subjectModel.findFirst({
      where: { id, deletedAt: null },
    });
    return record ? SubjectMapper.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Subject | null> {
    const record = await this.prisma.subjectModel.findFirst({
      where: { slug, deletedAt: null },
    });
    return record ? SubjectMapper.toDomain(record) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.subjectModel.count({ where: { slug, deletedAt: null } });
    return count > 0;
  }

  async findVisibleTo(requestingUserId: string): Promise<Subject[]> {
    const records = await this.prisma.subjectModel.findMany({
      where: {
        deletedAt: null,
        OR: [{ status: 'PUBLIC' }, { creatorUserId: requestingUserId }],
      },
      orderBy: { name: 'asc' },
    });
    return records.map(SubjectMapper.toDomain);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.subjectModel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
