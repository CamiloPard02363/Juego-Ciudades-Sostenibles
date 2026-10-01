import { Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { ForbiddenActionError } from '../../domain/errors/authorization.errors.js';
import { ClassNotFoundError } from '../errors/application.errors.js';
import { ClassAccessResolver } from '../services/class-access-resolver.service.js';
import { toClassDetailDto, type EnrolledStudentDto } from '../dtos/class-detail-response.dto.js';

export interface GetClassStudentsInput {
  classId: string;
  requestingUserId: string;
}

/**
 * `GET /classes/:id/students` (issue #226, drill-down "Estudiantes de la
 * clase"): a diferencia de `GET /classes/mine/detail` (que solo lista las
 * clases propias del profesor autenticado), este endpoint autoriza vía
 * `ClassAccessResolver` — profesor dueño, admin de la institución dueña de la
 * clase, o admin global — porque la pestaña de estudiantes del dashboard de
 * métricas la usa también un admin de organización, no solo el profesor.
 */
@Injectable()
export class GetClassStudentsUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly classAccessResolver: ClassAccessResolver,
  ) {}

  async execute(input: GetClassStudentsInput): Promise<EnrolledStudentDto[]> {
    const classEntity = await this.classRepository.findById(input.classId);
    if (!classEntity) {
      throw new ClassNotFoundError(input.classId);
    }

    const canManage = await this.classAccessResolver.canManage(
      classEntity,
      input.requestingUserId,
    );
    if (!canManage) {
      throw new ForbiddenActionError('ver los estudiantes de esta clase');
    }

    const enrollments = await this.classRepository.findEnrollmentsByClassIds([classEntity.id]);
    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
    const students = await this.userRepository.findByIds(studentIds);
    const usersById = new Map(students.map((user) => [user.id, user]));

    return toClassDetailDto(classEntity, enrollments, usersById).students;
  }
}
