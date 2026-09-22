import type { ClassEnrollmentModel, ClassModel } from '../../../generated/prisma/client.js';
import { ClassEntity } from '../../../domain/entities/class.entity.js';
import { ClassEnrollment } from '../../../domain/entities/class-enrollment.entity.js';

export class ClassEnrollmentMapper {
  static toDomain(record: ClassEnrollmentModel): ClassEnrollment {
    return ClassEnrollment.fromPersistence({
      id: record.id,
      classId: record.classId,
      userId: record.userId,
      enrolledAt: record.enrolledAt,
    });
  }

  static toPersistence(enrollment: ClassEnrollment) {
    const props = enrollment.toPersistence();

    return {
      id: props.id,
      classId: props.classId,
      userId: props.userId,
      enrolledAt: props.enrolledAt,
    };
  }
}

export class ClassMapper {
  static toDomain(record: ClassModel): ClassEntity {
    return ClassEntity.fromPersistence({
      id: record.id,
      name: record.name,
      description: record.description,
      teacherUserId: record.teacherUserId,
      organizationId: record.organizationId,
      inviteCode: record.inviteCode,
      createdAt: record.createdAt,
      isActive: record.isActive,
    });
  }

  static toPersistence(classEntity: ClassEntity) {
    const props = classEntity.toPersistence();

    return {
      id: props.id,
      name: props.name,
      description: props.description,
      teacherUserId: props.teacherUserId,
      organizationId: props.organizationId,
      inviteCode: props.inviteCode,
      createdAt: props.createdAt,
      isActive: props.isActive,
    };
  }
}
