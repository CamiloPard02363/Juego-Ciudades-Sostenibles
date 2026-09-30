import { Injectable } from '@nestjs/common';
import type {
  AiProviderAttemptRepository,
  FindRecentAiProviderAttemptsInput,
  FindRecentAiProviderAttemptsOutput,
} from '../../../domain/ports/ai-provider-attempt.repository.port.js';
import type { AiProviderAttempt } from '../../../domain/entities/ai-provider-attempt.entity.js';
import { PrismaService } from './prisma.service.js';
import { AiProviderAttemptMapper } from './ai-provider-attempt.mapper.js';

@Injectable()
export class PrismaAiProviderAttemptRepository implements AiProviderAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(attempt: AiProviderAttempt): Promise<void> {
    await this.prisma.aiProviderAttemptModel.create({
      data: {
        id: attempt.id,
        provider: attempt.provider,
        operation: attempt.operation,
        succeeded: attempt.succeeded,
        usedFallback: attempt.usedFallback,
        errorMessage: attempt.errorMessage,
        latencyMs: attempt.latencyMs,
        createdAt: attempt.createdAt,
      },
    });
  }

  async findRecent({
    page,
    pageSize,
  }: FindRecentAiProviderAttemptsInput): Promise<FindRecentAiProviderAttemptsOutput> {
    const [records, total] = await Promise.all([
      this.prisma.aiProviderAttemptModel.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiProviderAttemptModel.count(),
    ]);

    return { items: records.map(AiProviderAttemptMapper.toDomain), total };
  }
}
