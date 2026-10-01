import { Injectable } from '@nestjs/common';
import { StudentMetricsService } from '../services/student-metrics.service.js';
import type { StudentMetricsDto } from '../dtos/metrics-response.dto.js';

/**
 * `GET /me/metrics` (issue #226): el estudiante autenticado ve sus propias
 * métricas. Sin chequeo de autorización adicional — `requestingUserId` ya es
 * el sujeto de la consulta, no hay otro usuario cuyo acceso validar.
 */
@Injectable()
export class GetMyMetricsUseCase {
  constructor(private readonly studentMetricsService: StudentMetricsService) {}

  async execute(requestingUserId: string): Promise<StudentMetricsDto> {
    return this.studentMetricsService.buildMetrics(requestingUserId);
  }
}
