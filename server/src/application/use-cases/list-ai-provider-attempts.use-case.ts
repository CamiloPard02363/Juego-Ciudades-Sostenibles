import { Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER_ATTEMPT_REPOSITORY,
  type AiProviderAttemptRepository,
} from '../../domain/ports/ai-provider-attempt.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { toAiProviderAttemptDto, type AiProviderAttemptDto } from '../dtos/ai-provider-attempt-response.dto.js';
import type { UseCase } from '../ports/use-case.port.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';

export interface ListAiProviderAttemptsInput {
  requestingUserId: string;
  page?: number;
  pageSize?: number;
}

export interface ListAiProviderAttemptsOutput {
  items: AiProviderAttemptDto[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Panel de administración de IA (issue #204): historial de qué proveedor
 * respondió cada llamada (o falló), para que un ADMIN pueda notar sin acceso
 * a logs del servidor si Gemini está cayendo y Groq lo está cubriendo. El
 * `@Roles('ADMIN')` del controller ya filtra por el rol del JWT; se revalida
 * acá contra BD por el mismo motivo que el resto de mutaciones/lecturas
 * admin-only del repo (ver `ArchiveGameTypeUseCase`).
 */
@Injectable()
export class ListAiProviderAttemptsUseCase
  implements UseCase<ListAiProviderAttemptsInput, ListAiProviderAttemptsOutput>
{
  constructor(
    @Inject(AI_PROVIDER_ATTEMPT_REPOSITORY)
    private readonly repository: AiProviderAttemptRepository,
    private readonly requesterAdminResolver: RequesterAdminResolver,
  ) {}

  async execute(input: ListAiProviderAttemptsInput): Promise<ListAiProviderAttemptsOutput> {
    const isAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isAdmin) {
      throw new ForbiddenActionError('ver el historial de proveedores de IA');
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;

    const { items, total } = await this.repository.findRecent({ page, pageSize });

    return { items: items.map(toAiProviderAttemptDto), total, page, pageSize };
  }
}
