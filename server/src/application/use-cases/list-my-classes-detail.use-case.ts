import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CLASS_REPOSITORY, type ClassRepository } from '../../domain/ports/class.repository.port.js';
import { USER_REPOSITORY, type UserRepository } from '../../domain/ports/user.repository.port.js';
import { toClassDetailDto, type ClassDetailDto } from '../dtos/class-detail-response.dto.js';

/**
 * Vista consolidada de las clases propias del profesor autenticado, con
 * código de invitación y estudiantes matriculados por clase (issue #106,
 * CA1.2). Solo expone matrículas (`ClassEnrollment`) de sus propias clases —
 * nunca el padrón completo de la organización, que sigue reservado a
 * `OrganizationRole.ADMIN` vía `GET /organizations/:id/members` (CA1.3).
 */
@Injectable()
export class ListMyClassesDetailUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classRepository: ClassRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(teacherUserId: string): Promise<ClassDetailDto[]> {
    const teacher = await this.userRepository.findById(teacherUserId);
    if (!teacher || teacher.role.getName() !== 'TEACHER') {
      throw new ForbiddenException('Solo un profesor puede consultar el detalle de sus clases.');
    }

    const classes = await this.classRepository.findAllByTeacherUserId(teacherUserId);
    if (classes.length === 0) return [];

    const enrollments = await this.classRepository.findEnrollmentsByClassIds(
      classes.map((classEntity) => classEntity.id),
    );

    const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.userId))];
    const students = await this.userRepository.findByIds(studentIds);
    const usersById = new Map(students.map((user) => [user.id, user]));

    const enrollmentsByClassId = new Map<string, typeof enrollments>();
    for (const enrollment of enrollments) {
      const bucket = enrollmentsByClassId.get(enrollment.classId) ?? [];
      bucket.push(enrollment);
      enrollmentsByClassId.set(enrollment.classId, bucket);
    }

    return classes.map((classEntity) =>
      toClassDetailDto(classEntity, enrollmentsByClassId.get(classEntity.id) ?? [], usersById),
    );
  }
}
