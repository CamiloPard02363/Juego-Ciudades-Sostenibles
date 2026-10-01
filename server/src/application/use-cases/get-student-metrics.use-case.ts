import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';
import { StudentMetricsService } from '../services/student-metrics.service.js';
import { RequesterAdminResolver } from '../services/requester-admin-resolver.service.js';
import type { StudentMetricsDto } from '../dtos/metrics-response.dto.js';

export interface GetStudentMetricsInput {
  classId: string;
  studentUserId: string;
  requestingUserId: string;
}

/**
 * `GET /classes/:id/students/:studentId/metrics` (issue #226): un profesor,
 * admin de institución o admin global revisa el detalle de un estudiante
 * puntual de una clase concreta. Distinto de `GetMyMetricsUseCase` (el propio
 * estudiante) — acá el `requestingUserId` nunca es el sujeto de la consulta,
 * así que además de "puede gestionar la clase" se exige que el estudiante
 * esté matriculado en ELLA (no en cualquier clase del profesor).
 */
@Injectable()
export class GetStudentMetricsUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    private readonly classAccessResolver: ClassAccessResolver,
    private readonly requesterAdminResolver: RequesterAdminResolver,
    private readonly studentMetricsService: StudentMetricsService,
  ) {}

  async execute(input: GetStudentMetricsInput): Promise<StudentMetricsDto> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ForbiddenException('La clase no existe.');
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenException('No tiene permisos para ver las métricas de este estudiante.');
    }

    const isPlatformAdmin = await this.requesterAdminResolver.resolve(input.requestingUserId);
    if (!isPlatformAdmin) {
      const enrollment = await this.classRepository.findEnrollment(
        input.classId,
        input.studentUserId,
      );
      if (!enrollment) {
        throw new ForbiddenException('El estudiante no está matriculado en esta clase.');
      }
    }

    return this.studentMetricsService.buildMetrics(input.studentUserId);
  }
}
