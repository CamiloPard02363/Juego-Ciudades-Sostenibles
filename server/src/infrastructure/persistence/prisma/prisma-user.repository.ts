import { Injectable } from '@nestjs/common';
import type {
  FindAllUsersFilter,
  PaginatedResult,
  UserRepository,
} from '../../../domain/ports/user.repository.port.js';
import type { User } from '../../../domain/entities/user.entity.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';
import { PrismaService } from './prisma.service.js';
import { UserMapper } from './user.mapper.js';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const data = UserMapper.toPersistence(user);

    await this.prisma.userModel.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.userModel.findUnique({ where: { id } });
    return record ? UserMapper.toDomain(record) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.userModel.findUnique({
      where: { email: email.getValue() },
    });
    return record ? UserMapper.toDomain(record) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.userModel.count({
      where: { email: email.getValue() },
    });
    return count > 0;
  }

  async findAll(filter: FindAllUsersFilter): Promise<PaginatedResult<User>> {
    const where = {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.userModel.findMany({
        where,
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userModel.count({ where }),
    ]);

    return {
      items: records.map(UserMapper.toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userModel.delete({ where: { id } });
  }
}
